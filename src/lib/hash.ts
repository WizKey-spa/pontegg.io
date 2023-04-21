import { BinaryToTextEncoding, createHash } from 'crypto';

export const hash = (data: unknown, encoding: BinaryToTextEncoding = 'base64'): string =>
  createHash('sha256').update(JSON.stringify(data), 'utf8').digest(encoding);
