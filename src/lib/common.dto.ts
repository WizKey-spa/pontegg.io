import { ApiProperty } from '@nestjs/swagger';
import { prop } from '@typegoose/typegoose';
import { Type } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';

export class Notarization {
  @prop()
  @ApiProperty()
  @IsString()
  notarizedPayload!: string;

  @prop()
  @ApiProperty()
  @IsString()
  digest!: string;

  @prop()
  @ApiProperty()
  @IsString()
  notarizedAt!: Date;

  @prop()
  @ApiProperty()
  @IsString()
  transactionId!: string;
}

export class BasicCursor {
  @ApiProperty()
  @IsNumber()
  @Min(1)
  @Max(10000)
  @IsOptional()
  @Type(() => Number)
  limit?: number;
}

export class Cursor<T, K extends keyof T> {
  @ApiProperty({ type: 'string' })
  field!: K;
  @ApiProperty({ type: 'string' })
  from?: T[K];
  @ApiProperty({ type: 'number' })
  limit?: number;
}
export interface CursorResult<T, K extends keyof T> {
  items: T[];
  cursor: Cursor<T, K>;
  hasMore: boolean;
}

export class CursorDTO extends BasicCursor {
  @ApiProperty()
  // @IsEnum(Documents.DocumentCursorFieldEnum)
  @IsOptional()
  field: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  from?: string;
}
