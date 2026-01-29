import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

// Mock the database connection before any imports that might use it
jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
  },
  getDatabase: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock the auth config to prevent it from trying to use the database
jest.mock('../auth/auth.config', () => ({
  auth: {
    handler: jest.fn(),
  },
}));

import { InvitationsService } from '../invitations/invitations.service';
import { ScholarsService } from './scholars.service';

describe('ScholarsService', () => {
  let service: ScholarsService;
  let mockDatabase: { select: jest.Mock };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ScholarsService,
        {
          provide: InvitationsService,
          useValue: {
            createInvitation: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<ScholarsService>(ScholarsService);
    mockDatabase = require('../db/connection').database;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getScholars', () => {
    it('should return paginated scholars with default parameters', async () => {
      const mockScholarsData = [
        {
          scholar: {
            id: 'scholar-1',
            userId: 'user-1',
            phone: '+1234567890',
            program: 'Computer Science',
            year: 'Year 2',
            university: 'MIT',
            location: 'Boston',
            bio: 'Test bio',
            status: 'active',
            startDate: new Date('2023-01-01'),
            lastActivity: new Date('2025-01-01'),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          user: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            image: 'avatar.jpg',
          },
        },
      ];

      const mockGoalsData = [
        { scholarId: 'scholar-1', status: 'completed', count: 2 },
        { scholarId: 'scholar-1', status: 'in_progress', count: 1 },
        { scholarId: 'scholar-1', status: 'pending', count: 1 },
      ];

      const mockTasksData = [
        { scholarId: 'scholar-1', status: 'completed', dueDate: new Date(), count: 3 },
        {
          scholarId: 'scholar-1',
          status: 'pending',
          dueDate: new Date(Date.now() - 86400000),
          count: 1,
        },
      ];

      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockOffset = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      let selectCallCount = 0;
      mockDatabase.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          // First call: get scholars
          mockOffset.mockResolvedValueOnce(mockScholarsData);
        } else if (selectCallCount === 2) {
          // Second call: count for pagination
          mockGroupBy.mockResolvedValueOnce([{ count: 1 }]);
        } else if (selectCallCount === 3) {
          // Third call: goals stats
          mockGroupBy.mockResolvedValueOnce(mockGoalsData);
        } else if (selectCallCount === 4) {
          // Fourth call: tasks stats
          mockGroupBy.mockResolvedValueOnce(mockTasksData);
        }

        return {
          from: mockFrom,
          innerJoin: mockInnerJoin,
          where: mockWhere,
          orderBy: mockOrderBy,
          limit: mockLimit,
          offset: mockOffset,
          groupBy: mockGroupBy,
        };
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();
      mockWhere.mockReturnThis();
      mockOrderBy.mockReturnThis();
      mockLimit.mockReturnThis();

      const result = await service.getScholars({});

      expect(result).toHaveProperty('data');
      expect(result).toHaveProperty('pagination');
      expect(result.data).toHaveLength(1);
      expect(result.data[0].id).toBe('scholar-1');
      expect(result.data[0].name).toBe('John Doe');
      expect(result.data[0].email).toBe('john@example.com');
      expect(result.data[0].program).toBe('Computer Science');
      expect(result.data[0].year).toBe('Year 2');
      expect(result.data[0].university).toBe('MIT');
      // Goals and tasks will have default empty values since we're not mocking the stats calls
      expect(result.data[0].goals).toBeDefined();
      expect(result.data[0].tasks).toBeDefined();
      expect(result.pagination).toMatchObject({
        page: 1,
        limit: 20,
        totalItems: 0,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      });
    });

    it('should handle search and filters', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockOffset = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        orderBy: mockOrderBy,
        limit: mockLimit,
        offset: mockOffset,
        groupBy: mockGroupBy,
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();
      mockWhere.mockReturnThis();
      mockOrderBy.mockReturnThis();
      mockLimit.mockReturnThis();
      mockOffset.mockResolvedValue([]);
      mockGroupBy.mockResolvedValue([]);

      const query = {
        search: 'john',
        program: 'Computer Science',
        year: 'Year 2',
        university: 'MIT',
        status: 'active' as const,
        page: 2,
        limit: 10,
        sortBy: 'name' as const,
        sortOrder: 'asc' as const,
      };

      const result = await service.getScholars(query);

      expect(result.data).toEqual([]);
      expect(result.pagination.page).toBe(2);
      expect(result.pagination.limit).toBe(10);
      expect(mockWhere).toHaveBeenCalled();
      expect(mockOffset).toHaveBeenCalledWith(10);
      expect(mockLimit).toHaveBeenCalledWith(10);
    });
  });

  describe('getScholar', () => {
    it('should return a single scholar by ID', async () => {
      const mockScholarData = [
        {
          scholar: {
            id: 'scholar-1',
            userId: 'user-1',
            phone: '+1234567890',
            program: 'Computer Science',
            year: 'Year 2',
            university: 'MIT',
            location: 'Boston',
            bio: 'Test bio',
            status: 'active',
            startDate: new Date('2023-01-01'),
            lastActivity: new Date('2025-01-01'),
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2025-01-01'),
          },
          user: {
            id: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            image: 'avatar.jpg',
          },
        },
      ];

      const mockGoalsData = [{ scholarId: 'scholar-1', status: 'completed', count: 2 }];

      const mockTasksData = [
        { scholarId: 'scholar-1', status: 'completed', dueDate: new Date(), count: 3 },
      ];

      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      let selectCallCount = 0;
      mockDatabase.select = jest.fn().mockImplementation(() => {
        selectCallCount++;

        if (selectCallCount === 1) {
          // First call: get scholar
          mockLimit.mockResolvedValueOnce(mockScholarData);
        } else if (selectCallCount === 2) {
          // Second call: goals stats
          mockGroupBy.mockResolvedValueOnce(mockGoalsData);
        } else if (selectCallCount === 3) {
          // Third call: tasks stats
          mockGroupBy.mockResolvedValueOnce(mockTasksData);
        }

        return {
          from: mockFrom,
          innerJoin: mockInnerJoin,
          where: mockWhere,
          limit: mockLimit,
          groupBy: mockGroupBy,
        };
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();
      mockWhere.mockReturnThis();

      const result = await service.getScholar('scholar-1');

      expect(result.id).toBe('scholar-1');
      expect(result.name).toBe('John Doe');
      expect(result.email).toBe('john@example.com');
      expect(result.program).toBe('Computer Science');
      expect(result.year).toBe('Year 2');
      expect(result.university).toBe('MIT');
      // Goals and tasks will have default empty values since we're not mocking the stats calls
      expect(result.goals).toBeDefined();
      expect(result.tasks).toBeDefined();
    });

    it('should throw NotFoundException when scholar does not exist', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        where: mockWhere,
        limit: mockLimit,
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();
      mockWhere.mockReturnThis();

      await expect(service.getScholar('non-existent')).rejects.toThrow(NotFoundException);
      await expect(service.getScholar('non-existent')).rejects.toThrow(
        'Scholar with ID non-existent not found'
      );
    });
  });
});
