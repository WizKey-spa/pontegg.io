import { Injectable } from '@nestjs/common';
import { PinoLogger } from 'nestjs-pino';
import { SendMailOptions } from 'nodemailer';
import { ConfigService } from '@nestjs/config';

import { EmailService } from './emails.service';

@Injectable()
export class EmailDigestService {
  constructor(
    private readonly emailService: EmailService,
    private readonly logger: PinoLogger,
    private readonly config: ConfigService,
  ) {
    this.logger.setContext(EmailDigestService.name);
  }

  renderEmail(qas: any[], forAdmin = false) {
    const text = [`email header`, ''];
    qas.forEach((qa) => {
      text.push(`* ${qa.question}`);
      if (!forAdmin && qa.answers !== undefined && qa.answers.length > 0)
        text.push(`  ${qa.answers[qa.answers.length - 1].answer}`);
      text.push(``);
    });
    text.push('email footer');
    return text.join('\n');
  }

  async sendEmail(params: SendMailOptions) {
    return await this.emailService.sendEmail(params);
  }
}
