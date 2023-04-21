import { Readable } from 'stream';

export const fileToBlob = async (file) => new Blob([new Uint8Array(await file.arrayBuffer())], { type: file.type });

// https://www.npmjs.com/package/formdata-node
export class BlobFromStream {
  #stream;
  size: number;

  constructor(stream: Readable, size: number) {
    this.#stream = stream;
    this.size = size;
  }

  stream() {
    return this.#stream;
  }

  get [Symbol.toStringTag]() {
    return 'Blob';
  }
}
