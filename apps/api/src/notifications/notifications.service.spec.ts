import { Test } from '@nestjs/testing';
import { EmailService } from '../email/email.service';
import { NotificationsService } from './notifications.service';

const insertReturning = jest.fn();
const selectLimit = jest.fn();

jest.mock('../db/connection', () => ({
  database: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
    select: jest.fn(() => ({
      from: jest.fn(() => ({
        innerJoin: jest.fn(() => ({
          where: jest.fn(() => ({
            limit: selectLimit,
          })),
        })),
      })),
    })),
  },
}));

describe('NotificationsService', () => {
  let service: NotificationsService;
  const emailService = { sendEmail: jest.fn() };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module = await Test.createTestingModule({
      providers: [NotificationsService, { provide: EmailService, useValue: emailService }],
    }).compile();
    service = module.get(NotificationsService);
  });

  it('sends proposal feedback once per event id', async () => {
    selectLimit.mockResolvedValue([
      {
        userId: 'user-1',
        name: 'Ada',
        email: 'ada@example.com',
        programStage: 'prep_year',
      },
    ]);
    insertReturning.mockResolvedValueOnce([{ id: 'delivery-1' }]).mockResolvedValueOnce([]);

    await service.notifyProposalFeedback({
      scholarId: 'scholar-1',
      stepKey: 'topic',
      action: 'approve',
      eventId: 'comment-1',
      comment: 'Looks good',
    });
    await service.notifyProposalFeedback({
      scholarId: 'scholar-1',
      stepKey: 'topic',
      action: 'approve',
      eventId: 'comment-1',
      comment: 'Looks good',
    });

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        subject: 'Topic and research question approved',
      })
    );
  });
});
