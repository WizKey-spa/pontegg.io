export interface Notarization {
  notarizedPayload: string;
  digest: string;
  notarizedAt: Date;
  transactionId: string;
}

export interface FileData {
  fieldname: string;
  originalname: string;
  encoding: string;
  mimetype: string;
}

export type FileUpload = FileData & { buffer: Buffer };

export interface FileMetadata {
  name?: string;
  description?: string;
  tags?: string[];
}

export interface StoredFile {
  file: FileData;
  key: string;
  size?: number;
  createdAt?: Date;
  updatedAt?: Date;
  pageCount?: number;
  hash256?: string;
  hashMd5?: string;
  metadata?: FileMetadata;
  notarization?: Notarization;
}

export type DocumentRequest = FileMetadata & {
  path?: string;
};
