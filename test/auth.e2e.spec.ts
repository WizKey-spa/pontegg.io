import { testApp } from './testHelpers';
import { INestApplication } from '@nestjs/common';
import { of } from 'rxjs';

import * as request from 'supertest';
import { sampleRefreshToken } from './testdata';

const httpRequest = jest.fn();
let agent: any;
describe('Auth controller', () => {
  let app: INestApplication;

  beforeAll(async () => {
    app = await testApp(httpRequest);
    agent = request.agent(app.getHttpServer());
  });
  afterEach(async () => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await app.close();
  });

  xit('returns a 401 on invalid credentials', async () => {
    httpRequest.mockReturnValue(
      of({
        status: 401,
      }),
    );
    const { status } = await agent.post('/auth/login').send({
      username: 'username',
      password: 'password',
    });
    expect(status).toBe(401);
  });

  it('logs a user in', async () => {
    httpRequest.mockReturnValue(
      of({
        data: { access_token: 123 },
      }),
    );
    const { body } = await agent.post('/auth/login').send({
      username: 'username',
      password: 'password',
    });
    expect(body.access_token).toEqual(123);
  });

  it('allows to refresh a token', async () => {
    httpRequest.mockReturnValue(
      of({
        data: { access_token: 123 },
      }),
    );
    const { body } = await agent.post('/auth/refresh').send({
      refreshToken: sampleRefreshToken,
    });
    expect(body.access_token).toEqual(123);
  });
});
