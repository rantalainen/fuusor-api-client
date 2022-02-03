import got, { Headers, Method, OptionsOfJSONResponseBody } from 'got';
import { FuusorDataSet, IFuusorDataSetOptions } from './data-set';
import { FuusorUser } from './user';
import { FuusorUserGroup } from './user-group';

export interface IFuusorApiClientOptions {
  clientId: string;
  clientSecret: string;

  username: string;
  password: string;

  uriConnect?: string;
  uriBase?: string;
  uriUploadFile?: string;
  uriDataset?: string;

  /** Request timeout, defaults to 120000 (120 secs) */
  timeout?: number;
}

export class FuusorApiClient {
  options: IFuusorApiClientOptions;

  readonly users: FuusorUser;
  readonly userGroups: FuusorUserGroup;

  /** @private */
  accessTokens: any;

  /** @private */
  accessTokensTimeout: any;

  constructor(options: IFuusorApiClientOptions) {
    // Set default connect URI
    options.uriConnect = options.uriConnect || 'https://api.fuusor.fi/connect/token';
    options.uriBase = options.uriBase || 'https://api.fuusor.fi/api/v1';
    options.uriUploadFile = options.uriUploadFile || `${options.uriBase}/uploadfile`;
    options.uriDataset = options.uriDataset || `${options.uriBase}/dataset`;

    // Set default timeout
    options.timeout = options.timeout || 120000;

    if (!options.clientId) {
      throw new Error('Missing options.clientId');
    }

    if (!options.clientSecret) {
      throw new Error('Missing options.clientSecret');
    }

    if (!options.username) {
      throw new Error('Missing options.username');
    }

    if (!options.password) {
      throw new Error('Missing options.password');
    }

    this.options = options;

    this.users = new FuusorUser(this);
    this.userGroups = new FuusorUserGroup(this);

    this.accessTokens = {};
    this.accessTokensTimeout = {};
  }

  /**
   * Create Data Set Instance
   *
   * You can define `primaryDate` with `begin` and `end` to replace Fuusor data in that time frame.
   *
   * @param datasetOptions.groupId Company Id from Fuusor Settings
   * @param datasetOptions.datasetId Dataset Identifier (update dataset with same identifier later on)
   * @param datasetOptions.datasetName Dataset Name
   * @param datasetOptions.datasetType Dataset Type (use simple naming such as "Invoices")
   * @param datasetOptions.begin Dataset begin date (YYYY-MM-DD)
   * @param datasetOptions.end Dataset end date (YYYY-MM-DD)
   * @param datasetOptions.primaryDate Define what dataset field contains primary date
   * @param datasetOptions.periods Array of `begin` and `end` dates to be used as default financial year periods
   */
  createDataSet(datasetOptions: IFuusorDataSetOptions): FuusorDataSet {
    return new FuusorDataSet(this, datasetOptions);
  }

  /**
   * Minimizes object keys and returns new object
   */
  _minimizeObjectKeys(data: any) {
    return Object.keys(data).reduce((returnData: any, key: string) => {
      // accumulator is the new object we are creating
      returnData[key.toLowerCase()] = data[key];

      return returnData;
    }, {});
  }

  async saveDataSet(accessToken: string, data: any): Promise<void> {
    const json = this._minimizeObjectKeys(data);

    await got.post(this.options.uriDataset || '', {
      json,

      timeout: this.options.timeout,

      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return;
  }

  async fetchAccessTokenForDataSetUpload(): Promise<string> {
    const { access_token } = await got
      .post(this.options.uriConnect || '', {
        form: {
          scope: 'fileupload',
          grant_type: 'password',
          client_id: this.options.clientId,
          client_secret: this.options.clientSecret,
          username: this.options.username,
          password: this.options.password,
          filetype: 'JsonTransformer'
        }
      })
      .json();

    return access_token;
  }

  /** @private */
  resetAccessToken(scope: string) {
    this.accessTokens[scope] = undefined;
  }

  /** @private */
  async refreshAccessToken(scope: string): Promise<void> {
    // Check if access token is expired
    if (!this.accessTokens?.[scope]) {
      const response: any = await got
        .post(this.options.uriConnect || '', {
          form: {
            scope,
            grant_type: 'password',
            client_id: this.options.clientId,
            client_secret: this.options.clientSecret,
            username: this.options.username,
            password: this.options.password,
            filetype: 'JsonTransformer'
          }
        })
        .json();

      this.accessTokens[scope] = response.access_token;

      // Reset access token when it expires
      this.accessTokensTimeout[scope] = setTimeout(() => this.resetAccessToken(scope), response.expires_in * 1000);
    }
  }

  /** @private */
  async getDefaultHttpHeaders(scope: string): Promise<Headers> {
    await this.refreshAccessToken(scope);

    return {
      Authorization: `Bearer ${this.accessTokens[scope]}`,
      'Content-Type': 'application/json'
    };
  }

  async request(scope: string, uri: string, method: Method, json?: any, params?: any): Promise<any> {
    const gotOptions: OptionsOfJSONResponseBody = {
      method,
      url: `${this.options.uriBase}/${uri}`,
      timeout: this.options.timeout,
      headers: await this.getDefaultHttpHeaders(scope),
      responseType: 'json',
      throwHttpErrors: false
    };

    // If json body is defined
    if (json) {
      gotOptions.json = json;
    }

    // If params is defined
    if (params) {
      gotOptions.searchParams = params;
    }

    const response = await got({ ...gotOptions });

    if (response.statusCode !== 200) {
      throw new Error(`Fuusor HTTP error ${response.statusCode} (${response.statusMessage}): ${response.body}`);
    }

    return response.body;
  }

  /** @private */
  validateEmail(email: string): boolean {
    return /^\S+@\S+\.\S+$/.test(email);
  }
}
