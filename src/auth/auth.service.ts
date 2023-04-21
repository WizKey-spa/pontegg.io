import { Injectable, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';

import { JwtPayload } from '@Types/auth';
import ResourceQueryService from '../resource/resource.query.service';

// TODO add permission for posting messages in negotiations
export enum OPERATION {
  READ_CREDIT = 'READ_CREDIT',
  WRITE_QA = 'WRITE_QA',
  READ_QA = 'READ_QA',
  WRITE_CREDIT = 'WRITE_CREDIT',
  TRANSFER_FILES = 'TRANSFER_FILES',
  TRANSFER_DATA = 'TRANSFER_DATA',
  WRITE_MESSAGE = 'WRITE_MESSAGE',
}

@Injectable()
export class AuthService {
  private authzBaseUrl: string;
  private clientId: string;
  private baseUrl: string;
  private realm: string;

  constructor(
    @Inject(HttpService) private readonly httpService: HttpService,
    @Inject(ConfigService) private readonly conf: ConfigService,
    @Inject(ResourceQueryService) private readonly resourceQueryService: ResourceQueryService,
    @InjectPinoLogger(AuthService.name) private readonly logger: PinoLogger,
  ) {
    this.clientId = this.conf.get('OAUTH_CLIENT_ID');
    this.baseUrl = this.conf.get(`OAUTH_SERVER_URL`);
    this.realm = this.conf.get(`OAUTH_REALM`);
  }

  public safeHasRole(grant: JwtPayload, clientRole: string) {
    return this.hasAnyRole(grant, [clientRole]);
  }

  public hasAnyRole(token: JwtPayload, clientRoles: string[]) {
    if (!token.resource_access) {
      this.logger.warn({ clientRoles }, 'token has no negotiation access block');
      return false;
    }
    // return clientRoles.some((role) => token.hasRole(role));
  }

  getUserGroups(grant: JwtPayload) {
    const otherGroups = ['default-roles-master', 'offline_access', 'uma_authorization'];
    const defaultGroup = this.conf.get('DEFAULT_GROUP');
    // we diminish default group if we know there is a more specific one
    if (otherGroups.length + 1 < grant.groups.length && grant.groups.includes(defaultGroup)) {
      otherGroups.push(defaultGroup);
    }
    const effectiveGroups = grant.groups.reduce((acc: string[], group: string) => {
      otherGroups.includes(group) ? acc : acc.push(group);
      return acc;
    }, []) as string[];
    return effectiveGroups;
  }

  async getUserInfo(role, authId) {
    // we assume that user representation has authId
    try {
      return await this.resourceQueryService._findOne(role, { authId }, {});
    } catch (e) {
      return undefined;
    }
  }

  async getUser(grant: JwtPayload) {
    const userResourceAccessRoles = this.getUserGroups(grant);
    return Object.fromEntries(
      await Promise.all(userResourceAccessRoles.map(async (role) => [role, await this.getUserInfo(role, grant.sub)])),
    );
  }

  private request(method, resource: string, payload: Record<string, any>) {
    return this.httpService.request({
      method,
      url: `${this.baseUrl}/realms/${this.realm}/${resource}`,
      headers: {
        'content-type': 'application/x-www-form-urlencoded;charset=utf-8',
        accept: 'application/json',
      },
      data: JSON.stringify({
        client_id: this.clientId,
        client_secret: this.conf.get('OAUTH_CLIENT_SECRET'),
        grant_type: 'client_credentials',
        ...payload,
      }),
    });
  }

  // public login(username: string, password: string) {
  //   return this.httpService.post(`${this.baseUrl}/protocol/openid-connect/token`, {
  //     grant_type: 'password',
  //     username,
  //     password,
  //   });
  // }
}
