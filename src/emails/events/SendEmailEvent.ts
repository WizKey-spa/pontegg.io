import { IEvent } from '@nestjs/cqrs';
import { SendMailOptions } from 'nodemailer';

export class SendEmailEvent implements IEvent {
  constructor(public msg: SendMailOptions) {}
}
