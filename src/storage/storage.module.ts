import { Module } from '@nestjs/common';
import { StorageService } from './storage.service';
import { ConfigService } from '@nestjs/config';
import { LocalProvider } from './providers/LocalProvider';
import { S3Provider } from './providers/S3Provider';
import { PinoLogger } from 'nestjs-pino';
import AWS, { S3 } from 'aws-sdk';
import { CompressionProvider } from './providers/CompressionProvider';
import { CompressionProviderEventService } from './events/CompressionProviderEventService';

@Module({
  providers: [
    StorageService,
    {
      provide: 'FILE_PROVIDER',
      useFactory: (conf, logger, s3) => {
        // here we instantiate the file provider based on configuration
        if (conf.get('STORAGE_PROVIDER') === 'S3') {
          return new S3Provider(conf, logger, s3);
        }
        return new LocalProvider(conf, logger);
      },
      inject: [ConfigService, PinoLogger, S3],
    },
    {
      provide: S3,
      useFactory: () => new AWS.S3(),
      inject: [ConfigService, PinoLogger],
    },
    CompressionProvider,
    CompressionProviderEventService,
  ],
  exports: [StorageService, CompressionProviderEventService],
})
export class StorageModule {}
