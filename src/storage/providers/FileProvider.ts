import { Readable } from 'stream';

export interface FileProvider {
  basePath: string;
  absPath(path: string): string;
  get(key: string): Promise<Readable>;
  put(key: string, readable: Buffer | Readable): Promise<number>;
  delete(key: string): Promise<void>;
  copy(from: string, to: string): Promise<void>;
  list(dir: string): Promise<string[]>;
  checkFileExists(path: string): Promise<boolean>;
}
