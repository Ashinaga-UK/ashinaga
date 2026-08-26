import type { TestingModule } from '@nestjs/testing';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import type { CreateResourceDto } from './dto/create-resource.dto';
import type { UpdateResourceDto } from './dto/update-resource.dto';
import { ResourcesController } from './resources.controller';
import { ResourcesService } from './resources.service';

type RequestWithUser = Request & {
  user: {
    id: string;
  };
};

describe('ResourcesController', () => {
  let controller: ResourcesController;
  let service: ResourcesService;

  const mockResourcesService = {
    listResources: jest.fn(),
    createResource: jest.fn(),
    createUploadUrl: jest.fn(),
    updateResource: jest.fn(),
    archiveResource: jest.fn(),
    getFilterOptions: jest.fn(),
    getResourcesForScholar: jest.fn(),
    getDownloadUrl: jest.fn(),
  };

  const makeRequest = (userId: string) =>
    ({
      user: {
        id: userId,
      },
    }) as RequestWithUser;

  const mockResource = {
    id: 'resource-1',
    title: 'Scholar Handbook',
    description: 'Reference material for scholars.',
    type: 'Handbook',
    category: 'Handbook',
    sourceType: 'url',
    url: 'https://docs.example/handbook',
    fileName: null,
    fileMimeType: null,
    fileSizeBytes: null,
    status: 'live',
    filters: [],
    createdAt: new Date('2026-01-01'),
    updatedAt: new Date('2026-01-01'),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [ResourcesController],
      providers: [
        {
          provide: ResourcesService,
          useValue: mockResourcesService,
        },
      ],
    }).compile();

    controller = module.get<ResourcesController>(ResourcesController);
    service = module.get<ResourcesService>(ResourcesService);
    jest.clearAllMocks();
  });

  describe('listResources', () => {
    it('returns staff resources', async () => {
      mockResourcesService.listResources.mockResolvedValue([mockResource]);

      const result = await controller.listResources();

      expect(service.listResources).toHaveBeenCalledTimes(1);
      expect(result).toEqual([mockResource]);
    });
  });

  describe('createResource', () => {
    it('creates a resource for the authenticated staff user', async () => {
      const dto: CreateResourceDto = {
        title: 'Scholar Handbook',
        description: 'Reference material for scholars.',
        type: 'Handbook',
        category: 'Handbook',
        url: 'https://docs.example/handbook',
        status: 'draft',
        filters: [],
      };
      const request = makeRequest('staff-user-1');
      mockResourcesService.createResource.mockResolvedValue(mockResource);

      const result = await controller.createResource(dto, request);

      expect(service.createResource).toHaveBeenCalledWith(dto, 'staff-user-1');
      expect(result).toEqual(mockResource);
    });
  });

  describe('updateResource', () => {
    it('updates a resource for the authenticated staff user', async () => {
      const dto: UpdateResourceDto = {
        title: 'Updated Handbook',
        status: 'live',
      };
      const request = makeRequest('staff-user-1');
      mockResourcesService.updateResource.mockResolvedValue({
        ...mockResource,
        ...dto,
      });

      const result = await controller.updateResource('resource-1', dto, request);

      expect(service.updateResource).toHaveBeenCalledWith('resource-1', dto, 'staff-user-1');
      expect(result).toEqual({ ...mockResource, ...dto });
    });
  });

  describe('archiveResource', () => {
    it('archives a resource for the authenticated staff user', async () => {
      const request = makeRequest('staff-user-1');
      mockResourcesService.archiveResource.mockResolvedValue({ success: true });

      const result = await controller.archiveResource('resource-1', request);

      expect(service.archiveResource).toHaveBeenCalledWith('resource-1', 'staff-user-1');
      expect(result).toEqual({ success: true });
    });
  });

  describe('getFilterOptions', () => {
    it('returns resource audience filter options', async () => {
      const filterOptions = {
        programs: ['Medicine'],
        years: ['Year 1'],
        universities: ['Makerere University'],
        locations: ['Uganda'],
        statuses: ['active'],
      };
      mockResourcesService.getFilterOptions.mockResolvedValue(filterOptions);

      const result = await controller.getFilterOptions();

      expect(service.getFilterOptions).toHaveBeenCalledTimes(1);
      expect(result).toEqual(filterOptions);
    });
  });

  describe('getMyResources', () => {
    it('returns resources visible to the authenticated scholar', async () => {
      const request = makeRequest('scholar-user-1');
      mockResourcesService.getResourcesForScholar.mockResolvedValue([mockResource]);

      const result = await controller.getMyResources(request);

      expect(service.getResourcesForScholar).toHaveBeenCalledWith('scholar-user-1');
      expect(result).toEqual([mockResource]);
    });
  });

  describe('createUploadUrl', () => {
    it('creates a pending upload URL for staff', async () => {
      mockResourcesService.createUploadUrl.mockResolvedValue({
        uploadUrl: 'https://s3.example/upload',
        fields: { key: 'resources/pending/file.pdf', Policy: 'policy' },
        fileKey: 'resources/pending/file.pdf',
      });

      const result = await controller.createUploadUrl({
        fileName: 'handbook.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      });

      expect(service.createUploadUrl).toHaveBeenCalledWith({
        fileName: 'handbook.pdf',
        fileType: 'application/pdf',
        fileSize: 2048,
      });
      expect(result.fileKey).toBe('resources/pending/file.pdf');
      expect(result.fields).toEqual(expect.objectContaining({ Policy: 'policy' }));
    });
  });

  describe('getDownloadUrl', () => {
    it('returns a download URL for the authenticated user', async () => {
      const request = makeRequest('scholar-user-1');
      mockResourcesService.getDownloadUrl.mockResolvedValue({
        downloadUrl: 'https://s3.example/download',
      });

      const result = await controller.getDownloadUrl('resource-1', request, {});

      expect(service.getDownloadUrl).toHaveBeenCalledWith(
        'resource-1',
        'scholar-user-1',
        'attachment'
      );
      expect(result).toEqual({ downloadUrl: 'https://s3.example/download' });
    });

    it('requests an inline URL when viewing in the browser', async () => {
      const request = makeRequest('scholar-user-1');
      mockResourcesService.getDownloadUrl.mockResolvedValue({
        downloadUrl: 'https://s3.example/view',
      });

      await controller.getDownloadUrl('resource-1', request, { disposition: 'inline' });

      expect(service.getDownloadUrl).toHaveBeenCalledWith('resource-1', 'scholar-user-1', 'inline');
    });
  });
});
