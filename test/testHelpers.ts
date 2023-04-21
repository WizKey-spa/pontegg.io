import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';

import config from './config';

export const testConfigService = new ConfigService(config);

// console.log('testConfigService', testConfigService);

export const getModuleFixture = async (httpRequest) => {
  return Test.createTestingModule({
    imports: [AppModule],
  })
    .overrideProvider(ConfigService)
    .useValue(testConfigService)
    .overrideProvider(HttpService)
    .useValue({
      request: httpRequest,
    });
};

export const testApp = async (app: INestApplication, httpRequest: jest.Mock<any, any>): Promise<INestApplication> => {
  const moduleFixtureFactory = await getModuleFixture(httpRequest);
  const moduleRef = await moduleFixtureFactory.compile();
  app = moduleRef.createNestApplication();
  await app.init();
  return app;
};
