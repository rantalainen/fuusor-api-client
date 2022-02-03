import { FuusorApiClient } from '.';
import { Method } from 'got';

export interface IUserGroup {
  /** User group id */
  id: string;
  /** User group name */
  name: string;
  /** User group description */
  description?: string;
  /** User emails of group */
  users?: string[];
}

export class FuusorUserGroup {
  fuusorApiClient: FuusorApiClient;

  constructor(fuusorApiClient: FuusorApiClient) {
    if (!fuusorApiClient) {
      throw new Error('Missing fuusorApiClient');
    }

    this.fuusorApiClient = fuusorApiClient;
  }

  /** Makes request to Fuusor User Group API. */
  async request(method: Method, uri: string, json?: any, params?: any): Promise<any> {
    return await this.fuusorApiClient.request('users', `UserGroup/${uri}`, method, json, params);
  }

  /** Gets all user groups. */
  async getAll(): Promise<IUserGroup[]> {
    return await this.request('GET', 'Get');
  }

  /**
   * Adds users to the user group.
   *
   * @param id User group id
   * @param users Array of user emails
   */
  async addUsers(id: string, users: string[]): Promise<void> {
    if (!id) {
      throw new Error('Missing id');
    }
    if (!users) {
      throw new Error('Missing users');
    }
    if (!Array.isArray(users)) {
      throw new Error('Invalid users');
    }
    for (const user of users) {
      if (!this.fuusorApiClient.validateEmail(user)) {
        throw new Error(`Invalid user ${user}`);
      }
    }

    return await this.request('POST', 'AddUsers', { id, users });
  }

  /**
   * Removes users from the user group.
   *
   * @param id User group id
   * @param users Array of user emails
   */
  async removeUsers(id: string, users: string[]): Promise<void> {
    if (!id) {
      throw new Error('Missing id');
    }
    if (!users) {
      throw new Error('Missing users');
    }
    if (!Array.isArray(users)) {
      throw new Error('Invalid users');
    }
    for (const user of users) {
      if (!this.fuusorApiClient.validateEmail(user)) {
        throw new Error(`Invalid user ${user}`);
      }
    }

    return await this.request('DELETE', 'RemoveUsers', { id, users });
  }
}
