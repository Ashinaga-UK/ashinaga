import { Test } from '@nestjs/testing';
import { database } from '../db/connection';
import { EmailService } from '../email/email.service';
import { NotificationsService } from './notifications.service';

const insertReturning = jest.fn();
const selectLimit = jest.fn();
const deleteWhere = jest.fn();

jest.mock('../db/connection', () => ({
  database: {
    insert: jest.fn(() => ({
      values: jest.fn(() => ({
        onConflictDoNothing: jest.fn(() => ({
          returning: insertReturning,
        })),
      })),
    })),
    delete: jest.fn(() => ({
      where: deleteWhere,
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

const recipient = {
  userId: 'user-1',
  name: 'Ada',
  email: 'ada@example.com',
  programStage: 'prep_year' as const,
};

const feedback = {
  scholarId: 'scholar-1',
  stepKey: 'topic' as const,
  action: 'approve' as const,
  eventId: 'comment-1',
  comment: 'Looks good',
};

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
    selectLimit.mockResolvedValue([recipient]);
    insertReturning.mockResolvedValueOnce([{ id: 'delivery-1' }]).mockResolvedValueOnce([]);

    await service.notifyProposalFeedback(feedback);
    await service.notifyProposalFeedback(feedback);

    expect(emailService.sendEmail).toHaveBeenCalledTimes(1);
    expect(emailService.sendEmail).toHaveBeenCalledWith(
      expect.objectContaining({
        to: 'ada@example.com',
        subject: 'Topic and research question approved',
      })
    );
    expect(database.delete).not.toHaveBeenCalled();
  });

  it('releases the ledger row when send fails so the same event can retry', async () => {
    selectLimit.mockResolvedValue([recipient]);
    insertReturning.mockResolvedValue([{ id: 'delivery-1' }]);
    emailService.sendEmail
      .mockRejectedValueOnce(new Error('resend down'))
      .mockResolvedValueOnce(undefined);

    await expect(service.notifyProposalFeedback(feedback)).rejects.toThrow(
      'Failed to send proposal feedback'
    );
    expect(database.delete).toHaveBeenCalled();
    expect(deleteWhere).toHaveBeenCalled();

    await service.notifyProposalFeedback(feedback);
    expect(emailService.sendEmail).toHaveBeenCalledTimes(2);
  });
});
