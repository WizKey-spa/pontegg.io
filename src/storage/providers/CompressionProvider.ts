import { Inject, Injectable } from '@nestjs/common';
import { promisify } from 'util';
import { exec } from 'child_process';
import { ConfigService } from '@nestjs/config';
import { PinoLogger } from 'nestjs-pino';
import { Readable } from 'stream';
import { FileProvider } from './FileProvider';
import { LocalProvider } from './LocalProvider';
import { CompressionProviderEventService } from '../events/CompressionProviderEventService';
import { PDFDocument } from 'pdf-lib';

const prExec = promisify(exec);

@Injectable()
export class CompressionProvider {
  private readonly provider: FileProvider;
  private readonly basePath: string;
  constructor(
    @Inject(ConfigService) conf: ConfigService,
    private readonly logger: PinoLogger,
    @Inject('FILE_PROVIDER') private readonly storageProvider: FileProvider,
    @Inject(CompressionProviderEventService) private readonly eventService: CompressionProviderEventService,
  ) {
    this.logger.setContext(CompressionProvider.name);
    this.provider = new LocalProvider(conf, logger);
    this.provider.basePath = conf.get('LOCAL_STORAGE_PATH');
    this.basePath = conf.get('LOCAL_STORAGE_PATH');
  }

  public async compressPDF(filename: string, buf: Buffer | Readable, key: string) {
    this.logger.debug(`Compressing file ${filename} and saving the result in ${key}`);
    await this.saveTemp(filename, buf);
    //await this.provider.put(`tmp/${filename}`, buf);
    const comprFilename = await this.gsCompress(filename);
    await this.storageProvider.put(key + '-preview', await this.readCompress(comprFilename));
    await this.removeTemp(filename);
    await this.removeCompressed(comprFilename);
    const splitKey = key.split('/');
    if (splitKey.length > 2) this.eventService.emit(splitKey[splitKey.length - 1], true, splitKey[splitKey.length - 2]);
    else this.eventService.emit(splitKey[splitKey.length - 1], true);
    this.logger.debug(`File ${filename} compressed`);
  }

  public async extractAndSavePagesFromPDF(filename: string, buf: Buffer | Readable, key: string) {
    buf = buf as Buffer;
    const ab = this.getArrayBufferFromBuffer(buf);
    const doc = await PDFDocument.load(ab);
    const pages = doc.getPages();
    pages.forEach(async (page, index) => {
      const destDoc = await PDFDocument.create();
      const [copiedPage] = await destDoc.copyPages(doc, [index]);
      destDoc.addPage(copiedPage);
      this.storageProvider.put(`${key}-page${index + 1}`, Buffer.from(await destDoc.save()));
    });
    console.log(pages.length);
  }

  private getArrayBufferFromBuffer(buf: Buffer): ArrayBuffer {
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }

  public async getPDFPagesCount(buf: Buffer): Promise<number> {
    const ab = this.getArrayBufferFromBuffer(buf);
    const doc = await PDFDocument.load(ab);
    return doc.getPageCount();
  }

  private async saveTemp(filename: string, buf: Buffer | Readable) {
    try {
      await this.provider.put(`tmp/${filename}`, buf);
    } catch (e) {
      this.logger.debug(JSON.stringify(e));
    }
  }

  private async removeTemp(filename: string) {
    await this.provider.delete(`tmp/${filename}`);
  }

  private async gsCompress(filename: string): Promise<string> {
    const outPath = `${this.basePath}/tmp/${filename}_compr.pdf`;
    const command = `gs -q -dNOPAUSE -dBATCH -dSAFER \
    -sDEVICE=pdfwrite \
    -dCompatibilityLevel=1.3 \
    -dPDFSETTINGS=/screen \
    -dEmbedAllFonts=true -dSubsetFonts=true \
    -dColorImageDownsampleType=/Bicubic \
    -dColorImageResolution=100 \
    -dGrayImageDownsampleType=/Bicubic \
    -dGrayImageResolution=144 \
    -dMonoImageDownsampleType=/Subsample \
    -dMonoImageResolution=144 \
    -sOutputFile=${outPath} \
    ${this.basePath}/tmp/${filename}`;
    const { stdout } = await prExec(command);
    this.logger.debug(command);
    this.logger.debug(stdout);
    return `${filename}_compr.pdf`;
  }

  private async readCompress(filename: string) {
    return this.provider.get(`tmp/${filename}`);
  }

  private async removeCompressed(filename: string) {
    await this.provider.delete(`tmp/${filename}`);
  }
}
