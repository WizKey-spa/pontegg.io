import path from 'path';
import { Inject, Injectable } from '@nestjs/common';
import { filter, flatMap } from 'rxjs/operators';
import { PinoLogger } from 'nestjs-pino';
import { EventBus } from '@nestjs/cqrs';

import Email from 'email-templates';

import { SendEmailEvent } from './events/SendEmailEvent';
import { SendMailOptions, SentMessageInfo, Transporter } from 'nodemailer';

@Injectable()
export class EmailService {
  constructor(
    private readonly eventBus: EventBus,
    private readonly logger: PinoLogger,
    @Inject('transporter') private readonly transporter: Transporter,
  ) {
    this.logger.setContext(EmailService.name);
    this.eventBus
      .pipe(
        filter((evt) => evt instanceof SendEmailEvent),
        flatMap((evt) => {
          const { msg } = evt as SendEmailEvent;
          return this.sendEmail(msg);
        }),
      )
      .subscribe();
  }

  public async sendEmail(params: SendMailOptions): Promise<SentMessageInfo> {
    try {
      return await this.transporter.sendMail(params as SendMailOptions);
    } catch (err) {
      this.logger.error(`${err as Error} with params: ${JSON.stringify(params)}`);
      throw err;
    }
  }

  public async sendHTMLEmail(params: SendMailOptions, locals: any, template_name: string): Promise<SentMessageInfo> {
    const template = path.join(__dirname, 'templates', template_name);
    const email = new Email({ views: { root: template } });
    const html = await email.render(template, locals);
    try {
      return this.transporter.sendMail({ ...params, html } as SendMailOptions);
    } catch (err) {
      this.logger.error(`${err as Error} with params: ${JSON.stringify(params)}`);
      throw err;
    }
  }
}
