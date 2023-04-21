import { LoggerModule as PinoLoggerModule } from 'nestjs-pino';
import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import loggerOptionsFactory from './logger.options.factory';
@Module({
  imports: [
    PinoLoggerModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => loggerOptionsFactory(config),
    }),
  ],
})
export class LoggerModule {}
