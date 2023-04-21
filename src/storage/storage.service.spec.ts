import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { getLoggerToken } from 'nestjs-pino';

import { getMockReadable } from '../../test/mocks';
import { CompressionProvider } from './providers/CompressionProvider';
import { FileWithKey, StorageService } from './storage.service';

describe('StorageService', () => {
  let service: StorageService;

  const logMock = {
    setContext: jest.fn(),
    debug: jest.fn(),
    info: jest.fn(),
    error: jest.fn(),
  };

  const fileProviderMock = {
    put: jest.fn(),
    delete: jest.fn(),
  };

  const compressionProviderMock = {
    compressPDF: jest.fn(),
  };

  describe('When working with stored files', () => {
    const fakeFileWithKey: FileWithKey = {
      file: {
        fieldname: 'file',
        originalname: 'file.png',
        encoding: '7bit',
        mimetype: 'png',
      },
      key: 'key',
      notarization: {
        notarizedAt: new Date(),
        notarizedPayload: 'payload',
        transactionId: 'trxid',
        digest: '11',
      },
    };

    beforeAll(async () => {
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          StorageService,
          {
            provide: 'FILE_PROVIDER',
            useValue: fileProviderMock,
          },
          {
            provide: getLoggerToken(StorageService.name),
            useValue: logMock,
          },
          {
            provide: CompressionProvider,
            useValue: compressionProviderMock,
          },
        ],
      }).compile();
      service = module.get(StorageService);
    });

    it('should not delete a file if it is missing the `key` attribute', () => {
      expect.assertions(1);
      try {
        service.deleteFile({} as FileWithKey);
      } catch (err) {
        expect(err).toBeInstanceOf(NotFoundException);
      }
    });

    it('should verify file hashes while writing', async () => {
      const storedFile = await service.writeVerified('entityId', fakeFileWithKey, getMockReadable());
      expect(storedFile.error).toEqual('File hash verification failed for entity: entityId key: key');
    });

    it('should verify file hashes while writing', async () => {
      const storedFile = await service.writeVerified('entityId', fakeFileWithKey, getMockReadable());
      expect(storedFile.error).toEqual('File hash verification failed for entity: entityId key: key');
    });
  });
});
