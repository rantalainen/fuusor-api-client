import got from "got/dist/source";
import { FuusorDataSet, IFuusorDataSetOptions } from "./data-set";

export interface IFuusorApiClientOptions {
  clientId: string;
  clientSecret: string;

  username: string;
  password: string;
  
  uriConnect?: string;
  uriUploadFile?: string;
}

export class FuusorApiClient {
  options: IFuusorApiClientOptions;

  constructor(options: IFuusorApiClientOptions) {
    // Set default connect URI
    options.uriConnect = options.uriConnect || 'https://api.fuusor.fi/connect/token';
    options.uriUploadFile = options.uriUploadFile || 'https://api.fuusor.fi/api/v1/uploadfile';

    if ( ! options.clientId) {
      throw new Error('Missing options.clientId');
    }

    if ( ! options.clientSecret) {
      throw new Error('Missing options.clientSecret');
    }

    if ( ! options.username) {
      throw new Error('Missing options.username');
    }

    if ( ! options.password) {
      throw new Error('Missing options.password');
    }

    this.options = options;
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

  createDataSet(datasetOptions: IFuusorDataSetOptions) : FuusorDataSet {
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

  async saveDataSet(accessToken: string, data: any) : Promise<void> {
    const body = JSON.stringify(this._minimizeObjectKeys(data));

    await got.post(this.options.uriUploadFile || '', {
      body,

      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/octet-stream'
      }
    });

    return;
  }

  async fetchAccessTokenForDataSetUpload() : Promise<string> {  
    const { access_token } = await got.post(this.options.uriConnect || '', {
      form : {
        scope : 'fileupload',
        grant_type : 'password',
        client_id : this.options.clientId,
        client_secret : this.options.clientSecret,
        username : this.options.username,
        password : this.options.password,
        filetype: 'JsonTransformer'
      }
    }).json();

    return access_token;
  }
}