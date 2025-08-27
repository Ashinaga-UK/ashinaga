import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AnnouncementsService } from './announcements.service';

// Mock the database module
jest.mock('../db/connection');

describe('AnnouncementsService', () => {
  let service: AnnouncementsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AnnouncementsService],
    }).compile();

    service = module.get<AnnouncementsService>(AnnouncementsService);
    jest.clearAllMocks();
  });

  describe('createAnnouncement', () => {
    it('should create an announcement successfully', async () => {
      const mockAnnouncement = {
        id: '1',
        title: 'Test Announcement',
        content: 'Test content',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const mockDatabase = require('../db/connection').database;
      mockDatabase.insert = jest.fn().mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([mockAnnouncement]),
        }),
      });

      // Mock for createRecipientRecords
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      const createDto = {
        title: 'Test Announcement',
        content: 'Test content',
        filters: [],
      };

      const result = await service.createAnnouncement(createDto, 'user-123');

      expect(result).toEqual(mockAnnouncement);
      expect(mockDatabase.insert).toHaveBeenCalled();
    });
  });

  describe('getAnnouncements', () => {
    it('should return announcements with details', async () => {
      const mockAnnouncementData = [
        {
          announcement: {
            id: '1',
            title: 'Test Announcement',
            content: 'Test content',
            createdBy: 'user-123',
            createdAt: new Date(),
            updatedAt: new Date(),
          },
          creator: {
            id: 'user-123',
            name: 'John Doe',
          },
        },
      ];

      const mockDatabase = require('../db/connection').database;

      // Mock main query
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockAnnouncementData),
          }),
        }),
      });

      // Mock filters query (called in map)
      mockDatabase.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockAnnouncementData),
          }),
        }),
      });

      // Mock filters for each announcement
      mockDatabase.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([]),
        }),
      });

      // Mock recipient count
      mockDatabase.select.mockReturnValueOnce({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue([{ count: 5 }]),
        }),
      });

      const result = await service.getAnnouncements();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('title', 'Test Announcement');
      expect(result[0]).toHaveProperty('createdBy', 'John Doe');
      expect(result[0]).toHaveProperty('recipientCount', 5);
    });
  });

  describe('getScholarsForFiltering', () => {
    it('should return scholars for filtering', async () => {
      const mockDbResult = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          currentLevel: 'undergraduate',
          program: 'Program A',
          university: 'Test University',
          location: 'USA',
          year: '2024',
          status: 'active',
          userId: 'user-1',
        },
      ];

      const mockDatabase = require('../db/connection').database;
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockDbResult),
          }),
        }),
      });

      const result = await service.getScholarsForFiltering();

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('id', '1');
      expect(result[0]).toHaveProperty('name', 'John Doe');
      expect(result[0]).toHaveProperty('email', 'john@example.com');
    });
  });

  describe('getFilterOptions', () => {
    it('should return filter options', async () => {
      const mockScholars = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          currentLevel: 'undergraduate',
          program: 'Program A',
          university: 'University A',
          location: 'USA',
          year: '2024',
          status: 'active' as const,
        },
      ];

      const mockDatabase = require('../db/connection').database;
      // Mock getScholarsForFiltering call inside getFilterOptions
      mockDatabase.select = jest.fn().mockReturnValue({
        from: jest.fn().mockReturnValue({
          innerJoin: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockScholars),
          }),
        }),
      });

      const result = await service.getFilterOptions();

      expect(result).toHaveProperty('programs');
      expect(result).toHaveProperty('universities');
      expect(result).toHaveProperty('locations');
      expect(result).toHaveProperty('years');
      expect(result).toHaveProperty('statuses');
    });
  });
});
