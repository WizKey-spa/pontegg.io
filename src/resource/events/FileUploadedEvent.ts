import { IEvent } from '@nestjs/cqrs';
import { FileUpload } from '@Types/document';

export class FileUploadedEvent implements IEvent {
  constructor(public file: FileUpload, public key: string) {}
}
