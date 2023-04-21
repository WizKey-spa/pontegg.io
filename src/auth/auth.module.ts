import { Module, Inject } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { CqrsModule } from '@nestjs/cqrs';
import { HttpModule } from '@nestjs/axios';
import { PassportModule } from '@nestjs/passport';

import { AuthService } from './auth.service';
import { JwtStrategy } from './jwt.strategy';
import { RolesGuard } from './guards/roles.guard';
import ResourceQueryService from '../resource/resource.query.service';
import { ValidatorModule } from '../validator/validator.module';

// https://betterprogramming.pub/jwt-and-passport-jwt-strategy-for-your-nestjs-rest-api-project-cafa9dd59890

@Module({
  imports: [
    HttpModule,
    ConfigModule,
    ValidatorModule,
    // JwtModule.registerAsync({
    //   useFactory: (conf: ConfigService) => ({
    //     secretOrKey: conf.get('OAUTH_REALM_PUBLIC_KEY'),
    //     signOptions: { expiresIn: '60s' },
    //   }),
    //   inject: [ConfigService],
    // }),
    JwtModule,
    PassportModule,
    CqrsModule,
  ],
  providers: [AuthService, JwtStrategy, RolesGuard, ConfigService, ResourceQueryService],
  exports: [AuthService, RolesGuard],
})
export class AuthModule {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}
}
