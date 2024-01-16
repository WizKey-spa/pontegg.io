import { ApiProperty } from '@nestjs/swagger';

import { Notarization } from '../common.dto';
import { StoredFile } from '@Types/document';
export class StoredFileDTO implements StoredFile {
  @ApiProperty()
  notarization?: Notarization;

  @ApiProperty()
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
  };

  @ApiProperty()
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };

  key: string | null;

  @ApiProperty()
  size?: number;

  @ApiProperty()
  hash256?: string;

  @ApiProperty()
  hashMd5?: string;

  createdAt?: Date;

  updatedAt?: Date;

  @ApiProperty()
  pageCount?: number;

  error?: string;
}
