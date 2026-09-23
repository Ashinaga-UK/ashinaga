import { BadRequestException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { database } from '../db/connection';
import { EmailService } from '../email/email.service';
import { SCHOLAR_FEED_KINDS, STAFF_FEED_KINDS } from './notification-kinds';
import { NotificationsService } from './notifications.service';

const insertReturning = jest.fn();
const selectLimit = jest.fn();
const deleteWhere = jest.fn();
const updateReturning = jest.fn();
const feedSelectResult = jest.fn();
const countResult = jest.fn();

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
    update: jest.fn(() => ({
      set: jest.fn(() => ({
        where: jest.fn(() => ({
          returning: updateReturning,
        })),
      })),
    })),
    select: jest.fn((selection?: Record<string, unknown>) => {
      if (selection && 'value' in selection) {
        return {
          from: jest.fn(() => ({
            where: countResult,
          })),
        };
      }
      return {
        from: jest.fn(() => ({
          innerJoin: jest.fn(() => ({
            where: jest.fn(() => ({
              limit: selectLimit,
            })),
          })),
          where: jest.fn(() => ({
            orderBy: jest.fn(() => ({
              limit: jest.fn(() => ({
                offset: feedSelectResult,
              })),
            })),
            limit: selectLimit,
          })),
        })),
      };
    }),
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

  it('inserts staff feed rows with conflict-safe dedupe', async () => {
    insertReturning.mockResolvedValue([{ id: 'n1' }, { id: 'n2' }]);

    const created = await service.createStaffNotifications([
      {
        recipientUserId: 'staff-1',
        kind: STAFF_FEED_KINDS.requestReceived,
        title: 'New request from Ada',
        body: 'Ada submitted a request',
        scholarId: 'scholar-1',
        scholarName: 'Ada',
        entityType: 'request',
        entityId: 'req-1',
        href: '/?tab=requests&search=Ada&requestId=req-1',
        requestType: 'summer_funding_request',
        dedupeSuffix: 'created',
      },
      {
        recipientUserId: 'staff-2',
        kind: STAFF_FEED_KINDS.requestReceived,
        title: 'New request from Ada',
        body: 'Ada submitted a request',
        scholarId: 'scholar-1',
        scholarName: 'Ada',
        entityType: 'request',
        entityId: 'req-1',
        href: '/?tab=requests&search=Ada&requestId=req-1',
        requestType: 'summer_funding_request',
        dedupeSuffix: 'created',
      },
    ]);

    expect(created).toBe(2);
    expect(database.insert).toHaveBeenCalled();
  });

  it('returns an empty create count when no recipients are provided', async () => {
    await expect(service.createStaffNotifications([])).resolves.toBe(0);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('marks selected unread notifications as read for the recipient only', async () => {
    updateReturning.mockResolvedValue([{ id: 'n1' }]);

    await expect(service.markStaffNotificationsRead('staff-1', { ids: ['n1'] })).resolves.toEqual({
      updated: 1,
    });
    expect(database.update).toHaveBeenCalled();
  });

  it('rejects mark-read payloads that are neither ids nor all', async () => {
    await expect(service.markStaffNotificationsRead('staff-1', {})).rejects.toBeInstanceOf(
      BadRequestException
    );
  });

  it('loads the staff feed with unreadCount for the current user', async () => {
    const createdAt = new Date('2026-09-18T12:00:00.000Z');
    feedSelectResult.mockResolvedValue([
      {
        id: 'n1',
        kind: STAFF_FEED_KINDS.taskCompleted,
        title: 'Ada completed a task',
        body: 'Ada completed "Essay"',
        scholarId: 'scholar-1',
        scholarName: 'Ada',
        entityType: 'task',
        entityId: 'task-1',
        href: '/?tab=scholars&view=scholar-profile&scholarId=scholar-1&scholarTab=tasks',
        requestType: null,
        readAt: null,
        createdAt,
      },
    ]);
    countResult.mockResolvedValueOnce([{ value: 1 }]).mockResolvedValueOnce([{ value: 3 }]);

    await expect(service.getStaffFeed('staff-1', { page: 1, limit: 20 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'n1',
          kind: STAFF_FEED_KINDS.taskCompleted,
          scholarName: 'Ada',
          readAt: null,
        }),
      ],
      total: 1,
      unreadCount: 3,
      page: 1,
      limit: 20,
    });
  });

  it('dedupes task_completed notifications by completion timestamp', async () => {
    const createSpy = jest.spyOn(service, 'createStaffNotifications').mockResolvedValue(1);
    jest
      .spyOn(
        service as never as { activeStaffUserIds: () => Promise<string[]> },
        'activeStaffUserIds'
      )
      .mockResolvedValue(['staff-1']);
    const completedAt = new Date('2026-09-21T12:00:00.000Z');

    await service.notifyTaskCompleted({
      taskId: 'task-1',
      taskTitle: 'Essay',
      scholarId: 'scholar-1',
      scholarName: 'Ada',
      completedAt,
    });

    expect(createSpy).toHaveBeenCalledWith([
      expect.objectContaining({
        recipientUserId: 'staff-1',
        kind: STAFF_FEED_KINDS.taskCompleted,
        dedupeSuffix: completedAt.toISOString(),
      }),
    ]);

    createSpy.mockRestore();
  });

  it('keeps only active staff when building request notification audiences', async () => {
    const whereResults = [[{ userId: 'active-assignee' }], [{ userId: 'super-admin' }]];
    let whereCall = 0;
    const selectMock = database.select as jest.Mock;
    const previousImpl = selectMock.getMockImplementation();
    selectMock.mockImplementation(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() => Promise.resolve(whereResults[whereCall++] ?? [])),
      })),
    }));

    try {
      const recipients = await (
        service as never as { requestAudienceUserIds: (ids: string[]) => Promise<string[]> }
      ).requestAudienceUserIds(['active-assignee', 'inactive-assignee']);

      expect(recipients.sort()).toEqual(['active-assignee', 'super-admin'].sort());
    } finally {
      if (previousImpl) {
        selectMock.mockImplementation(previousImpl);
      } else {
        selectMock.mockReset();
      }
    }
  });

  it('inserts scholar feed rows with conflict-safe dedupe', async () => {
    insertReturning.mockResolvedValue([{ id: 'sn1' }]);

    const created = await service.createScholarNotifications([
      {
        recipientUserId: 'scholar-user-1',
        kind: SCHOLAR_FEED_KINDS.taskAssigned,
        title: 'New task assigned',
        body: 'Submit transcript',
        entityType: 'task',
        entityId: 'task-1',
        href: '/tasks',
      },
    ]);

    expect(created).toBe(1);
    expect(database.insert).toHaveBeenCalled();
  });

  it('loads the scholar feed with unreadCount for the current user', async () => {
    const createdAt = new Date('2026-09-23T12:00:00.000Z');
    feedSelectResult.mockResolvedValue([
      {
        id: 'sn1',
        kind: SCHOLAR_FEED_KINDS.resourceLive,
        title: 'New resource available',
        body: 'Handbook',
        entityType: 'resource',
        entityId: 'resource-1',
        href: '/resources',
        readAt: null,
        createdAt,
      },
    ]);
    countResult.mockResolvedValueOnce([{ value: 1 }]).mockResolvedValueOnce([{ value: 2 }]);

    await expect(service.getScholarFeed('scholar-user-1', { page: 1, limit: 20 })).resolves.toEqual({
      items: [
        expect.objectContaining({
          id: 'sn1',
          kind: SCHOLAR_FEED_KINDS.resourceLive,
          body: 'Handbook',
          readAt: null,
        }),
      ],
      total: 1,
      unreadCount: 2,
      page: 1,
      limit: 20,
    });
  });

  it('marks selected unread scholar notifications as read', async () => {
    updateReturning.mockResolvedValue([{ id: 'sn1' }]);

    await expect(
      service.markScholarNotificationsRead('scholar-user-1', { ids: ['sn1'] })
    ).resolves.toEqual({ updated: 1 });
    expect(database.update).toHaveBeenCalled();
  });

  it('builds task assignment notifications for each assigned scholar', async () => {
    const createSpy = jest.spyOn(service, 'createScholarNotifications').mockResolvedValue(1);
    const selectMock = database.select as jest.Mock;
    const previousImpl = selectMock.getMockImplementation();
    selectMock.mockImplementation(() => ({
      from: jest.fn(() => ({
        where: jest.fn(() =>
          Promise.resolve([
            { scholarId: 'scholar-1', userId: 'user-1' },
            { scholarId: 'scholar-2', userId: 'user-2' },
          ])
        ),
      })),
    }));

    try {
      await service.notifyTaskAssigned({
        assignments: [
          { taskId: 'task-1', scholarId: 'scholar-1', title: 'Essay' },
          { taskId: 'task-2', scholarId: 'scholar-2', title: 'Essay' },
        ],
      });

      expect(createSpy).toHaveBeenCalledWith([
        expect.objectContaining({
          recipientUserId: 'user-1',
          kind: SCHOLAR_FEED_KINDS.taskAssigned,
          entityId: 'task-1',
          href: '/tasks',
        }),
        expect.objectContaining({
          recipientUserId: 'user-2',
          kind: SCHOLAR_FEED_KINDS.taskAssigned,
          entityId: 'task-2',
        }),
      ]);
    } finally {
      createSpy.mockRestore();
      if (previousImpl) {
        selectMock.mockImplementation(previousImpl);
      } else {
        selectMock.mockReset();
      }
    }
  });
});
