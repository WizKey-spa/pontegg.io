import { readFileSync } from 'fs';
import { ConfigService } from '@nestjs/config';

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
        sslCA: readFileSync(caCertPath),
      }
    : null;
};

const mongoOptionsFactory = (config: ConfigService) => ({
  // useFindAndModify: false,
  // useCreateIndex: true,
  directConnection: true,
  uri: getMongoDbUri(config),
  ...getSSLOptions(config),
});

export default mongoOptionsFactory;
