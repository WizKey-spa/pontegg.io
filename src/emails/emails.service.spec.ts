import { Test, TestingModule } from '@nestjs/testing';
import { EmailService } from './emails.service';
import { SentMessageInfo } from 'nodemailer';

export class EmailServiceFake {
  public async sendEmail(): Promise<SentMessageInfo> {
    return {
      accepted: ['test@mailhog.local'],
      rejected: [],
    };
  }
  public async sendHTMLEmail(): Promise<SentMessageInfo> {
    return {
      accepted: ['test@mailhog.local'],
      rejected: [],
    };
  }
}

describe('EmailsService', () => {
  let service: EmailService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        {
          provide: EmailService,
          useClass: EmailServiceFake,
        },
        {
          provide: 'transporter',
          useValue: jest.fn(),
        },
      ],
    }).compile();
    service = module.get<EmailService>(EmailService);
  });

  it('should sendEmail', async () => {
    const email = await service.sendEmail({
      from: 'test@ss.local',
      to: 'test@mailhog.local',
      subject: 'bla bal',
      text: 'test',
    });
    expect(email.accepted[0]).toEqual('test@mailhog.local');
    expect(email.rejected.length).toEqual(0);
  });
});
