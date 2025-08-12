import { Test, type TestingModule } from '@nestjs/testing';
import type {
  GetScholarsQueryDto,
  GetScholarsResponseDto,
  ScholarResponseDto,
} from './dto/get-scholars.dto';
import { ScholarsController } from './scholars.controller';
import { ScholarsService } from './scholars.service';

describe('ScholarsController', () => {
  let controller: ScholarsController;
  let service: ScholarsService;

  const mockScholarsService = {
    getScholars: jest.fn(),
    getScholar: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ScholarsController],
      providers: [
        {
          provide: ScholarsService,
          useValue: mockScholarsService,
        },
      ],
    }).compile();

    controller = module.get<ScholarsController>(ScholarsController);
    service = module.get<ScholarsService>(ScholarsService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getScholars', () => {
    it('should return paginated scholars list', async () => {
      const mockResponse: GetScholarsResponseDto = {
        data: [
          {
            id: 'scholar-1',
            userId: 'user-1',
            name: 'John Doe',
            email: 'john@example.com',
            image: 'avatar.jpg',
            phone: '+1234567890',
            program: 'Computer Science',
            year: 'Year 2',
            university: 'MIT',
            location: 'Boston',
            bio: 'Test bio',
            status: 'active',
            startDate: new Date('2023-01-01'),
            lastActivity: new Date('2025-01-01'),
            goals: {
              total: 4,
              completed: 2,
              inProgress: 1,
              pending: 1,
            },
            tasks: {
              total: 5,
              completed: 3,
              overdue: 1,
            },
            createdAt: new Date('2023-01-01'),
            updatedAt: new Date('2025-01-01'),
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

      mockScholarsService.getScholars.mockResolvedValue(mockResponse);

      const query: GetScholarsQueryDto = {};
      const result = await controller.getScholars(query);

      expect(result).toEqual(mockResponse);
      expect(service.getScholars).toHaveBeenCalledWith(query);
      expect(service.getScholars).toHaveBeenCalledTimes(1);
    });

    it('should pass query parameters to the service', async () => {
      const mockResponse: GetScholarsResponseDto = {
        data: [],
        pagination: {
          page: 2,
          limit: 10,
          totalItems: 0,
          totalPages: 0,
          hasNext: false,
          hasPrev: true,
        },
      };

      mockScholarsService.getScholars.mockResolvedValue(mockResponse);

      const query: GetScholarsQueryDto = {
        page: 2,
        limit: 10,
        search: 'john',
        program: 'Computer Science',
        year: 'Year 2',
        university: 'MIT',
        status: 'active',
        sortBy: 'name',
        sortOrder: 'asc',
      };

      const result = await controller.getScholars(query);

      expect(result).toEqual(mockResponse);
      expect(service.getScholars).toHaveBeenCalledWith(query);
      expect(service.getScholars).toHaveBeenCalledTimes(1);
    });
  });

  describe('getScholar', () => {
    it('should return a single scholar by ID', async () => {
      const mockScholar: ScholarResponseDto = {
        id: 'scholar-1',
        userId: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
        image: 'avatar.jpg',
        phone: '+1234567890',
        program: 'Computer Science',
        year: 'Year 2',
        university: 'MIT',
        location: 'Boston',
        bio: 'Test bio',
        status: 'active',
        startDate: new Date('2023-01-01'),
        lastActivity: new Date('2025-01-01'),
        goals: {
          total: 4,
          completed: 2,
          inProgress: 1,
          pending: 1,
        },
        tasks: {
          total: 5,
          completed: 3,
          overdue: 1,
        },
        createdAt: new Date('2023-01-01'),
        updatedAt: new Date('2025-01-01'),
      };

      mockScholarsService.getScholar.mockResolvedValue(mockScholar);

      const scholarId = 'scholar-1';
      const result = await controller.getScholar(scholarId);

      expect(result).toEqual(mockScholar);
      expect(service.getScholar).toHaveBeenCalledWith(scholarId);
      expect(service.getScholar).toHaveBeenCalledTimes(1);
    });

    it('should handle valid UUID format', async () => {
      const mockScholar: ScholarResponseDto = {
        id: '550e8400-e29b-41d4-a716-446655440000',
        userId: 'user-1',
        name: 'Jane Smith',
        email: 'jane@example.com',
        image: null,
        phone: null,
        program: 'Medicine',
        year: 'Year 1',
        university: 'Harvard',
        location: null,
        bio: null,
        status: 'active',
        startDate: new Date('2023-09-01'),
        lastActivity: null,
        goals: {
          total: 0,
          completed: 0,
          inProgress: 0,
          pending: 0,
        },
        tasks: {
          total: 0,
          completed: 0,
          overdue: 0,
        },
        createdAt: new Date('2023-09-01'),
        updatedAt: new Date('2023-09-01'),
      };

      mockScholarsService.getScholar.mockResolvedValue(mockScholar);

      const scholarId = '550e8400-e29b-41d4-a716-446655440000';
      const result = await controller.getScholar(scholarId);

      expect(result).toEqual(mockScholar);
      expect(service.getScholar).toHaveBeenCalledWith(scholarId);
    });
  });
});
