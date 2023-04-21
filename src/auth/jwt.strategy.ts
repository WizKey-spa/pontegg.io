import { PassportStrategy } from '@nestjs/passport';
import { ConfigService } from '@nestjs/config';
import { Inject } from '@nestjs/common';

import { Strategy, ExtractJwt } from 'passport-jwt';
import * as jwksRsa from 'jwks-rsa';

import { AuthService } from './auth.service';

export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  constructor(
    @Inject(ConfigService) readonly conf: ConfigService,
    //@Inject(ResourceQueryService) private readonly resourceQueryService: ResourceQueryService, //@Inject(ResourceQueryService) private readonly resourceQueryService: ResourceQueryService,
    @Inject(AuthService) private readonly authService: AuthService,
  ) {
    //TODO  set options here with conditional if in case the auth key is defined in the configuration.
    //     This will mainly be used during tests.
    const authConf = conf.get('OAUTH_REALM_PUBLIC_KEY')
      ? {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: true,
          secretOrKey: conf.get('OAUTH_REALM_PUBLIC_KEY'),
          algorithms: ['RS256'],
        }
      : {
          jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
          ignoreExpiration: false,
          secretOrKeyProvider: jwksRsa.passportJwtSecret({
            cache: true,
            rateLimit: true,
            jwksUri: `${conf.get('OAUTH_SERVER_URL')}/realms/${conf.get('OAUTH_REALM')}/protocol/openid-connect/certs`,
          }),
          issuer: `${conf.get('OAUTH_SERVER_URL')}/realms/${conf.get('OAUTH_REALM')}`,
          algorithms: ['RS256'],
        };
    super(authConf);
  }

  async validate(payload: any) {
    // TODO inject user data
    if (!payload.groups || payload.groups.length === 0) {
      // new InternalServerErrorException('Missing groups');
      return false;
    }
    const user = await this.authService.getUser(payload);
    // we inject user data in the payload
    return { ...payload, user };
  }
}
