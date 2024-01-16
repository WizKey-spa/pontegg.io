import { of } from 'rxjs';
import request from 'supertest';

import { Test } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { HttpService } from '@nestjs/axios';
import { INestApplication } from '@nestjs/common';

import { AppModule } from '../src/app.module';
import ResourceQueryService from '../src/resource/resource.query.service';

import config from './config';
import { dates2str } from '../src/lib/dates2str';
import { getSignedToken } from './testdata';
import { keycloakUsers } from './mocks/auth';

import API, { Condition, Let } from '@Types/api';
import { StoredFile } from '@Types/document';
import { ResourceClassName } from '@Types/common';

export const testConfigService = new ConfigService(config);

export const getModuleFixture = async (httpRequest: jest.Mock<any, any>) => {
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

export const testApp = async (httpRequest: jest.Mock<any, any>): Promise<INestApplication> => {
  const moduleFixtureFactory = await getModuleFixture(httpRequest);

  const moduleRef = await moduleFixtureFactory.compile();
  const app = moduleRef.createNestApplication();
  await app.init();
  return app;
};

function getActors<Actor extends string, Resource>(defined: Let<Actor, Resource>, groups: readonly Actor[]) {
  const allowedActors = defined.map((actorDef) => (typeof actorDef === 'string' ? actorDef : actorDef.for));
  const notAllowedActors = groups.filter((group) => !allowedActors.includes(group));
  return { allowedActors, notAllowedActors };
}

type Failure = [string, object];
type Success<Resource> = [string, Partial<Resource>];

export type SectionPayloads<Actor extends string, Resource, A extends API<Actor, Resource>> = {
  [key in keyof A['sections']]: { succeeds: [string, Partial<Resource>[key]][]; fails?: Failure[] };
};

export type Payloads<Actor extends string, Resource, A extends API<Actor, Resource>> = SectionPayloads<
  Actor,
  Resource,
  A
> & {
  create?: { succeeds: Success<Resource>[]; fails?: Failure[] };
  update?: { succeeds: Success<Resource>[]; fails?: Failure[] };
  delete?: { succeeds: Success<Resource>[]; fails?: Failure[] };
};

type Upload = { succeeds: [string, string | string[]][]; fails?: [string, string | string[]][] };

export type Uploads<Actor extends string, Resource, A extends API<Actor, Resource>> = {
  [key in keyof A['sections']]: Upload;
};

interface PostUploadParams<Actor extends string, Resource> {
  sectionName: string;
  actor: Actor;
  sectionData: Resource[keyof Resource];
  upload: string;
  expectedStatus: number;
}

export type HttpRequests<R> =
  | {
      [P in keyof R]: any[];
    }
  | {
      create?: any[];
      update?: any[];
      delete?: any[];
    };

interface TestResourceControllerParams<Actor extends string, Resource> {
  resourceName: ResourceClassName;
  groups: readonly Actor[];
  apiDef: API<Actor, Resource>;
  payloads: Payloads<Actor, Resource, API<Actor, Resource>>;
  uploads?: Uploads<Actor, Resource, API<Actor, Resource>>;
  residualData: Record<string, any[]>;
  httpRequests?: HttpRequests<Resource>;
}

export const testResourceE2E = <Actor extends string, Resource>({
  resourceName,
  groups,
  apiDef,
  uploads,
  payloads,
  residualData,
  httpRequests,
}: TestResourceControllerParams<Actor, Resource>) => {
  let app: INestApplication;
  let resourceService: ResourceQueryService;
  let agent: request.SuperAgentTest;

  const httpRequest = jest.fn().mockReturnValue(
    of({
      data: { access_token: 'asdasdasdasdasdasd' },
    }),
  );
  httpRequest.mockReturnValueOnce(of({ data: keycloakUsers }));
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const postUpload = async <Actor extends string, Resource>({
    sectionName,
    actor,
    sectionData,
    upload,
    expectedStatus,
  }: PostUploadParams<Actor, Resource>) => {
    const { id } = await resourceService._create<Resource>(
      resourceName as ResourceClassName,
      sectionData as Partial<Resource>,
    );
    const url = `/${resourceName}/${id}/${sectionName}/document`;
    await agent.post(url).set('Authorization', getSignedToken(actor)).attach('file', upload).expect(expectedStatus);
  };

  beforeAll(async () => {
    app = await testApp(httpRequest);
    resourceService = app.get<ResourceQueryService>(ResourceQueryService);
    agent = request.agent(app.getHttpServer());

    await resourceService._dropIndexes(resourceName);
    await resourceService._deleteMany(resourceName);
    Object.keys(residualData).forEach(async (otherResourceName) => {
      if (resourceName !== otherResourceName) {
        residualData[otherResourceName].forEach(
          async (resData) => await resourceService._create(otherResourceName as ResourceClassName, resData),
        );
      }
    });
  });

  afterEach(async () => {
    await resourceService._deleteMany(resourceName);
  });

  afterAll(async () => {
    Object.keys(residualData).forEach(async (otherResourceName) => {
      await resourceService._deleteMany(otherResourceName as ResourceClassName);
    });
    await app.close();
    //  httpRequest.mockRestore();
  });

  if (!!apiDef.create) {
    if (!payloads.create) {
      throw new Error(`Missing payloads.create for ${resourceName}`);
    }
    describe(`POST /${resourceName}`, () => {
      const allowedActors = apiDef.create.let.map((actorDef) =>
        typeof actorDef === 'string' ? actorDef : actorDef.for,
      );
      const notAllowedActors = groups.filter((group) => !allowedActors.includes(group));

      describe.each(allowedActors)('201: %s succeeds', (actor) => {
        it.each(payloads.create.succeeds)('with %s', async (expected, payload) => {
          if (httpRequests && 'create' in httpRequests && (httpRequests.create as any[]).length > 0) {
            (httpRequests.create as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
          }
          await agent.post(`/${resourceName}`).set('Authorization', getSignedToken(actor)).send(payload).expect(201);
        });
      });

      if (notAllowedActors.length > 0) {
        it.each(notAllowedActors)('403: fails by %s', async (actor) => {
          await agent
            .post(`/${resourceName}`)
            .set('Authorization', getSignedToken(actor))
            .send(payloads.create.succeeds[0])
            .expect(403);
        });
      }
    });
  }

  describe(`GET /${resourceName}/:id`, () => {
    const { allowedActors, notAllowedActors } = getActors<Actor, Resource>(apiDef.get.let, groups);
    const resourceDataWithDateStr = { ...residualData[resourceName][0] };
    dates2str(resourceDataWithDateStr);
    let url: string;
    let resourceId: { id: string };

    beforeEach(async () => {
      resourceId = await resourceService._create<Resource>(resourceName, resourceDataWithDateStr);
      url = `/${resourceName}/${resourceId.id}`;
    });

    it.each(allowedActors)('200: succeeds by %s', async (actor) => {
      const { body } = await agent.get(url).set('Authorization', getSignedToken(actor)).expect(200);
      expect(body).toMatchObject(resourceDataWithDateStr);
    });

    if (notAllowedActors.length > 0) {
      it.each(notAllowedActors)('403: fails by %s', async (actor) => {
        await request.agent(app.getHttpServer()).get(url).set('Authorization', getSignedToken(actor)).expect(403);
      });
    }

    it('403: deny other principal', async () => {
      await agent
        .get(url)
        .set('Authorization', getSignedToken('principals', 'ab596f9b-1d6c-4b82-8b28-19b2da873202'))
        .expect(403);
    });

    it('401: deny without Authorization', async () => {
      await agent.get(`/${resourceName}/${resourceId.id}`).expect(401);
    });
  });

  describe(`GET /${resourceName}/ list`, () => {
    const { allowedActors, notAllowedActors } = getActors<Actor, Resource>(apiDef.list.let, groups);

    beforeEach(async () => {
      await resourceService._deleteMany(resourceName);

      await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
      await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
      await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
      await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
      await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
    });

    it.each(allowedActors)('220: succeeds by %s', async (actor) => {
      const { body } = await agent.get(`/${resourceName}/`).set('Authorization', getSignedToken(actor)).expect(200);
      expect(body.items).toHaveLength(5);
    });

    if (notAllowedActors.length > 0) {
      it.each(notAllowedActors)('403: fails by %s', async (actor) => {
        await agent.get(`/${resourceName}/`).set('Authorization', getSignedToken(actor)).expect(403);
      });
    }

    it('401: fails without Authorization', async () => {
      await agent.get(`/${resourceName}/`).expect(401);
    });
  });

  if (apiDef.update) {
    if (!payloads.update) {
      throw new Error(`Missing payloads.update for ${resourceName}`);
    }
    describe(`PUT /${resourceName}/:id`, () => {
      const allowedActors = apiDef.update.let.map((actorDef) =>
        typeof actorDef === 'string' ? actorDef : actorDef.for,
      );
      const notAllowedActors = groups.filter((group) => !allowedActors.includes(group));

      beforeEach(async () => {
        await resourceService._deleteMany(resourceName);
      });
      it.each(allowedActors)('200: succeeds by %s', async (actor) => {
        const { id } = await resourceService._create<Resource>(resourceName, residualData[resourceName][0]);
        if (httpRequests && 'update' in httpRequests && (httpRequests.update as any[]).length > 0) {
          (httpRequests.update as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        await agent
          .put(`/${resourceName}/${id}`)
          .set('Authorization', getSignedToken(actor))
          .send(payloads.update.succeeds[0][1])
          .expect(200);
      });
      it.each(notAllowedActors)('403: denied for %s', async (actor) => {
        const { id: principalId } = await resourceService._create<Resource>(
          resourceName,
          residualData[resourceName][0],
        );
        await agent
          .put(`/${resourceName}/${principalId}`)
          .set('Authorization', getSignedToken(actor))
          .send(payloads.update.succeeds[0][1])
          .expect(403);
      });
    });
  }

  describe(`SECTIONS:`, () => {
    const testSectionDocumentCreate = ({
      sectionName,
      sectionUploads,
      actor,
      resourceData,
      versioned,
    }: {
      sectionName: string;
      sectionUploads: Upload;
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionUploads.succeeds)('201: succeeds upload %s', async (expected, upload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/document`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        const { body } = await agent
          .post(url)
          .set('Authorization', getSignedToken(actor))
          .attach('file', upload as string)
          .expect(201);
        // expect(body[sectionName].file.size).toEqual(27526);
        // expect(body[sectionName].file.mimetype).toEqual('application/pdf');
        expect(body[sectionName].key).toEqual(
          `${resourceName}/${id}/${sectionName}/file/${body[sectionName].hash256.slice(0, 20)}`,
        );
        // const { body: c, header } = await agent
        //   .get(`/${body[sectionName].key}`)
        //   .set('Authorization', getSignedToken(actor))
        //   .expect(200);
        // expect(header['content-type']).toMatch(upload.split('.')[-1]));
        // expect(c.toString()).toMatch('</rdf:RDF></x:xmpmeta><?xpacket end="w"?>');
      });
      it.each(sectionUploads.fails)('400: fails upload %s', async (expected, upload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/document`;
        await agent
          .post(url)
          .set('Authorization', getSignedToken(actor))
          .attach('file', upload as string)
          .expect(400);
      });
      if (versioned) {
        it.each(sectionUploads.succeeds)('201: succeeds storing version %s', async (expected, upload) => {
          const { id } = await resourceService._create<Resource>(resourceName, resourceData);
          const url = `/${resourceName}/${id}/${sectionName}/document`;
          if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
            (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
          }
          const { body } = await agent
            .post(url)
            .set('Authorization', getSignedToken(actor))
            .attach('file', upload as string)
            .expect(201);
          expect(body[`_${sectionName}Versions`][0].data).toBeDefined();
        });
      }
    };

    const testSectionDocumentsCreate = ({
      sectionName,
      sectionUploads,
      actor,
      resourceData,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      versioned,
    }: {
      sectionName: string;
      sectionUploads: Upload;
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionUploads.succeeds)('201: succeeds upload %s', async (expected, multipleUpload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/documents`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        const req = agent.post(url).set('Authorization', getSignedToken(actor));
        (multipleUpload as string[]).forEach(async (upload) => {
          req.attach('files', upload);
        });
        await req.expect(201);
        // expect(body[sectionName].file.size).toEqual(27526);
        // expect(body[sectionName].file.mimetype).toEqual('application/pdf');
        // expect(body[sectionName].key).toEqual(
        //   `${resourceName}/${id}/${sectionName}/file/${body[sectionName].hash256.slice(0, 20)}`,
        // );

        // const { body: c, header } = await agent
        //   .get(`/${body[sectionName].key}`)
        //   .set('Authorization', getSignedToken(actor))
        //   .expect(200);
        // expect(header['content-type']).toMatch(upload.split('.')[-1]));
        // expect(c.toString()).toMatch('</rdf:RDF></x:xmpmeta><?xpacket end="w"?>');
      });
      it.each(sectionUploads.fails)('400: fails upload %s', async (expected, multipleUpload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/documents`;
        const req = agent.post(url).set('Authorization', getSignedToken(actor));
        (multipleUpload as string[]).forEach(async (upload) => {
          req.attach('files', upload);
        });
        await req.expect(400);
      });
      // if (versioned) {
      //   it.each(sectionUploads.succeeds)(
      //     '201: succeeds storing version %s',
      //     async (expected, multipleUpload) => {
      //       const { id } = await resourceService._create<Resource>(resourceName, data4Section);
      //       const url = `/${resourceName}/${id}/${sectionName}/documents`;
      //       const req = agent.post(url).set('Authorization', getSignedToken(actor));
      //       (multipleUpload as string[]).forEach(async (upload) => {
      //         const { body } = await req.attach('files', upload).expect(201);
      //         expect(body[`_${sectionName}Versions`][0].data).toBeDefined();
      //       });
      //     },
      //   );
      // }
    };

    const testSectionCreate = ({
      sectionName,
      sectionPayloads,
      actor,
      resourceData,
      versioned,
    }: {
      sectionName: string;
      sectionPayloads: Payloads<Actor, Resource, API<Actor, Resource>>['create'];
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionPayloads.succeeds as [string, object][])('201: succeeds with %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        const { body } = await agent.post(url).set('Authorization', getSignedToken(actor)).send(payload).expect(201);
        // dates2str(payload);
        expect(body[sectionName]).toMatchObject(payload);
      });
      it.each(sectionPayloads.fails as [string, object][])('400: fails with %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        await agent.post(url).set('Authorization', getSignedToken(actor)).send(payload).expect(400);
      });
      if (versioned) {
        it.each(sectionPayloads.succeeds as [string, object][])(
          '201: succeeds storing version %s',
          async (expected, payload) => {
            const { id } = await resourceService._create<Resource>(resourceName, resourceData);
            const url = `/${resourceName}/${id}/${sectionName}`;
            const { body } = await agent
              .post(url)
              .set('Authorization', getSignedToken(actor))
              .send(payload)
              .expect(201);
            expect(body[`_${sectionName}Versions`][0].data).toMatchObject(payload);
          },
        );
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const testSectionDelete = ({
      sectionName,
      sectionPayloads,
      actor,
      resourceData,
      versioned,
    }: {
      sectionName: string;
      sectionPayloads: Payloads<Actor, Resource, API<Actor, Resource>>['delete'];
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionPayloads.succeeds as [string, object][])('201: succeeds with %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        const { body } = await agent.delete(url).set('Authorization', getSignedToken(actor)).send(payload).expect(201);
        // dates2str(payload);
        expect(body[sectionName]).toMatchObject(payload);
      });
      it.each(sectionPayloads.fails as [string, object][])('400: fails with %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        await agent.delete(url).set('Authorization', getSignedToken(actor)).send(payload).expect(400);
      });
      if (versioned) {
        it.each(sectionPayloads.succeeds as [string, object][])(
          '201: succeeds storing version %s',
          async (expected, payload) => {
            const { id } = await resourceService._create<Resource>(resourceName, resourceData);
            const url = `/${resourceName}/${id}/${sectionName}`;
            await agent.delete(url).set('Authorization', getSignedToken(actor)).send(payload).expect(201);
            // expect(body[`_${sectionName}Versions`][0].data).toMatchObject(payload);
          },
        );
      }
    };

    const testSectionDocumentUpdate = ({
      sectionName,
      sectionUploads,
      actor,
      resourceData,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      versioned,
    }: {
      sectionName: string;
      sectionUploads: Upload;
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      let res;
      it.each(sectionUploads.succeeds)('201: succeeds upload %s', async (expected, upload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/document`;
        res = await agent
          .put(url)
          .set('Authorization', getSignedToken(actor))
          .attach('file', upload as string)
          .expect(200);
        // expect(body[sectionName].file.size).toEqual(27526);
        // expect(body[sectionName].file.mimetype).toEqual('application/pdf');
        expect(res.body[sectionName].key).toEqual(
          `${resourceName}/${id}/${sectionName}/file/${res.body[sectionName].hash256.slice(0, 20)}`,
        );
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        // eslint-disable-next-line @typescript-eslint/no-unused-vars
        const { body: c, header } = await agent
          .get(`/${res.body[sectionName].key}`)
          .set('Authorization', getSignedToken(actor))
          .expect(200);
        // expect(header['content-type']).toMatch(upload.split('.')[-1]));
        // expect(c.toString()).toMatch('</rdf:RDF></x:xmpmeta><?xpacket end="w"?>');
      });
      it.each(sectionUploads.fails)('400: fails upload %s', async (expected, upload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/document`;
        res = await agent
          .put(url)
          .set('Authorization', getSignedToken(actor))
          .attach('file', upload as string)
          .expect(400);
      });
    };

    const testSectionDocumentsUpdate = ({
      sectionName,
      sectionUploads,
      actor,
      resourceData,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      versioned,
    }: {
      sectionName: string;
      sectionUploads: Upload;
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      let res;
      it.each(sectionUploads.succeeds)('201: succeeds upload %s', async (expected, uploads) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/documents`;
        // we preload some documents
        // await agent
        //   .post(url)
        //   .set('Authorization', getSignedToken(actor))
        //   .attach('files', uploads[0])
        //   .attach('files', uploads[1])
        //   .expect(201);
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        res = agent.put(url).set('Authorization', getSignedToken(actor));
        (uploads as string[]).forEach((upload) => {
          res.attach('files', upload);
        });
        await res.expect(200);
        // .attach('file', upload as string)
        // .expect(200);
        // expect(body[sectionName].file.size).toEqual(27526);
        // expect(body[sectionName].file.mimetype).toEqual('application/pdf');
        // expect(res.body[sectionName].key).toEqual(
        //   `${resourceName}/${id}/${sectionName}/file/${res.body[sectionName].hash256.slice(0, 20)}`,
        // );
        // const { body: c, header } = await agent
        //   .get(`/${res.body[sectionName].key}`)
        //   .set('Authorization', getSignedToken(actor))
        //   .expect(200);
        // expect(header['content-type']).toMatch(upload.split('.')[-1]));
        // expect(c.toString()).toMatch('</rdf:RDF></x:xmpmeta><?xpacket end="w"?>');
      });
      it.each(sectionUploads.fails)('400: fails upload %s', async (expected, uploads) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}/document`;
        res = await agent.put(url).set('Authorization', getSignedToken(actor)).attach('files', uploads[0]).expect(400);
      });
    };

    const testSectionDocumentsDelete = ({
      sectionName,
      sectionPayloads,
      actor,
      resourceData,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      versioned,
    }: {
      sectionName: string;
      sectionPayloads: Upload;
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionPayloads.succeeds)('201: succeeds deleting %s', async (expected, doc) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const fileId = (doc as unknown as StoredFile[])[0].hash256.slice(0, 20);
        const url = `/${resourceName}/${id}/${sectionName}/documents/${fileId}`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        await agent.delete(url).set('Authorization', getSignedToken(actor)).expect(200);
        // TODO check that the document is deleted
      });
      it.each(sectionPayloads.fails)('404: fails deleting %s', async (expected, doc) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const fileId = (doc as unknown as StoredFile[])[0].hash256.slice(0, 20);
        const url = `/${resourceName}/${id}/${sectionName}/documents/${fileId}`;
        await agent.delete(url).set('Authorization', getSignedToken(actor)).expect(404);
      });
      // TODO test versioning & deleting in correct state
    };

    const testSectionUpdate = ({
      sectionName,
      sectionPayloads,
      actor,
      resourceData,
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      versioned,
    }: {
      sectionName: string;
      sectionPayloads: Payloads<Actor, Resource, API<Actor, Resource>>['update'];
      actor: Actor;
      resourceData: any;
      versioned?: boolean;
    }) => {
      it.each(sectionPayloads.succeeds as [string, object][])('201: succeeds with %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        if (httpRequests && sectionName in httpRequests && (httpRequests[sectionName] as any[]).length > 0) {
          (httpRequests[sectionName] as any[]).forEach((mock) => httpRequest.mockReturnValueOnce(of(mock)));
        }
        const { body } = await agent
          .put(url)
          .set('Authorization', getSignedToken(actor))
          .send(payload as string | object)
          .expect(200);
        expect(body[sectionName]).toMatchObject(payload);
      });
      it.each(sectionPayloads.fails as [string, object][])('400: fails upload %s', async (expected, payload) => {
        const { id } = await resourceService._create<Resource>(resourceName, resourceData);
        const url = `/${resourceName}/${id}/${sectionName}`;
        await agent
          .put(url)
          .set('Authorization', getSignedToken(actor))
          .send(payload as string | object)
          .expect(400);
      });
    };

    afterAll(async () => {
      await resourceService._deleteMany(resourceName);
    });

    Object.keys(apiDef.sections).forEach(async (sectionName) => {
      const { document, documents, versioned, ...section } = apiDef.sections[sectionName];
      const actionNames = Object.keys(section);
      const sectionUploads: Upload = uploads && uploads[sectionName];
      const sectionPayloads = payloads[sectionName];
      const urlSymbol = `/${resourceName}/:id/${sectionName}/${document ? 'document' : documents ? 'documents' : ''}`;

      actionNames.forEach(async (actionName) => {
        const action = section[actionName];
        const { allowedActors, notAllowedActors } = getActors<Actor, Resource>(action.let, groups);
        const allowedActorsWithState: Condition<Actor, Resource>[] = action.let?.filter(
          (actorDef) => typeof actorDef !== 'string' && 'if' in actorDef && 'state' in actorDef.if,
        );
        let resourceData = { ...residualData[resourceName][0] };
        if (actionName === 'create') {
          delete resourceData[sectionName];
        }
        describe(`${urlSymbol}`, () => {
          allowedActors.forEach(async (actor) => {
            describe(`${actionName} by ${actor}`, () => {
              const actorConditions = action.let?.find((actorDef) => typeof actorDef !== 'string');
              if (actorConditions && 'if' in actorConditions) {
                if (Array.isArray(actorConditions.if.state) && actorConditions.if.state.length > 0) {
                  resourceData = { ...resourceData, state: actorConditions.if.state[0] };
                } else {
                  resourceData = { ...resourceData, ...actorConditions.if };
                }
              }
              if (actionName === 'create') {
                if (!!document) {
                  if (!sectionUploads) {
                    throw new Error(`Missing uploads for ${resourceName}/${sectionName}`);
                  }
                  testSectionDocumentCreate({
                    sectionName,
                    sectionUploads,
                    actor,
                    resourceData,
                    versioned,
                  });
                } else if (!!documents) {
                  if (!sectionUploads) {
                    throw new Error(`Missing uploads for ${resourceName}/${sectionName}`);
                  }
                  testSectionDocumentsCreate({
                    sectionName,
                    sectionUploads,
                    actor,
                    resourceData,
                    versioned,
                  });
                } else {
                  if (!sectionPayloads) {
                    throw new Error(`Missing payloads for ${resourceName}/${sectionName}`);
                  }
                  testSectionCreate({
                    sectionName,
                    sectionPayloads,
                    actor,
                    resourceData,
                    versioned,
                  });
                }
              }
              if (actionName === 'delete') {
                if (!!documents) {
                  if (!sectionPayloads) {
                    throw new Error(`Missing payload for ${resourceName}/${sectionName}`);
                  }
                  testSectionDocumentsDelete({
                    sectionName,
                    sectionPayloads,
                    actor,
                    resourceData,
                    versioned,
                  });
                }
              } else if (actionName === 'update') {
                if (!!document) {
                  if (!sectionUploads) {
                    throw new Error(`Missing uploads for ${resourceName}/${sectionName}`);
                  }
                  testSectionDocumentUpdate({
                    sectionName,
                    sectionUploads,
                    actor,
                    resourceData,
                    versioned,
                  });
                } else if (!!documents) {
                  if (!sectionUploads) {
                    throw new Error(`Missing uploads for ${resourceName}/${sectionName}`);
                  }
                  testSectionDocumentsUpdate({
                    sectionName,
                    sectionUploads,
                    actor,
                    resourceData,
                    versioned,
                  });
                } else {
                  if (!sectionPayloads) {
                    throw new Error(`Missing payloads for ${resourceName}/${sectionName}`);
                  }
                  testSectionUpdate({
                    sectionName,
                    sectionPayloads,
                    actor,
                    resourceData,
                    versioned,
                  });
                }
              }
            });
          });
          if (notAllowedActors.length > 0) {
            describe.each(notAllowedActors)('deny %s', (actor) => {
              if (actionName === 'create') {
                if (!!document) {
                  it.each(sectionUploads.succeeds)('403: denied upload %s', async (expected, upload) => {
                    const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                    const url = `/${resourceName}/${id}/${sectionName}/document`;
                    await agent
                      .post(url)
                      .set('Authorization', getSignedToken(actor))
                      .attach('file', upload as string)
                      .expect(403);
                  });
                } else if (!!documents) {
                  it.each(sectionUploads.succeeds)('403: denied upload %s', async (expected, multipleUpload) => {
                    const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                    const url = `/${resourceName}/${id}/${sectionName}/documents`;
                    const req = agent.post(url).set('Authorization', getSignedToken(actor));
                    (multipleUpload as string[]).forEach(async (upload) => {
                      req.attach('files', upload);
                    });
                    await req.expect(403);
                  });
                } else {
                  it.each(sectionPayloads.succeeds as [string, object][])('403: denied', async (expected, payload) => {
                    const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                    const url = `/${resourceName}/${id}/${sectionName}/`;
                    await agent.post(url).set('Authorization', getSignedToken(actor)).send(payload).expect(403);
                  });
                }
              } else {
                if (!!document) {
                  it.each(sectionUploads.succeeds)('403: denied upload %s', async (expected, upload) => {
                    const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                    const url = `/${resourceName}/${id}/${sectionName}/document`;
                    await agent
                      .put(url)
                      .set('Authorization', getSignedToken(actor))
                      .attach('file', upload as string)
                      .expect(403);
                  });
                } else if (!!documents) {
                  it.each(sectionUploads.succeeds)('403: denied upload %s', async (expected, multipleUpload) => {
                    const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                    const url = `/${resourceName}/${id}/${sectionName}/documents`;
                    const req = agent.post(url).set('Authorization', getSignedToken(actor));
                    (multipleUpload as string[]).forEach(async (upload) => {
                      req.attach('files', upload);
                    });
                    await req.expect(403);
                  });
                } else {
                  it.each(sectionPayloads.succeeds as [string, object][])(
                    '403: denied %s',
                    async (expected, payload) => {
                      const { id } = await resourceService._create<Resource>(resourceName, resourceData);
                      const url = `/${resourceName}/${id}/${sectionName}/`;
                      await agent.put(url).set('Authorization', getSignedToken(actor)).send(payload).expect(403);
                    },
                  );
                }
              }
            });
          }
          if (allowedActorsWithState.length > 0) {
            it.each(allowedActorsWithState)(`400: fails committing on wrong state`, async (actor) => {
              const expectedState = actor?.if.state;
              const wrongState = apiDef.states.filter((state) =>
                Array.isArray(expectedState) ? !expectedState.includes(state) : state !== expectedState,
              )[0];
              const { id } = await resourceService._create<Resource>(resourceName, {
                ...resourceData,
                state: wrongState,
              });
              if (!!document) {
                const url = `/${resourceName}/${id}/${sectionName}/document`;
                const { statusCode } = await agent
                  .put(url)
                  .set('Authorization', getSignedToken(actor.for))
                  .attach('file', uploads[sectionName].succeeds[0][1]);
                expect(statusCode).toBe([400, 403].includes(statusCode) ? statusCode : 403);
              } else if (!!documents) {
                const url = `/${resourceName}/${id}/${sectionName}/documents`;
                const req = agent.put(url).set('Authorization', getSignedToken(actor.for));
                const multipleUploads = uploads[sectionName].succeeds[0][1] as string[];
                multipleUploads.forEach((upload) => {
                  req.attach('files', upload);
                });
                const { statusCode } = await req;
                expect(statusCode).toBe([400, 403].includes(statusCode) ? statusCode : 403);
              } else {
                const url = `/${resourceName}/${id}/${sectionName}`;
                const { statusCode } = await agent
                  .put(url)
                  .set('Authorization', getSignedToken(actor.for))
                  .send(payloads[sectionName].succeeds[0][1]);
                expect(statusCode).toBe([400, 403].includes(statusCode) ? statusCode : 403);
              }
            });
          }
        });
      });
    });
  });
};
