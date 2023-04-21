import { PipeTransform, Injectable, ArgumentMetadata, BadRequestException } from '@nestjs/common';
import Ajv from 'ajv';

@Injectable()
export class JSONSchemaValidationPipe implements PipeTransform {
  constructor(private validator: Ajv) {}

  transform(value: any, { data }: ArgumentMetadata) {
    // TODO: check validate
    const valid = this.validator.validate(data, value);
    if (!valid) {
      throw new BadRequestException(this.validator.errorsText());
    }
    return value;
  }
}
