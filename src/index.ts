import got, { Got, Headers, Method, OptionsOfJSONResponseBody } from 'got';
import { FuusorDataSet, IFuusorDataSetOptions, IFuusorDataSetResponse } from './data-set';
import { FuusorUser } from './user';
import { FuusorUserGroup } from './user-group';
import { HttpsAgent } from 'agentkeepalive';
import * as https from 'https';
import CacheableLookup from 'cacheable-lookup';

// Create global https agent
const httpsAgent = new HttpsAgent();

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

  /** Instance of `https.Agent` or `true` to enable internal Keep Alive Agent, defaults to `true` */
  keepAliveAgent?: boolean | https.Agent;

  /** Instance of `cacheable-lookup` or `true` to enable internal DNS cache, defaults to `true` */
  dnsCache?: boolean | CacheableLookup;
}

export class FuusorApiClient {
  options: IFuusorApiClientOptions;

  /** Got instance to be used when making requests */
  gotInstance: Got;

  readonly users: FuusorUser;
  readonly userGroups: FuusorUserGroup;

  /** @private */
  accessTokens: any;

  /** @private */
  accessTokensTimeout: any;

  constructor(options: IFuusorApiClientOptions) {
    this.options = options || {};

    // Check that needed options are included
    if (!this.options.clientId) throw new Error('Missing options.clientId');
    if (!this.options.clientSecret) throw new Error('Missing options.clientSecret');
    if (!this.options.username) throw new Error('Missing options.username');
    if (!this.options.password) throw new Error('Missing options.password');

    // Set default connect URIs if none was provided
    if (!this.options.uriConnect) this.options.uriConnect = 'https://api.fuusor.fi/connect/token';
    if (!this.options.uriBase) this.options.uriBase = 'https://api.fuusor.fi/api/v1';
    if (!this.options.uriUploadFile) this.options.uriUploadFile = `${this.options.uriBase}/uploadfile`;
    if (!this.options.uriDataset) this.options.uriDataset = `${this.options.uriBase}/dataset`;

    // Set default timeout if none was provided
    if (!this.options.timeout) this.options.timeout = 120000;

    // Use internal keepAliveAgent by default
    if (this.options.keepAliveAgent === true || this.options.keepAliveAgent === undefined) {
      this.options.keepAliveAgent = httpsAgent;
    }

    // Use internal dnsCache by default (falls back to got's dnsCache)
    if (this.options.dnsCache === true || this.options.dnsCache === undefined) {
      this.options.dnsCache = true;
    }

    // Set gotInstance defaults, can also include other options
    this.gotInstance = got.extend({
      // Agent options
      agent: { https: this.options.keepAliveAgent || undefined },

      // DNS caching options
      dnsCache: this.options.dnsCache || undefined
    });

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

    await this.gotInstance.post(this.options.uriDataset || '', {
      json,
      timeout: this.options.timeout,
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    return;
  }

  async fetchAccessTokenForDataSetUpload(): Promise<string> {
    const { access_token } = (await this.gotInstance
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
      .json()) as any;

    return access_token;
  }

  /**
   * Get DataSet from Fuusor.
   *
   * Note that with included hierarchies and connected datasets the response can be quite large. This function can't handle very large responses, so if you need those, consider using direct API calls with your own HTTP client.
   * @param dataSetId - The ID of the dataset to retrieve
   * @param includeHierarchies - Whether to include hierarchies in the response
   * @param includeConnectedDataSets - Whether to include connected datasets in the response
   */
  async getDataSet(
    dataSetId: string,
    includeHierarchies: boolean = false,
    includeConnectedDataSets: boolean = false
  ): Promise<IFuusorDataSetResponse[]> {
    const params = {
      DatasetId: dataSetId,
      IncludeHierarchies: includeHierarchies,
      IncludeConnectedDataSets: includeConnectedDataSets
    };

    return await this.request('datasets', 'DataSet/Get/', 'GET', undefined, params);
  }

  /** @private */
  resetAccessToken(scope: string) {
    this.accessTokens[scope] = undefined;
  }

  /** @private */
  async refreshAccessToken(scope: string): Promise<void> {
    // Check if access token is expired
    if (!this.accessTokens?.[scope]) {
      const response: any = await this.gotInstance
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

    const response = await this.gotInstance({ ...gotOptions });

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
