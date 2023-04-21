import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import nodemailer from 'nodemailer';
import { CqrsModule } from '@nestjs/cqrs';

import { EmailService } from './emails.service';
import { EmailDigestService } from './emails.digest.service';
import { AuthModule } from '../auth/auth.module';

@Module({
  imports: [AuthModule, CqrsModule, ConfigModule],
  providers: [
    EmailService,
    EmailDigestService,
    {
      provide: 'transporter',
      useFactory: async (config: ConfigService) => {
        const conf =
          config.get('EMAIL_PASS') === undefined
            ? {
                host: config.get('EMAIL_HOST'),
                port: config.get('EMAIL_PORT'),
              }
            : {
                host: config.get('EMAIL_HOST'),
                port: config.get('EMAIL_PORT'),
                secure: config.get('EMAIL_SECURE'),
                requireTLS: config.get('EMAIL_TLS'),
                auth: {
                  user: config.get('EMAIL_USER'),
                  pass: config.get('EMAIL_PASS'),
                },
              };
        return nodemailer.createTransport(conf);
      },
      inject: [ConfigService],
    },
  ],
  exports: [EmailService, EmailDigestService],
})
export class EmailsModule {}
