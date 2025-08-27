import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RequestsService } from './requests.service';
import { EmailService } from '../email/email.service';

// Mock the database module
jest.mock('../db/connection');

describe('RequestsService', () => {
  let service: RequestsService;

  const mockEmailService = {
    sendRequestStatusNotification: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RequestsService,
        {
          provide: EmailService,
          useValue: mockEmailService,
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
            type: 'financial_support',
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
          // First call - main query for requests
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
        } else if (callCount === 2) {
          // Second call - count query
          return {
            from: jest.fn().mockReturnValue({
              innerJoin: jest.fn().mockReturnValue({
                innerJoin: jest.fn().mockReturnValue({
                  where: jest.fn().mockResolvedValue([{ count: 1 }]),
                }),
              }),
            }),
          };
        } else if (callCount === 3) {
          // Third call - attachments query
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        } else {
          // Fourth call - audit logs query
          return {
            from: jest.fn().mockReturnValue({
              where: jest.fn().mockReturnValue({
                orderBy: jest.fn().mockResolvedValue([]),
              }),
            }),
          };
        }
      });

      const result = await service.getRequests({});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].scholarName).toBe('John Doe');
    });
  });

  describe('getRequestStats', () => {
    it('should return aggregated statistics', async () => {
      const mockStats = [
        { status: 'pending', count: 10 },
        { status: 'approved', count: 5 },
        { status: 'rejected', count: 3 },
      ];

      const mockDatabase = require('../db/connection').database;
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          groupBy: jest.fn().mockResolvedValue(mockStats),
        }),
      });

      const result = await service.getRequestStats();

      expect(result.total).toBe(18);
      expect(result.pending).toBe(10);
      expect(result.approved).toBe(5);
      expect(result.rejected).toBe(3);
    });
  });
});
