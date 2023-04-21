import { EventsHandler, IEventHandler } from '@nestjs/cqrs';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { StorageService } from '../../storage/storage.service';
import { FileUploadedEvent } from './FileUploadedEvent';

@EventsHandler(FileUploadedEvent)
export class FileUploadedEventHandler implements IEventHandler<FileUploadedEvent> {
  constructor(
    private readonly storage: StorageService,
    @InjectPinoLogger(FileUploadedEventHandler.name)
    private readonly logger: PinoLogger,
  ) {}
  handle(evt: FileUploadedEvent) {
    const { file, key } = evt as FileUploadedEvent;
    // this.storage.compress(file.buffer, file.mimetype, file.originalname, key);
    this.storage.extractSinglePages(file.buffer, file.mimetype, file.originalname, key);
    this.logger.debug('FileUploaded event handling completed');
  }
}
