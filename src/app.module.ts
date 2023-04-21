import path from 'path';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { I18nModule } from 'nestjs-i18n';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { ScheduleModule } from '@nestjs/schedule';
import { LoggerModule } from 'nestjs-pino';

import { AppController } from './app.controller';
import { AppService } from './app.service';

import config from './config';
import mongoOptionsFactory from './lib/mongo-options-factory';
import loggerOptionsFactory from './logger/logger.options.factory';

import { StorageModule } from './storage/storage.module';
import { AuthModule } from './auth/auth.module';
import { ValidatorModule } from './validator/validator.module';
import { WalletModule } from './lib/blockchain/wallet.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [config] }),
    ScheduleModule.forRoot(),
    LoggerModule.forRootAsync({
      useFactory: loggerOptionsFactory,
      inject: [ConfigService],
    }),
    StorageModule,
    AuthModule,
    ValidatorModule,

    I18nModule.forRootAsync({
      useFactory: (config: ConfigService) => ({
        fallbackLanguage: config.get('FALLBACK_LANGUAGE'),
        loaderOptions: {
          path: path.join(__dirname, '/i18n/'),
          watch: true,
        },
      }),
      // parser: I18nJsonParser,
      inject: [ConfigService],
    }),
    MongooseModule.forRootAsync({
      useFactory: mongoOptionsFactory,
      inject: [ConfigService],
    }),
    WalletModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
