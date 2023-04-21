import Pino, { Logger } from 'pino';
import { LoggerOptions } from 'pino';
import { trace, context } from '@opentelemetry/api';

export const loggerOptions: LoggerOptions = {
  level: process.env.LOGLEVEL || 'info',
  formatters: {
    level(label) {
      return { level: label };
    },
    log(object) {
      const span = trace.getSpan(context.active());
      if (!span) return { ...object };
      const spanId = trace.getSpan(context.active())?.spanContext().spanId;
      const traceId = trace.getSpan(context.active())?.spanContext().traceId;
      return { ...object, spanId, traceId };
    },
  },
};

export const logger: Logger = Pino(loggerOptions);
