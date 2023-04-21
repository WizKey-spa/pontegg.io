import { Injectable } from '@nestjs/common';
import { InjectPinoLogger, PinoLogger } from 'nestjs-pino';
import { Subject } from 'rxjs';

@Injectable()
export class CompressionProviderEventService {
  private readonly events: Subject<CompressionCompletedEvent>;
  constructor(@InjectPinoLogger(CompressionProviderEventService.name) private readonly logger: PinoLogger) {
    this.events = new Subject();
  }

  subscribe() {
    this.logger.debug(`Subscribing to event`);
    return this.events.asObservable();
  }

  async emit(documentId: string, compressed: boolean, creditId?: string) {
    const data = { data: { documentId, creditId, compressed } };
    this.events.next(data);
  }
}

export interface CompressionCompletedEvent {
  data: {
    documentId: string;
    creditId?: string;
    compressed: boolean;
  };
}
