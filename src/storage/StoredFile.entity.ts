import { prop } from '@typegoose/typegoose';
import { ApiProperty } from '@nestjs/swagger';

import { Notarization } from '../common.dto';
import { StoredFile } from '@Types/document';
export class StoredFileDTO implements StoredFile {
  @prop({ _id: false })
  @ApiProperty()
  notarization?: Notarization;

  @prop()
  @ApiProperty()
  file: {
    fieldname: string;
    originalname: string;
    encoding: string;
    mimetype: string;
  };

  @prop()
  @ApiProperty()
  metadata?: {
    name?: string;
    description?: string;
    tags?: string[];
  };

  @prop({ type: String })
  key: string | null;

  @prop()
  @ApiProperty()
  size?: number;

  @prop()
  @ApiProperty()
  hash256?: string;

  @prop()
  @ApiProperty()
  hashMd5?: string;

  @prop()
  createdAt?: Date;

  @prop({ index: true })
  updatedAt?: Date;

  @prop()
  @ApiProperty()
  pageCount?: number;

  @prop()
  error?: string;
}
