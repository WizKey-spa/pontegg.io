import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { pipeline, Readable, Transform } from 'stream';
import crypto from 'crypto';

import { hash } from '../lib/hash';
import { FileProvider } from './providers/FileProvider';
import { StoredFileDTO } from './StoredFile.entity';
import { Notarization } from '../common.dto';

import { CompressionProvider } from './providers/CompressionProvider';

const HASH_ALGORITHM = 'sha256';
export type FileWithKey = StoredFileDTO & { key: string };
export type NotarizedFile = StoredFileDTO & { notarization: Notarization };

@Injectable()
export class StorageService {
  constructor(
    @Inject('FILE_PROVIDER') private readonly provider: FileProvider,
    @InjectPinoLogger(StorageService.name) private readonly logger: PinoLogger,
    @Inject(CompressionProvider) private readonly compressionProvider: CompressionProvider,
  ) {}

  hasKey(file: StoredFileDTO): file is FileWithKey {
    return !!file.key;
  }

  isNotarizedFile(file: StoredFileDTO): file is NotarizedFile {
    return !!file.notarization;
  }

  private ensureWritable(file: StoredFileDTO): asserts file is FileWithKey {
    if (!this.hasKey(file)) {
      throw new NotFoundException('File has no key. Not writable');
    }
  }

  deleteFile(file: StoredFileDTO) {
    this.ensureWritable(file);
    return this.provider.delete(file.key);
  }

  async writeFile(file: FileWithKey, buf: Buffer | Readable) {
    this.ensureWritable(file);
    const size = await this.provider.put(file.key, buf);
    return {
      ...file,
      size,
      lastUpload: new Date(),
    };
  }

  streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: any[] = [];
    return new Promise((resolve, reject) => {
      stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
      stream.on('error', (err) => reject(err));
      stream.on('end', () => resolve(Buffer.concat(chunks)));
    });
  }

  async writeVerified(entityId: string, file: FileWithKey, stream: Readable) {
    let error;

    this.logger.info(`Verifying and writing file '${file.key}' for entity '${entityId}'`);
    if (!this.hasKey(file)) {
      throw new NotFoundException(`File ${entityId} without key`);
    }
    if (!this.isNotarizedFile(file)) {
      return this.writeFile(file, await this.streamToBuffer(stream));
    }

    // directly piping a stream breaks with the s3 provider
    const asBuffer = await this.streamToBuffer(stream);
    const size = await this.provider.put(file.key, asBuffer);

    const fileHash = crypto.createHash(HASH_ALGORITHM);

    const hashStream = new Transform({
      transform(chunk, enc, cb) {
        fileHash.update(chunk);
        cb(null, chunk);
      },
    });

    pipeline(stream, hashStream, (err) => {
      // as hashStream is piped to the storage adapter writable streams,
      // errors are handled there. Anyway more recent versions of node require a callback
      // to be there, maybe there is a better way to safely pipe streams before sending them
      // to `put()` ?
      if (err) {
        this.logger.error(err);
      }
    });

    const fileDigest = `0x${fileHash.digest('hex')}`;
    const notarizedPayload = JSON.stringify({
      id: entityId,
      notarizedAt: file.notarization?.notarizedAt.toISOString(),
      digest: fileDigest,
    });
    if (notarizedPayload !== file.notarization.notarizedPayload) {
      error = `notarization payloads do not match`;
      this.logger.error(error);
    }
    const digest = `0x${hash(notarizedPayload, 'hex')}`;
    // const notarizedDigest = `0x${stringHash(notarizedPayload, 'hex')}`;
    if (digest !== file.notarization?.digest) {
      //await this.provider.delete(file.key);
      error = `File hash verification failed for entity: ${entityId} key: ${file.key}`;
      this.logger.error(error);
    }

    return {
      ...file,
      size,
      error,
      lastUpload: new Date(),
    };
  }

  getFile(file: StoredFileDTO) {
    if (!this.hasKey(file)) {
      throw new NotFoundException();
    }
    return this.provider.get(file.key);
  }

  async copyFile(from: StoredFileDTO, to: StoredFileDTO): Promise<StoredFileDTO> {
    if (!this.hasKey(from) || !this.hasKey(to)) {
      throw new NotFoundException('Copy file key not present');
    }
    await this.provider.copy(from.key, to.key);
    return { ...to, updatedAt: new Date() };
  }

  async listFiles(dir: string) {
    return this.provider.list(dir);
  }

  async checkFileExists(path: string) {
    return this.provider.checkFileExists(this.provider.absPath(path));
  }

  async compress(buf: Buffer | Readable, mimetype: string, filename: string, key: string) {
    switch (mimetype) {
      case 'application/pdf':
        await this.compressionProvider.compressPDF(filename, buf, key);
    }
  }

  async extractSinglePages(buf: Buffer | Readable, mimetype: string, filename: string, key: string) {
    switch (mimetype) {
      case 'application/pdf':
        await this.compressionProvider.extractAndSavePagesFromPDF(filename, buf, key);
    }
  }

  async countPDFPages(buf: Buffer): Promise<number> {
    return await this.compressionProvider.getPDFPagesCount(buf);
  }

  getBasePath() {
    return this.provider.basePath;
  }
}
