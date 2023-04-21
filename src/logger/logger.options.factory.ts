import { RequestMethod } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import noir from 'pino-noir';

import { logger } from './logger';

const redaction = noir([
  // user bearer tokens
  'req.headers.authorization',
  // axios errors
  'headers.Authorization',
]);

const loggerOptionsFactory = (configService: ConfigService) => ({
  pinoHttp: {
    logger: logger,
    useLevel: configService.get('LOGLEVEL'),
    // options: {
    //   colorize: process.env.NODE_ENV !== 'production',
    // },
    //parser: I18nJsonParser,
    serializers: redaction,
  },
  exclude: [{ method: RequestMethod.ALL, path: '/v1/healthcheck' }],
});
export default loggerOptionsFactory;
