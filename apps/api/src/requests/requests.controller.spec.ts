import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { RequestsController } from './requests.controller';
import { RequestsService } from './requests.service';

describe('RequestsController', () => {
  let controller: RequestsController;
  let service: RequestsService;

  const mockRequestsService = {
    getRequests: jest.fn(),
    getRequestStats: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RequestsController],
      providers: [
        {
          provide: RequestsService,
          useValue: mockRequestsService,
        },
      ],
    }).compile();

    controller = module.get<RequestsController>(RequestsController);
    service = module.get<RequestsService>(RequestsService);
    jest.clearAllMocks();
  });

  describe('getRequests', () => {
    it('should return paginated requests', async () => {
      const mockResponse = {
        data: [
          {
            id: 1,
            type: 'leave',
            status: 'pending',
            priority: 'high',
            submittedDate: new Date('2024-01-01'),
            reviewDate: null,
            description: 'Test request',
            scholar: { name: 'John Doe', email: 'john@example.com' },
            reviewer: null,
            hasAttachments: false,
            auditLogCount: 1,
          },
        ],
        pagination: {
          page: 1,
          limit: 20,
          totalItems: 1,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
      };

      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockRequestsService.getRequests.mockResolvedValue(mockResponse);

      const result = await controller.getRequests({ page: 1, limit: 20 }, mockRequest as any);

      expect(service.getRequests).toHaveBeenCalledWith({ page: 1, limit: 20 }, 'user-123');
      expect(result).toEqual(mockResponse);
    });

    it('should pass query parameters to service', async () => {
      const query = {
        page: 2,
        limit: 10,
        search: 'test',
        type: 'summer_funding_request' as const,
        status: 'pending' as const,
        priority: 'high' as const,
        sortBy: 'submittedDate' as const,
        sortOrder: 'asc' as const,
      };

      const mockRequest = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
        },
      };

      mockRequestsService.getRequests.mockResolvedValue({ data: [], pagination: {} });

      await controller.getRequests(query, mockRequest as any);

      expect(service.getRequests).toHaveBeenCalledWith(query, 'user-123');
    });
  });

  describe('getRequestStats', () => {
    it('should return request statistics', async () => {
      const mockStats = {
        total: 21,
        pending: 10,
        approved: 5,
        rejected: 3,
        reviewed: 2,
        commented: 1,
      };

      mockRequestsService.getRequestStats.mockResolvedValue(mockStats);

      const result = await controller.getRequestStats();

      expect(service.getRequestStats).toHaveBeenCalled();
      expect(result).toEqual(mockStats);
    });
  });
});
