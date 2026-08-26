import { randomUUID } from 'node:crypto';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { normalizeAudienceFilters } from '../common/audience-filters/audience-filter';
import { buildResourceAudienceVisibilitySql } from '../common/audience-filters/audience-filter.sql';
import { getScholarAudienceFilterOptions } from '../common/audience-filters/audience-filter-options';
import { database } from '../db/connection';
import { resourceFilters, resources, scholars, users } from '../db/schema';
import { ObjectStorageService } from '../storage/object-storage';
import { CreateResourceDto, ResourceFilterDto } from './dto/create-resource.dto';
import { UpdateResourceDto } from './dto/update-resource.dto';
import {
  ALLOWED_RESOURCE_MIME_TYPES,
  buildArchivedResourceFileKey,
  buildContentDispositionHeader,
  buildPendingResourceFileKey,
  buildPermanentResourceFileKey,
  isArchivedResourceFileKey,
  isPendingResourceFileKey,
  RESOURCE_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
  RESOURCE_FILE_MAX_SIZE_BYTES,
  RESOURCE_UPLOAD_URL_EXPIRES_IN_SECONDS,
  type ResourceDownloadDisposition,
} from './resource-files';

type ResourceFilter = {
  type: string;
  value: string;
};

type ResourceFilterWriter = Pick<typeof database, 'delete' | 'insert'>;

@Injectable()
export class ResourcesService {
  private readonly logger = new Logger(ResourcesService.name);

  constructor(private readonly objectStorage: ObjectStorageService) {}

  async createUploadUrl(input: { fileName: string; fileType: string; fileSize: number }) {
    this.assertAllowedUpload(input.fileType, input.fileSize);

    const fileKey = buildPendingResourceFileKey(randomUUID(), input.fileName);
    const upload = await this.objectStorage.createUploadUrl({
      key: fileKey,
      contentType: input.fileType,
      contentLength: input.fileSize,
      expiresInSeconds: RESOURCE_UPLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return { uploadUrl: upload.url, fields: upload.fields, fileKey };
  }

  async createResource(dto: CreateResourceDto, userId: string) {
    const {
      filters: rawFilters,
      sourceType = 'url',
      pendingFileKey,
      fileName,
      fileMimeType,
      fileSizeBytes,
      url,
      ...resourceData
    } = dto;
    const filters = normalizeAudienceFilters(rawFilters ?? []);

    if (sourceType === 'file') {
      if (!pendingFileKey || !fileName || !fileMimeType || fileSizeBytes == null) {
        throw new BadRequestException('File upload metadata is required');
      }

      const resourceId = randomUUID();
      const { fileKey } = await this.copyPendingUpload({
        pendingFileKey,
        resourceId,
        fileName,
        fileMimeType,
        fileSizeBytes,
      });

      try {
        const resource = await database.transaction(async (tx) => {
          const [created] = await tx
            .insert(resources)
            .values({
              id: resourceId,
              ...resourceData,
              sourceType: 'file',
              url: null,
              fileKey,
              fileName,
              fileMimeType,
              fileSizeBytes,
              status: resourceData.status ?? 'draft',
              createdBy: userId,
              updatedBy: userId,
            })
            .returning();

          await this.replaceFilters(created.id, filters, tx);
          return created;
        });

        await this.deleteStoredObject(pendingFileKey, 'pending resource upload');
        return this.formatResource(resource, this.formatFilters(filters));
      } catch (error) {
        await this.deleteStoredObject(fileKey, 'copied resource file after create failure');
        throw error;
      }
    }

    if (!url) {
      throw new BadRequestException('URL is required');
    }

    const resource = await database.transaction(async (tx) => {
      const [created] = await tx
        .insert(resources)
        .values({
          ...resourceData,
          sourceType: 'url',
          url,
          fileKey: null,
          fileName: null,
          fileMimeType: null,
          fileSizeBytes: null,
          status: resourceData.status ?? 'draft',
          createdBy: userId,
          updatedBy: userId,
        })
        .returning();

      await this.replaceFilters(created.id, filters, tx);
      return created;
    });

    return this.formatResource(resource, this.formatFilters(filters));
  }

  async listResources() {
    const rows = await database
      .select()
      .from(resources)
      .where(eq(resources.archived, false))
      .orderBy(asc(resources.title));

    const filtersByResourceId = await this.getResourceFiltersByResourceIds(
      rows.map((resource) => resource.id)
    );

    return rows.map((resource) =>
      this.formatResource(resource, filtersByResourceId.get(resource.id) ?? [])
    );
  }

  async updateResource(resourceId: string, dto: UpdateResourceDto, userId: string) {
    const {
      filters: rawFilters,
      pendingFileKey,
      fileName,
      fileMimeType,
      fileSizeBytes,
      sourceType,
      url,
      ...resourceData
    } = dto;
    const filters =
      rawFilters === undefined ? undefined : normalizeAudienceFilters(rawFilters ?? []);

    const [existing] = await database
      .select()
      .from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.archived, false)))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Resource not found');
    }

    if (sourceType !== undefined && sourceType !== existing.sourceType) {
      throw new BadRequestException('Resource source type cannot be changed');
    }

    if (existing.sourceType === 'file' && url !== undefined) {
      throw new BadRequestException('File resources cannot be updated with a URL');
    }

    const replacingFile = Boolean(pendingFileKey);
    if (replacingFile) {
      if (existing.sourceType !== 'file') {
        throw new BadRequestException('Only file resources can replace an uploaded document');
      }
      if (!pendingFileKey || !fileName || !fileMimeType || fileSizeBytes == null) {
        throw new BadRequestException('File upload metadata is required');
      }
    }

    let nextFileKey: string | undefined;
    const previousFileKey = existing.fileKey;

    if (replacingFile && pendingFileKey && fileName && fileMimeType && fileSizeBytes != null) {
      const copied = await this.copyPendingUpload({
        pendingFileKey,
        resourceId,
        fileName,
        fileMimeType,
        fileSizeBytes,
      });
      nextFileKey = copied.fileKey;
    }

    try {
      const updated = await database.transaction(async (tx) => {
        const [resource] = await tx
          .update(resources)
          .set({
            ...resourceData,
            ...(url !== undefined && existing.sourceType === 'url' ? { url } : {}),
            ...(nextFileKey
              ? {
                  fileKey: nextFileKey,
                  fileName,
                  fileMimeType,
                  fileSizeBytes,
                }
              : {}),
            updatedBy: userId,
            updatedAt: new Date(),
          })
          .where(and(eq(resources.id, resourceId), eq(resources.archived, false)))
          .returning();

        if (!resource) {
          throw new NotFoundException('Resource not found');
        }

        if (filters !== undefined) {
          await this.replaceFilters(resourceId, filters, tx);
        }

        return resource;
      });

      if (nextFileKey && pendingFileKey) {
        await this.deleteStoredObject(pendingFileKey, 'pending resource upload');
        if (previousFileKey && previousFileKey !== nextFileKey) {
          await this.deleteStoredObject(previousFileKey, 'replaced resource file');
        }
      }

      const nextFilters =
        filters !== undefined
          ? this.formatFilters(filters)
          : await this.getResourceFilters(resourceId);
      return this.formatResource(updated, nextFilters);
    } catch (error) {
      if (nextFileKey) {
        await this.deleteStoredObject(nextFileKey, 'copied resource file after update failure');
      }
      throw error;
    }
  }

  async archiveResource(resourceId: string, userId: string) {
    const [existing] = await database
      .select()
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Resource not found');
    }

    if (existing.archived) {
      return { success: true };
    }

    const previousFileKey = existing.fileKey;
    let archivedFileKey: string | undefined;

    if (
      existing.sourceType === 'file' &&
      previousFileKey &&
      !isArchivedResourceFileKey(previousFileKey)
    ) {
      archivedFileKey = buildArchivedResourceFileKey(resourceId, existing.fileName ?? 'document');
      await this.objectStorage.copyObject(previousFileKey, archivedFileKey);
    }

    try {
      const [updated] = await database
        .update(resources)
        .set({
          archived: true,
          ...(archivedFileKey ? { fileKey: archivedFileKey } : {}),
          updatedBy: userId,
          updatedAt: new Date(),
        })
        .where(eq(resources.id, resourceId))
        .returning();

      if (!updated) {
        throw new NotFoundException('Resource not found');
      }

      if (archivedFileKey && previousFileKey) {
        await this.deleteStoredObject(previousFileKey, 'replaced resource file');
      }

      return { success: true };
    } catch (error) {
      if (archivedFileKey) {
        await this.deleteStoredObject(
          archivedFileKey,
          'archived resource file after archive failure'
        );
      }
      throw error;
    }
  }

  async getResourcesForScholar(userId: string) {
    const scholarRows = await database
      .select({
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
        status: scholars.status,
      })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholarRows[0]) {
      return [];
    }

    const scholar = scholarRows[0];
    const visibleResources = await database
      .select()
      .from(resources)
      .where(
        and(
          eq(resources.status, 'live'),
          eq(resources.archived, false),
          buildResourceAudienceVisibilitySql(scholar)
        )
      )
      .orderBy(asc(resources.title));

    const filtersByResourceId = await this.getResourceFiltersByResourceIds(
      visibleResources.map((resource) => resource.id)
    );

    return visibleResources.map((resource) =>
      this.formatResource(resource, filtersByResourceId.get(resource.id) ?? [])
    );
  }

  async getDownloadUrl(
    resourceId: string,
    userId: string,
    disposition: ResourceDownloadDisposition = 'attachment'
  ) {
    const [user] = await database
      .select({ userType: users.userType })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    if (!user) {
      throw new NotFoundException('User not found');
    }

    const [resource] = await database
      .select()
      .from(resources)
      .where(and(eq(resources.id, resourceId), eq(resources.archived, false)))
      .limit(1);

    if (!resource || resource.sourceType !== 'file' || !resource.fileKey) {
      throw new NotFoundException('Resource not found');
    }

    if (user.userType !== 'staff') {
      const canDownload = await this.scholarCanDownload(resourceId, userId);
      if (!canDownload) {
        throw new NotFoundException('Resource not found');
      }
    }

    const downloadUrl = await this.objectStorage.createDownloadUrl({
      key: resource.fileKey,
      contentDisposition: buildContentDispositionHeader(
        resource.fileName ?? 'resource',
        disposition
      ),
      expiresInSeconds: RESOURCE_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return { downloadUrl };
  }

  async getFilterOptions() {
    return getScholarAudienceFilterOptions();
  }

  private async scholarCanDownload(resourceId: string, userId: string) {
    const scholarRows = await database
      .select({
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
        status: scholars.status,
      })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!scholarRows[0]) {
      return false;
    }

    const [visible] = await database
      .select({ id: resources.id })
      .from(resources)
      .where(
        and(
          eq(resources.id, resourceId),
          eq(resources.status, 'live'),
          eq(resources.archived, false),
          eq(resources.sourceType, 'file'),
          buildResourceAudienceVisibilitySql(scholarRows[0])
        )
      )
      .limit(1);

    return Boolean(visible);
  }

  private async copyPendingUpload(input: {
    pendingFileKey: string;
    resourceId: string;
    fileName: string;
    fileMimeType: string;
    fileSizeBytes: number;
  }) {
    if (!isPendingResourceFileKey(input.pendingFileKey)) {
      throw new BadRequestException('Invalid pending file key');
    }

    this.assertAllowedUpload(input.fileMimeType, input.fileSizeBytes);

    const uploaded = await this.objectStorage.headObject(input.pendingFileKey);
    if (!uploaded) {
      throw new BadRequestException('Uploaded file was not found. Please upload the file again.');
    }

    if (uploaded.contentLength != null && uploaded.contentLength !== input.fileSizeBytes) {
      throw new BadRequestException('Uploaded file size does not match the selected file');
    }

    if (uploaded.contentType && uploaded.contentType !== input.fileMimeType) {
      throw new BadRequestException('Uploaded file type does not match the selected file');
    }

    const fileKey = buildPermanentResourceFileKey(input.resourceId, input.fileName);
    await this.objectStorage.copyObject(input.pendingFileKey, fileKey);
    return { fileKey };
  }

  private assertAllowedUpload(fileType: string, fileSize: number) {
    if (
      !ALLOWED_RESOURCE_MIME_TYPES.includes(
        fileType as (typeof ALLOWED_RESOURCE_MIME_TYPES)[number]
      )
    ) {
      throw new BadRequestException(`File type ${fileType} is not allowed`);
    }

    if (fileSize < 1 || fileSize > RESOURCE_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  private async replaceFilters(
    resourceId: string,
    filters: ResourceFilterDto[],
    db: ResourceFilterWriter = database
  ) {
    await db.delete(resourceFilters).where(eq(resourceFilters.resourceId, resourceId));

    if (filters.length > 0) {
      await db.insert(resourceFilters).values(
        filters.map((filter) => ({
          resourceId,
          filterType: filter.filterType,
          filterValue: filter.filterValue,
        }))
      );
    }
  }

  private async getResourceFilters(resourceId: string): Promise<ResourceFilter[]> {
    const filters = await database
      .select()
      .from(resourceFilters)
      .where(eq(resourceFilters.resourceId, resourceId));

    return filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));
  }

  private async getResourceFiltersByResourceIds(resourceIds: string[]) {
    const filtersByResourceId = new Map<string, ResourceFilter[]>();
    if (resourceIds.length === 0) return filtersByResourceId;

    const filters = await database
      .select()
      .from(resourceFilters)
      .where(inArray(resourceFilters.resourceId, resourceIds));

    for (const filter of filters) {
      const resourceFiltersForId = filtersByResourceId.get(filter.resourceId) ?? [];
      resourceFiltersForId.push({
        type: filter.filterType,
        value: filter.filterValue,
      });
      filtersByResourceId.set(filter.resourceId, resourceFiltersForId);
    }

    return filtersByResourceId;
  }

  private formatFilters(filters: ResourceFilterDto[]): ResourceFilter[] {
    return filters.map((filter) => ({
      type: filter.filterType,
      value: filter.filterValue,
    }));
  }

  private async deleteStoredObject(fileKey: string, label: string): Promise<void> {
    try {
      await this.objectStorage.deleteObject(fileKey);
    } catch (error) {
      this.logger.warn(
        `Failed to delete ${label} ${fileKey}: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private formatResource(resource: typeof resources.$inferSelect, filters: ResourceFilter[]) {
    return {
      id: resource.id,
      title: resource.title,
      description: resource.description,
      type: resource.type,
      category: resource.category,
      sourceType: resource.sourceType,
      url: resource.url,
      fileName: resource.fileName,
      fileMimeType: resource.fileMimeType,
      fileSizeBytes: resource.fileSizeBytes,
      status: resource.status,
      filters,
      createdAt: resource.createdAt,
      updatedAt: resource.updatedAt,
    };
  }
}
