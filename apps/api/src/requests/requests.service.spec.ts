import { BadRequestException, ForbiddenException } from '@nestjs/common';
import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { EmailService } from '../email/email.service';
import { NotificationsService } from '../notifications/notifications.service';
import type { RequestType } from './request-types';
import { RequestsService } from './requests.service';

// Mock the database module
jest.mock('../db/connection');

describe('RequestsService', () => {
  let service: RequestsService;

  const mockEmailService = {
    sendRequestStatusNotification: jest.fn(),
  };

  const mockNotifications = {
    notifyRequestReceived: jest.fn().mockResolvedValue(undefined),
    notifyRequestStatusChanged: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: EmailService,
          useValue: mockEmailService,
        },
        {
          provide: NotificationsService,
          useValue: mockNotifications,
        },
      ],
    }).compile();

    service = module.get<RequestsService>(RequestsService);
    jest.clearAllMocks();
  });

  describe('getRequests', () => {
    it('should return paginated requests with default parameters', async () => {
      const mockRequestData = [
        {
          request: {
            id: '1',
            type: 'summer_funding_request',
            status: 'pending',
            priority: 'high',
            description: 'Test request',
            submittedDate: new Date('2024-01-01'),
            reviewDate: null,
            scholarId: '1',
            reviewedBy: null,
            reviewComment: null,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          scholar: {
            id: '1',
            userId: '1',
          },
          user: {
            id: '1',
            name: 'John Doe',
            email: 'john@example.com',
          },
        },
      ];

      const mockDatabase = require('../db/connection').database;

      let callCount = 0;
      mockDatabase.select = jest.fn().mockImplementation(() => {
        callCount++;

        if (callCount === 1) {
          // First call - check if user is super admin (staff query)
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockResolvedValue([{ isSuperAdmin: true }]),
            }),
          };
        } else if (callCount === 2) {
          // Second call - main query for requests
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest.fn().mockReturnValue({
                    orderBy: jest.fn().mockReturnValue({
                      limit: jest.fn().mockReturnValue({
                        offset: jest.fn().mockResolvedValue(mockRequestData),
                      }),
                    }),
                  }),
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Third call - count query
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest.fn().mockResolvedValue([{ count: 1 }]),
                }),
              }),
            }),
          };
        } else if (callCount === 4) {
          // Fourth call - attachments query
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        } else if (callCount === 5) {
          // Fifth call - audit logs query
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        } else {
          // Sixth call - assignees query (request_assignees join with users)
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                where: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
      });

      const result = await service.getRequests({}, 'user-123');

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].scholarName).toBe('John Doe');
    });

    it('keeps the pending-first order when sortBy is omitted and sorts by name when asked', async () => {
      const mockDatabase = require('../db/connection').database;
      const orderBy = jest.fn().mockReturnValue({
        limit: jest.fn().mockReturnValue({
          offset: jest.fn().mockResolvedValue([]),
        }),
      });
      let callCount = 0;
      mockDatabase.select = jest.fn().mockImplementation(() => {
        callCount += 1;
        if (callCount === 1) {
          return { from: () => ({ where: async () => [{ isSuperAdmin: true }] }) };
        }
        if (callCount === 2) {
          return {
            from: () => ({
              innerJoin: () => ({
                innerJoin: () => ({
                  where: () => ({ orderBy }),
                }),
              }),
            }),
          };
        }
        return {
          from: () => ({
            innerJoin: () => ({
              innerJoin: () => ({
                where: async () => [{ count: 0 }],
              }),
            }),
          }),
        };
      });

      const chunkText = (order: { queryChunks?: Array<{ value?: string[] }> }) =>
        (order.queryChunks ?? [])
          .flatMap((chunk) => (Array.isArray(chunk.value) ? chunk.value : []))
          .join('');

      await service.getRequests({}, 'user-123');
      expect(chunkText(orderBy.mock.calls[0]?.[0])).toContain('pending');

      callCount = 0;
      await service.getRequests({ sortBy: 'scholarName', sortOrder: 'asc' }, 'user-123');
      expect(chunkText(orderBy.mock.calls[1]?.[0])).not.toContain('pending');
    });
  });

  describe('getRequestStats', () => {
    const mockStats = [
      { status: 'pending', count: 10 },
      { status: 'approved', count: 5 },
      { status: 'rejected', count: 3 },
    ];

    function mockRequestStatsQueries({ isSuperAdmin }: { isSuperAdmin: boolean }) {
      const mockDatabase = require('../db/connection').database;
      const statsWhereMock = jest.fn().mockReturnValue({
        groupBy: jest.fn().mockResolvedValue(mockStats),
      });
      const assigneeWhereMock = jest.fn().mockReturnValue({ scopedToAssignee: true });

      const staffQuery = {
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ isSuperAdmin }]),
        }),
      };

      const assigneeSubquery = {
        from: jest.fn().mockReturnValue({
          where: assigneeWhereMock,
        }),
      };

      const statsQuery = {
        from: jest.fn().mockReturnValue({
          where: statsWhereMock,
        }),
      };

      mockDatabase.select = jest
        .fn()
        .mockReturnValueOnce(staffQuery)
        .mockReturnValueOnce(isSuperAdmin ? statsQuery : assigneeSubquery);

      if (!isSuperAdmin) {
        mockDatabase.select.mockReturnValueOnce(statsQuery);
      }

      return { assigneeWhereMock, statsWhereMock };
    }

    it('should return assigned request statistics for regular staff', async () => {
      const { assigneeWhereMock, statsWhereMock } = mockRequestStatsQueries({
        isSuperAdmin: false,
      });

      const result = await service.getRequestStats('user-123');

      expect(result.total).toBe(18);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(5);
      expect(result.rejected).toBe(3);
      expect(assigneeWhereMock).toHaveBeenCalled();
      expect(statsWhereMock).toHaveBeenCalled();
    });

    it('should return all active request statistics for super admins', async () => {
      const { assigneeWhereMock, statsWhereMock } = mockRequestStatsQueries({
        isSuperAdmin: true,
      });

      const result = await service.getRequestStats('super-admin-123');

      expect(result.total).toBe(18);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(5);
      expect(result.rejected).toBe(3);
      expect(assigneeWhereMock).not.toHaveBeenCalled();
      expect(statsWhereMock).toHaveBeenCalled();
    });

    it('should return zero counts when no visible requests match', async () => {
      const mockDatabase = require('../db/connection').database;

      mockDatabase.select = jest
        .fn()
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockResolvedValue([{ isSuperAdmin: true }]),
          }),
        })
        .mockReturnValueOnce({
          from: jest.fn().mockReturnValue({
            where: jest.fn().mockReturnValue({
              groupBy: jest.fn().mockResolvedValue([]),
            }),
          }),
        });

      const result = await service.getRequestStats('super-admin-123');

      expect(result).toEqual({
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        reviewed: 0,
        commented: 0,
      });
    });
  });

  describe('updateRequestStatus notifications', () => {
    function mockStatusUpdate(type: RequestType) {
      const mockDatabase = require('../db/connection').database;
      const currentRequest = {
        id: 'request-1',
        type,
        status: 'pending',
        description: 'Request description',
      };
      const updatedRequest = {
        ...currentRequest,
        status: 'commented',
        reviewComment: 'Please provide more information',
        updatedAt: new Date('2026-09-22T00:00:00.000Z'),
      };

      const reviewRow = [
        {
          request: currentRequest,
          scholar: { id: 'scholar-1' },
          user: {
            id: 'scholar-user-1',
            name: 'Test Scholar',
            email: 'scholar@example.com',
          },
        },
      ];
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue(
            Object.assign(Promise.resolve([{ isSuperAdmin: true }]), {
              limit: jest.fn().mockResolvedValue([{ id: 'request-1' }]),
            })
          ),
          innerJoin: jest.fn().mockReturnValue({
            innerJoin: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                limit: jest.fn().mockResolvedValue(reviewRow),
              }),
            }),
          }),
        }),
      });
      mockDatabase.update = jest.fn().mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([updatedRequest]),
          }),
        }),
      });
      mockDatabase.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockResolvedValue(undefined),
      });
    }

    it('emails scholars for request types visible in their portal', async () => {
      mockStatusUpdate('summer_funding_request');

      await service.updateRequestStatus(
        'request-1',
        'commented',
        'Please provide more information',
        'staff-1'
      );

      expect(mockEmailService.sendRequestStatusNotification).toHaveBeenCalledTimes(1);
    });

    it('rejects a rejection that has no reason', async () => {
      await expect(
        service.updateRequestStatus('request-1', 'rejected', '   ', 'staff-1')
      ).rejects.toBeInstanceOf(BadRequestException);
    });

    it('does not update a request the caller cannot review', async () => {
      const mockDatabase = require('../db/connection').database;
      mockDatabase.select = jest
        .fn()
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: async () => [{ id: 'request-1' }] }),
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: async () => [{ isSuperAdmin: false }],
          }),
        })
        .mockReturnValueOnce({
          from: () => ({
            where: () => ({ limit: async () => [] }),
          }),
        });
      mockDatabase.update = jest.fn();

      await expect(
        service.updateRequestStatus('request-1', 'approved', 'ok', 'staff-1')
      ).rejects.toBeInstanceOf(ForbiddenException);
      expect(mockDatabase.update).not.toHaveBeenCalled();
    });

    it('writes one audit row per request in a bulk update', async () => {
      const mockDatabase = require('../db/connection').database;
      const updatedAt = new Date('2026-09-22T00:00:00.000Z');
      const values = jest.fn().mockResolvedValue(undefined);
      mockDatabase.select = jest.fn().mockReturnValue({
        from: () => ({
          where: () =>
            Object.assign(Promise.resolve([{ isSuperAdmin: true }]), {
              limit: async () => [{ id: 'request-1' }],
            }),
          innerJoin: () => ({
            innerJoin: () => ({
              where: () => ({
                limit: async () => [
                  {
                    request: {
                      id: 'request-1',
                      type: 'others',
                      status: 'pending',
                      description: 'Request description',
                      scholarId: 'scholar-1',
                    },
                    scholar: { id: 'scholar-1' },
                    user: { name: 'Test Scholar', email: 'scholar@example.com' },
                  },
                ],
              }),
            }),
          }),
        }),
      });
      mockDatabase.update = jest.fn().mockReturnValue({
        set: () => ({
          where: () => ({
            returning: async () => [{ id: 'request-1', status: 'rejected', updatedAt }],
          }),
        }),
      });
      mockDatabase.insert = jest.fn().mockReturnValue({ values });

      await service.bulkUpdateRequestStatus(
        {
          ids: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
          status: 'rejected',
          comment: 'Missing documents',
        },
        'staff-1'
      );

      expect(values).toHaveBeenCalledTimes(2);
    });

    it.each(['summer_funding_report', 'requirement_submission', 'others'] as const)(
      'does not email scholars for hidden %s requests',
      async (type) => {
        mockStatusUpdate(type);

        await service.updateRequestStatus(
          'request-1',
          'commented',
          'Please provide more information',
          'staff-1'
        );

        expect(mockEmailService.sendRequestStatusNotification).not.toHaveBeenCalled();
      }
    );
  });
});
