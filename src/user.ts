import { FuusorApiClient } from '.';
import { Method } from 'got';

export interface IUser {
  /** Email used for login. */
  userName: string;
  /** Authentication type. Valid values: `microsoft`, `google`, `activationlink`. Default is `microsoft`. */
  authenticationType?: IUserAuthenticationType;
  /** Default UI language for user. Valid values: `fi-FI`, `en-US`. Default is `fi-FI`. */
  language?: IUserLanguage;
  /** Optional expiration date for account. Example '2022-02-28' */
  validUntil?: string;
}

export type IUserAuthenticationType = 'microsoft' | 'google' | 'activationlink';
export type IUserLanguage = 'fi-FI' | 'en-US';

export class FuusorUser {
  fuusorApiClient: FuusorApiClient;

  constructor(fuusorApiClient: FuusorApiClient) {
    if (!fuusorApiClient) {
      throw new Error('Missing fuusorApiClient');
    }

    this.fuusorApiClient = fuusorApiClient;
  }

  /** Makes request to Fuusor User API. */
  async request(method: Method, uri: string, json?: any, params?: any): Promise<any> {
    return await this.fuusorApiClient.request('users', `User/${uri}`, method, json, params);
  }

  /** Gets all user accounts. */
  async getAll(): Promise<IUser[]> {
    return await this.request('GET', 'Get');
  }

  /** Creates a new user account. */
  async create(user: IUser): Promise<string> {
    if (!user.userName) {
      throw new Error('Missing user.userName');
    }
    if (!this.fuusorApiClient.validateEmail(user.userName)) {
      throw new Error(`Invalid userName ${user.userName}`);
    }
    user.authenticationType = user.authenticationType || 'microsoft';
    if (!['microsoft', 'google', 'activationlink'].includes(user.authenticationType)) {
      throw new Error('Invalid user.authenticationType');
    }
    user.language = user.language || 'fi-FI';
    if (!['fi-FI', 'en-US'].includes(user.language)) {
      throw new Error('Invalid user.language');
    }
    if (user.authenticationType == 'activationlink') {
      return await this.request('POST', 'Create', user);
    } else {
      await this.request('POST', 'Create', user);
      return '';
    }
  }

  /** Deletes user account. */
  async delete(userName: string): Promise<void> {
    if (!userName) {
      throw new Error('Missing userName');
    }
    if (!this.fuusorApiClient.validateEmail(userName)) {
      throw new Error(`Invalid userName ${userName}`);
    }

    await this.request('DELETE', 'Delete', undefined, { userName });
  }
}
