import { Test } from '@nestjs/testing';
import { NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import tempWrite from 'temp-write';
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const tempWrite = require('temp-write');
import { PinoLogger } from 'nestjs-pino';
//

import { LocalProvider } from './LocalProvider';
// eslint-disable-next-line @typescript-eslint/no-var-requires
// const tempWrite = require('temp-write');
/* const fs = require('fs');
const path = require('path');
const rimraf = require('rimraf');
const expect = require('../../expect');
const Sut = require(path.join(global.SRC_FOLDER, 'persistence/providers/LocalProvider')); */

/* const basePath = path.join(__dirname, '..', '..', '..', 'var', 'test'); */

describe('persistence/providers/LocalProvider', () => {
  let sut: LocalProvider;
  let fname: string;

  const logMock = {
    setContext: jest.fn(),
    debug: jest.fn(),
  };

  beforeEach(async () => {
    const temp = tempWrite.sync('AMAZING');
    const split = temp.split('/');
    fname = split.pop() as string;
    const testConfig = {
      STORAGE_PATH: split.join('/'),
    };

    const module = await Test.createTestingModule({
      providers: [
        LocalProvider,
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
      ],
    }).compile();

    sut = module.get(LocalProvider) as LocalProvider;
  });

  describe('get', () => {
    it('should read an existing file', async (done) => {
      const readStream = await sut.get(fname);
      readStream.on('data', (data) => {
        expect(data.toString()).toBe('AMAZING');
        done();
      });
    });

    it('should return an error if the file is not readable', async () => {
      expect.assertions(1);
      try {
        await sut.get(fname + '2');
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });
  });
});
