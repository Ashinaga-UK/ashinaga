import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import { AnnouncementsController } from './announcements.controller';
import { AnnouncementsService } from './announcements.service';

describe('AnnouncementsController', () => {
  let controller: AnnouncementsController;
  let service: AnnouncementsService;

  const mockAnnouncementsService = {
    getAnnouncements: jest.fn(),
    createAnnouncement: jest.fn(),
    getScholarsForFiltering: jest.fn(),
    getFilterOptions: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AnnouncementsController],
      providers: [
        {
          provide: AnnouncementsService,
          useValue: mockAnnouncementsService,
        },
      ],
    }).compile();

    controller = module.get<AnnouncementsController>(AnnouncementsController);
    service = module.get<AnnouncementsService>(AnnouncementsService);
    jest.clearAllMocks();
  });

  describe('getAnnouncements', () => {
    it('should return announcements', async () => {
      const mockAnnouncements = [
        {
          id: '1',
          title: 'Test Announcement',
          content: 'Test content',
          createdBy: 'John Doe',
          createdAt: new Date(),
          updatedAt: new Date(),
          filters: [],
          recipientCount: 5,
        },
      ];

      mockAnnouncementsService.getAnnouncements.mockResolvedValue(mockAnnouncements);

      const result = await controller.getAnnouncements();

      expect(service.getAnnouncements).toHaveBeenCalled();
      expect(result).toEqual(mockAnnouncements);
    });
  });

  describe('createAnnouncement', () => {
    it('should create an announcement', async () => {
      const createDto = {
        title: 'New Announcement',
        content: 'New content',
        filters: [],
      };

      const mockRequest = {
        user: {
          id: 'user-123',
        },
      } as any;

      const mockCreatedAnnouncement = {
        id: '2',
        title: 'New Announcement',
        content: 'New content',
        createdBy: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockAnnouncementsService.createAnnouncement.mockResolvedValue(mockCreatedAnnouncement);

      const result = await controller.createAnnouncement(createDto, mockRequest);

      expect(service.createAnnouncement).toHaveBeenCalledWith(createDto, 'user-123');
      expect(result).toEqual(mockCreatedAnnouncement);
    });

    it('should throw error when user is not authenticated', async () => {
      const createDto = {
        title: 'New Announcement',
        content: 'New content',
        filters: [],
      };

      const mockRequest = {
        user: null,
      } as any;

      await expect(controller.createAnnouncement(createDto, mockRequest)).rejects.toThrow(
        'User not authenticated'
      );
    });
  });

  describe('getScholarsForFiltering', () => {
    it('should return scholars for filtering', async () => {
      const mockScholars = [
        {
          id: '1',
          name: 'John Doe',
          email: 'john@example.com',
          currentLevel: 'undergraduate',
          university: 'Test University',
          country: 'USA',
        },
      ];

      mockAnnouncementsService.getScholarsForFiltering.mockResolvedValue(mockScholars);

      const result = await controller.getScholarsForFiltering();

      expect(service.getScholarsForFiltering).toHaveBeenCalled();
      expect(result).toEqual(mockScholars);
    });
  });

  describe('getFilterOptions', () => {
    it('should return filter options', async () => {
      const mockFilterOptions = {
        levels: ['undergraduate', 'graduate'],
        universities: ['University A', 'University B'],
        countries: ['USA', 'Japan'],
      };

      mockAnnouncementsService.getFilterOptions.mockResolvedValue(mockFilterOptions);

      const result = await controller.getFilterOptions();

      expect(service.getFilterOptions).toHaveBeenCalled();
      expect(result).toEqual(mockFilterOptions);
    });
  });
});
