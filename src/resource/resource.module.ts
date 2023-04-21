import { Module } from '@nestjs/common';

import { ValidatorModule } from '../validator/validator.module';
import ResourceQueryService from './resource.query.service';
@Module({
  imports: [ValidatorModule],
  providers: [ResourceQueryService],
  exports: [ResourceQueryService],
})
export class ResourceModule {}
