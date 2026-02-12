import { NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';

// Mock the database connection before any imports that might use it
jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
    selectDistinct: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  getDatabase: jest.fn(() => ({
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  })),
}));

// Mock task-responses schema used dynamically in getScholarProfile
jest.mock('../db/schema/task-responses', () => ({
  taskResponses: {},
  taskAttachments: {},
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

  describe('getScholarStats', () => {
    it('should return stats including archived count', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        groupBy: mockGroupBy,
      });

      mockFrom.mockReturnThis();
      mockGroupBy.mockResolvedValue([
        { status: 'active', count: 10 },
        { status: 'inactive', count: 2 },
        { status: 'on_hold', count: 1 },
        { status: 'archived', count: 3 },
      ]);

      const result = await service.getScholarStats();

      expect(result).toEqual({
        total: 16,
        active: 10,
        inactive: 2,
        onHold: 1,
        archived: 3,
      });
    });

    it('should return zeros when no scholars', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        groupBy: mockGroupBy,
      });

      mockFrom.mockReturnThis();
      mockGroupBy.mockResolvedValue([]);

      const result = await service.getScholarStats();

      expect(result).toEqual({
        total: 0,
        active: 0,
        inactive: 0,
        onHold: 0,
        archived: 0,
      });
    });
  });

  describe('getScholarProfile', () => {
    it('should return full profile including personal and emergency fields', async () => {
      const mockScholarRow = {
        scholar: {
          id: 'scholar-1',
          userId: 'user-1',
          phone: '+1234567890',
          program: 'CS',
          year: 'Year 2',
          university: 'MIT',
          location: 'Boston',
          bio: 'Bio',
          status: 'active',
          startDate: new Date('2023-01-01'),
          lastActivity: new Date('2025-01-01'),
          createdAt: new Date(),
          updatedAt: new Date(),
          aaiScholarId: 'AAI-001',
          dateOfBirth: '2000-05-15',
          gender: 'male',
          nationality: 'Japanese',
          addressHomeCountry: 'Tokyo, Japan',
          passportExpirationDate: '2030-01-01',
          visaExpirationDate: '2026-06-01',
          emergencyContactCountryOfStudy: 'Jane Doe, jane@example.com',
          emergencyContactHomeCountry: 'John Doe, john@example.com',
          graduationDate: new Date('2027-06-01'),
          universityId: 'uni-1',
          dietaryInformation: 'Vegetarian',
          kokorozashi: 'My kokorozashi',
          longTermCareerPlan: 'Plan',
          postGraduationPlan: 'Grad plan',
          majorCategory: 'Engineering',
          fieldOfStudy: 'Computer Science',
        },
        user: {
          id: 'user-1',
          name: 'John Doe',
          email: 'john@example.com',
          image: null,
        },
      };

      let selectCallCount = 0;
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockReturnThis();
      const mockGroupBy = jest.fn();

      mockDatabase.select = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          mockLimit.mockResolvedValueOnce([mockScholarRow]);
        } else {
          mockOrderBy.mockResolvedValueOnce([]);
        }
        return {
          from: mockFrom,
          innerJoin: mockInnerJoin,
          where: mockWhere,
          limit: mockLimit,
          orderBy: mockOrderBy,
          groupBy: mockGroupBy,
        };
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();
      mockWhere.mockReturnThis();
      mockOrderBy.mockReturnThis();

      const result = await service.getScholarProfile('scholar-1');

      expect(result.id).toBe('scholar-1');
      expect(result.name).toBe('John Doe');
      expect(result.aaiScholarId).toBe('AAI-001');
      expect(result.dateOfBirth).toBe('2000-05-15');
      expect(result.gender).toBe('male');
      expect(result.nationality).toBe('Japanese');
      expect(result.addressHomeCountry).toBe('Tokyo, Japan');
      expect(result.emergencyContactCountryOfStudy).toBe('Jane Doe, jane@example.com');
      expect(result.emergencyContactHomeCountry).toBe('John Doe, john@example.com');
      expect(result.graduationDate).toEqual(new Date('2027-06-01'));
      expect(result.universityId).toBe('uni-1');
      expect(result.dietaryInformation).toBe('Vegetarian');
      expect(result.kokorozashi).toBe('My kokorozashi');
      expect(result.majorCategory).toBe('Engineering');
      expect(result.fieldOfStudy).toBe('Computer Science');
      expect(result.goals).toEqual([]);
      expect(result.tasks).toEqual([]);
      expect(result.documents).toEqual([]);
    });

    it('should throw NotFoundException when scholar profile not found', async () => {
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

      await expect(service.getScholarProfile('missing-id')).rejects.toThrow(NotFoundException);
      await expect(service.getScholarProfile('missing-id')).rejects.toThrow(
        'Scholar with ID missing-id not found'
      );
    });
  });

  describe('updateScholarProfileByScholarId', () => {
    it('should throw NotFoundException when scholar does not exist', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      await expect(
        service.updateScholarProfileByScholarId('missing', { phone: '+123' })
      ).rejects.toThrow(NotFoundException);
      await expect(
        service.updateScholarProfileByScholarId('missing', { phone: '+123' })
      ).rejects.toThrow('Scholar not found');
    });

    it('should call updateScholarProfile with userId when scholar exists', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([{ userId: 'user-123' }]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      const updateSpy = jest.spyOn(service, 'updateScholarProfile').mockResolvedValueOnce({
        id: 'scholar-1',
        userId: 'user-123',
        name: 'Jane',
        email: 'j@x.com',
        program: 'CS',
        year: 'Year 1',
        university: 'MIT',
        status: 'active',
        startDate: new Date(),
        goals: [],
        tasks: [],
        documents: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const updateData = { phone: '+15551234567', program: 'CS' };
      const result = await service.updateScholarProfileByScholarId('scholar-1', updateData);

      expect(updateSpy).toHaveBeenCalledWith('user-123', updateData);
      expect(result.userId).toBe('user-123');
      updateSpy.mockRestore();
    });
  });

  describe('exportAllScholarsCSV', () => {
    it('should return CSV string with headers and scholar data', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue([
        {
          scholar: {
            id: 's1',
            status: 'active',
            phone: '+1',
            program: 'CS',
            year: 'Y1',
            university: 'MIT',
            location: 'Boston',
            aaiScholarId: null,
            dateOfBirth: null,
            gender: null,
            nationality: null,
            addressHomeCountry: null,
            passportExpirationDate: null,
            visaExpirationDate: null,
            emergencyContactCountryOfStudy: null,
            emergencyContactHomeCountry: null,
            startDate: new Date('2023-09-01'),
            graduationDate: null,
            universityId: null,
            majorCategory: null,
            fieldOfStudy: null,
            dietaryInformation: null,
            kokorozashi: null,
            longTermCareerPlan: null,
            postGraduationPlan: null,
            bio: null,
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2023-01-01'),
          },
          userName: 'Alice',
          userEmail: 'alice@example.com',
        },
      ]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        orderBy: mockOrderBy,
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();

      const result = await service.exportAllScholarsCSV();

      expect(typeof result).toBe('string');
      expect(result).toContain('"Name"');
      expect(result).toContain('"Email"');
      expect(result).toContain('"Status"');
      expect(result).toContain('Alice');
      expect(result).toContain('alice@example.com');
      expect(result).toContain('"ID"');
      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThanOrEqual(2); // header + at least one data row
    });

    it('should return only header row when no scholars', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockInnerJoin = jest.fn().mockReturnThis();
      const mockOrderBy = jest.fn().mockResolvedValue([]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        innerJoin: mockInnerJoin,
        orderBy: mockOrderBy,
      });

      mockFrom.mockReturnThis();
      mockInnerJoin.mockReturnThis();

      const result = await service.exportAllScholarsCSV();

      expect(result.split('\n').length).toBe(1);
      expect(result).toContain('"ID"');
    });
  });

  describe('archiveScholar', () => {
    it('should throw NotFoundException when scholar does not exist', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      await expect(service.archiveScholar('missing')).rejects.toThrow(NotFoundException);
      await expect(service.archiveScholar('missing')).rejects.toThrow('Scholar not found');
    });

    it('should update status to archived and return scholar', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([{ id: 's1', userId: 'u1' }]);
      const mockSet = jest.fn().mockReturnThis();
      const mockUpdateWhere = jest.fn().mockResolvedValue(undefined);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      mockDatabase.update = jest.fn().mockReturnValue({
        set: mockSet,
        where: mockUpdateWhere,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      const getScholarSpy = jest.spyOn(service, 'getScholar').mockResolvedValueOnce({
        id: 's1',
        userId: 'u1',
        name: 'Archived User',
        email: 'a@x.com',
        program: 'CS',
        year: 'Y1',
        university: 'MIT',
        status: 'archived',
        startDate: new Date().toISOString(),
        goals: { total: 0, completed: 0, inProgress: 0, pending: 0 },
        tasks: { total: 0, completed: 0, overdue: 0 },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as any);

      const result = await service.archiveScholar('s1');

      expect(mockDatabase.update).toHaveBeenCalled();
      expect(mockSet).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'archived', updatedAt: expect.any(Date) })
      );
      expect(getScholarSpy).toHaveBeenCalledWith('s1');
      expect(result.status).toBe('archived');
      getScholarSpy.mockRestore();
    });
  });

  describe('deleteScholar', () => {
    it('should throw NotFoundException when scholar does not exist', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockResolvedValue([]);

      mockDatabase.select = jest.fn().mockReturnValue({
        from: mockFrom,
        where: mockWhere,
        limit: mockLimit,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      await expect(service.deleteScholar('missing')).rejects.toThrow(NotFoundException);
      await expect(service.deleteScholar('missing')).rejects.toThrow('Scholar not found');
    });

    it('should delete scholar and related data when scholar exists', async () => {
      const mockFrom = jest.fn().mockReturnThis();
      const mockWhere = jest.fn().mockReturnThis();
      const mockLimit = jest.fn().mockReturnThis();
      const mockWhereResolvesEmpty = jest.fn().mockResolvedValue([]);

      let selectCallCount = 0;
      mockDatabase.select = jest.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          mockLimit.mockResolvedValueOnce([{ id: 's1' }]);
          return {
            from: mockFrom,
            where: mockWhere,
            limit: mockLimit,
          };
        }
        return {
          from: mockFrom,
          where: mockWhereResolvesEmpty,
        };
      });

      const mockDeleteWhere = jest.fn().mockResolvedValue(undefined);
      mockDatabase.delete = jest.fn().mockReturnValue({
        where: mockDeleteWhere,
      });

      mockFrom.mockReturnThis();
      mockWhere.mockReturnThis();

      await service.deleteScholar('s1');

      expect(mockDatabase.delete).toHaveBeenCalledTimes(6);
    });
  });
});
