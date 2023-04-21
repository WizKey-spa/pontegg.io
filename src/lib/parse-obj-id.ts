import { PipeTransform, BadRequestException } from '@nestjs/common';
import { ObjectId } from 'mongodb';

export class ParseObjId implements PipeTransform<string, ObjectId> {
  transform(value: string): ObjectId {
    try {
      return new ObjectId(value);
    } catch (e) {
      throw new BadRequestException(e);
    }
  }
}

export const objId = new ParseObjId();
