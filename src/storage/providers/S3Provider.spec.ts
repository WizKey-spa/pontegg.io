'use strict';

import { Test } from '@nestjs/testing';
import { S3Provider } from './S3Provider';
import { ConfigService } from '@nestjs/config';
import { S3 } from 'aws-sdk';
import { PinoLogger } from 'nestjs-pino';
import { NotFoundException } from '@nestjs/common';
import { getMockReadable } from '../../../test/mocks';

describe('persistence/providers/S3Provider', () => {
  let Sut: S3Provider;
  const filePath = 'dir1/dir2/doc1';

  const logMock = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  const s3Mock = {
    getObject: jest.fn().mockReturnValue({
      createReadStream: getMockReadable,
    }),
    headObject: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({}),
    }),
    putObject: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({ ETag: '123' }),
    }),
    deleteObject: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({}),
    }),
    copyObject: jest.fn().mockReturnValue({
      promise: () => Promise.resolve({}),
    }),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const testConfig = {
      STORAGE_PATH: 'documents',
      STORAGE_S3_REGION: 'eu-central-1',
      STORAGE_S3_BUCKET: 'wizkey-dev-testing',
      STORAGE_S3_ACCESS_KEY: 'accesskey',
      STORAGE_S3_SECRET_KEY: 'secretkey',
    };

    const module = await Test.createTestingModule({
      providers: [
        S3Provider,
        {
          provide: ConfigService,
          useValue: {
            get: (k: keyof typeof testConfig) => testConfig[k],
          },
        },
        {
          provide: PinoLogger,
          useValue: logMock,
        },
        {
          provide: S3,
          useValue: s3Mock,
        },
      ],
    }).compile();
    Sut = await module.get<S3Provider>(S3Provider);
  });

  describe('put', () => {
    it('should return a file size', async () => {
      const data = Buffer.from('this is a test');
      const res = await Sut.put(filePath, data);
      expect(typeof res).toEqual('number');
      expect(res).toBeGreaterThan(0);
      expect(s3Mock.putObject).toHaveBeenCalledWith({
        Body: data,
        Bucket: 'wizkey-dev-testing',
        Key: 'documents/dir1/dir2/doc1',
      });
    });
  });

  describe('get', () => {
    it('should read an existing file', async () => {
      const res = await Sut.get(filePath);
      expect(typeof res).toEqual('object');
    });
    it('should fail on missing file', async () => {
      s3Mock.headObject.mockReturnValueOnce({
        promise: () => {
          const err = new Error('Not found');
          Object.assign(err, { code: 'NotFound' });
          throw err;
        },
      });
      // expect.assertions(1);
      try {
        await Sut.get('absyntia');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });

  describe('delete', () => {
    it('should delete an existing file', async () => {
      const res = await Sut.delete(filePath);
      expect(typeof res).toEqual('undefined');
    });
  });

  describe('copy', () => {
    it('should copy an existing file to other location', async () => {
      const res = await Sut.copy(filePath, 'other/dir/doc');
      expect(typeof res).toEqual('undefined');
    });
  });
});
