import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { ValidatorService } from './validator.service';

@Module({
  imports: [ConfigModule],
  providers: [ValidatorService],
  exports: [ValidatorService],
})
export class ValidatorModule {}
