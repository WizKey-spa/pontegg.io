import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean, IsEnum, IsNumber, IsOptional, IsString, Max, Min } from 'class-validator';
import { Type } from 'class-transformer';

export enum NotarizationStatus {
  Pending = 'NOTARIZATION_PENDING',
  Complete = 'NOTARIZATION_COMPLETE',
  Failed = 'NOTARIZATION_FAILED',
  Dismissed = 'NOTARIZATION_DISMISSED',
}

// eslint-disable-next-line max-classes-per-file
export class Notarization {
  @ApiProperty()
  @IsString()
  notarizedPayload!: string;

  @ApiProperty()
  @IsString()
  digest!: string;

  @ApiProperty()
  @IsString()
  notarizedAt!: Date;

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

export class PendingUserActionQueryDTO extends BasicCursor {
  // TODO: this should actually be called `notarizationStatus`
  @ApiProperty()
  @IsOptional()
  @IsEnum(NotarizationStatus)
  notarizationMessage!: NotarizationStatus;

  @ApiProperty()
  @IsBoolean()
  @IsOptional()
  @Type(() => Boolean)
  init?: boolean;

  @ApiProperty()
  @IsString()
  @IsOptional()
  portfolioName?: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  from?: string;
}

// eslint-disable-next-line max-classes-per-file
export class Cursor<T, K extends keyof T> {
  @ApiProperty({ type: 'string' })
  field!: K;
  @ApiProperty({ type: 'string' })
  from?: T[K];
  @ApiProperty({ type: 'number' })
  limit?: number;
}
