'use strict';

import { Injectable, Inject, NotFoundException } from '@nestjs/common';
import { FileProvider } from './FileProvider';
import { join } from 'path';
import { ConfigService } from '@nestjs/config';
import { Readable } from 'stream';

import AWS from 'aws-sdk';
import { PinoLogger } from 'nestjs-pino';

const streamToBuffer = (stream: Readable): Promise<Buffer> => {
  const chunks: any[] = [];
  return new Promise((resolve, reject) => {
    stream.on('data', (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on('error', (err) => reject(err));
    stream.on('end', () => resolve(Buffer.concat(chunks)));
  });
};

@Injectable()
export class S3Provider implements FileProvider {
  public readonly basePath: string;
  private readonly bucket: string;
  constructor(
    @Inject(ConfigService) conf: ConfigService,
    private readonly logger: PinoLogger,
    private readonly s3: AWS.S3,
  ) {
    this.logger.setContext(S3Provider.name);
    this.basePath = conf.get('STORAGE_PATH');
    this.bucket = conf.get('STORAGE_S3_BUCKET');
    logger.info(`S3 config bucket: ${this.bucket}, provider: ${conf.get('STORAGE_PROVIDER')}`);
    logger.debug(JSON.stringify(s3.config));
  }
  public absPath = (key: string): string => join(this.basePath, key);

  // check file exits on s3
  public async checkFileExists(path: string): Promise<boolean> {
    try {
      await this.s3.headObject({ Key: path, Bucket: this.bucket }).promise();
      return Promise.resolve(true);
    } catch (e) {
      return Promise.resolve(true);
    }
  }

  private async getPage(prefix: string, continuationToken?: string) {
    const params = {
      Bucket: this.bucket,
      Prefix: prefix,
      ContinuationToken: continuationToken,
    };
    return this.s3.listObjectsV2(params).promise();
  }

  async get(key: string): Promise<Readable> {
    const path = this.absPath(key);
    this.logger.info('reads ' + path);
    const uploadParams = {
      Bucket: this.bucket,
      Key: path,
    };
    const doExists = await this.checkFileExists(path);
    if (!doExists) {
      throw new NotFoundException(`File ${path} not found`);
    }
    return await this.s3.getObject(uploadParams).createReadStream();
  }

  async put(key: string, data: Buffer) {
    const path = this.absPath(key);
    // makes sure thet we receive buffer data
    const buffer = data instanceof Buffer ? data : await streamToBuffer(data as any);

    this.logger.info(`Storing ${path} [${buffer?.length}] at ${this.bucket}`);

    const stored = await this.s3
      .putObject({
        Bucket: this.bucket,
        Key: path,
        Body: buffer,
      })
      .promise();
    if (!stored.ETag) {
      this.logger.error(`Failed to store ${path} ` + stored);
      throw Error(`S3 failed to store ${path}`);
    } else {
      this.logger.info(`Stored ETag:${stored.ETag}`);
    }

    return data.length;
  }

  async delete(key: string): Promise<void> {
    const path = this.absPath(key);
    const deleteParam = {
      Bucket: this.bucket,
      Key: path,
    };
    await this.s3.deleteObject(deleteParam).promise();
  }

  async copy(from: string, to: string) {
    const pathFrom = this.absPath(from);
    const pathTo = this.absPath(to);
    const params = {
      CopySource: `${this.bucket}/${pathFrom}`,
      Bucket: this.bucket,
      Key: pathTo,
    };
    // await this.checkFileExist(pathFrom);
    await this.s3.copyObject(params).promise();
  }

  async list(dir: string) {
    const items: string[] = [];
    let continuationToken = undefined;
    while (true) {
      const page: AWS.S3.ListObjectsV2Output = await this.getPage(dir, continuationToken);
      // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
      items.push(...page.Contents!.map(({ Key }) => Key!));
      continuationToken = page.NextContinuationToken;
      if (!continuationToken) {
        break;
      }
    }
    return items;
  }
}
