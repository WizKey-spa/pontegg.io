import path from 'path';
import { Module } from '@nestjs/common';
import { I18nModule } from 'nestjs-i18n';
import { ConfigModule, ConfigService } from '@nestjs/config';
// import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import config from './config';
import loggerOptionsFactory from './logger/logger.options.factory';
import { DatabaseModule } from './lib/nestjs-database.module';
import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ValidatorModule } from './validator/validator.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    DatabaseModule,
    // ScheduleModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: loggerOptionsFactory,
      inject: [ConfigService],
    }),
    StorageModule,
    AuthModule,
    ValidatorModule,

    // SET YOUR MODULES HERE

    I18nModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        fallbackLanguage: config.get('FALLBACK_LANGUAGE'),
        loaderOptions: {
          path: path.join(__dirname, '/i18n/'),
          watch: true,
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
