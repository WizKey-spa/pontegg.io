'use strict';

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { FileProvider } from './FileProvider';
import { ConfigService } from '@nestjs/config';
import { join, dirname } from 'path';
import { createReadStream, promises, createWriteStream, access } from 'fs';
import { Readable, pipeline } from 'stream';
import { promisify } from 'util';
import { PinoLogger } from 'nestjs-pino';
import { R_OK } from 'constants';

const accessAsync = promisify(access);

const isReadable = async (path: string) => {
  try {
    await accessAsync(path, R_OK);
    return true;
  } catch {
    return false;
  }
};

@Injectable()
export class LocalProvider implements FileProvider {
  public readonly basePath: string;

  constructor(@Inject(ConfigService) conf: ConfigService, private readonly logger: PinoLogger) {
    this.logger.setContext(LocalProvider.name);
    this.basePath = conf.get('STORAGE_PATH');
  }

  public absPath = (key: string): string => join(this.basePath, key);

  async get(key: string): Promise<Readable> {
    const path = this.absPath(key);
    this.logger.debug('read ' + path);
    if (!(await isReadable(path))) {
      throw new NotFoundException();
    }
    return createReadStream(path);
  }

  private async writeBuffer(path: string, buf: Buffer) {
    await promises.writeFile(path, buf);
    return buf.byteLength;
  }

  private async writeStream(path: string, readStream: Readable): Promise<number> {
    const writeStream = createWriteStream(path);
    return new Promise((resolve, reject) => {
      pipeline(readStream, writeStream, (err) => (err ? reject(err) : resolve(writeStream.bytesWritten)));
    });
  }

  async put(key: string, data: Buffer | Readable) {
    const path = this.absPath(key);
    const dirName = dirname(path);
    const dirDoExist = await isReadable(dirName);
    if (!dirDoExist) {
      await promises.mkdir(dirName, { recursive: true });
    }
    this.logger.debug('put ' + path);
    return data instanceof Buffer ? this.writeBuffer(path, data) : this.writeStream(path, data);
  }

  async delete(key: string): Promise<void> {
    const path = this.absPath(key);
    this.logger.debug('delete ' + path);
    return promises.unlink(path);
  }

  async copy(from: string, to: string) {
    const destPath = this.absPath(to);
    await promises.mkdir(dirname(destPath), { recursive: true });
    return promises.copyFile(this.absPath(from), destPath);
  }

  async list(dir: string) {
    if (await isReadable(dir)) {
      const names = await promises.readdir(dir);
      return names.map((name) => join(dir, name));
    } else {
      return [];
    }
  }

  async checkFileExists(path: string): Promise<boolean> {
    return isReadable(path);
  }
}
