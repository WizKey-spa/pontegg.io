import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { MongoClient, Db } from 'mongodb';
import { PinoLogger } from 'nestjs-pino';

const getMongoDbUri = (config: ConfigService): string => {
  const username = config.get('MONGODB_USERNAME');
  const password = config.get('MONGODB_PASSWORD');
  const credentials = username && password ? `${username}:${password}@` : '';
  const uri = `${config.get('MONGODB_PROTOCOL')}://${credentials}${config.get('MONGODB_HOST')}/${config.get(
    'MONGODB_DATABASE',
  )}`;
  return uri;
};

const getSSLOptions = (config: ConfigService) => {
  const caCertPath = config.get('MONGODB_CA_CERT_PATH');
  return caCertPath
    ? {
        ssl: true,
        sslValidate: true,
        sslCA: caCertPath,
      }
    : {};
};

@Module({
  imports: [ConfigModule],
  providers: [
    {
      provide: 'DB',
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      useFactory: async (config: ConfigService, logger): Promise<Db> => {
        try {
          const client = await MongoClient.connect(getMongoDbUri(config), getSSLOptions(config));
          // logger.info('Connected to MongoDB:', getMongoDbUri(config));
          return client.db(config.get('MONGODB_DATABASE'));
        } catch (e) {
          throw e;
        }
      },
      inject: [ConfigService, PinoLogger],
    },
  ],

  exports: ['DB'],
})
export class DatabaseModule {}
