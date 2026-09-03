import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { database } from '../db/connection';
import { requiredDocumentFiles, requiredDocumentTypes, scholars, users } from '../db/schema';
import { ObjectStorageService } from '../storage/object-storage';
import {
  ALLOWED_DOCUMENT_MIME_TYPES,
  buildContentDispositionHeader,
  buildPendingDocumentFileKey,
  buildPermanentDocumentFileKey,
  DOCUMENT_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
  DOCUMENT_FILE_MAX_SIZE_BYTES,
  DOCUMENT_UPLOAD_URL_EXPIRES_IN_SECONDS,
  type DocumentDownloadDisposition,
  isPendingDocumentFileKey,
  slugifyDocumentTypeLabel,
} from './document-files';
import {
  ConfirmDocumentUploadDto,
  CreateDocumentUploadUrlDto,
  CreateRequiredDocumentTypeDto,
  UpdateRequiredDocumentTypeDto,
} from './dto/documents.dto';

type PrepScholar = {
  scholarId: string;
  userId: string;
  programStage: 'prep_year' | 'scholar';
};

@Injectable()
export class DocumentsService {
  private readonly logger = new Logger(DocumentsService.name);

  constructor(private readonly objectStorage: ObjectStorageService) {}

  async listTypes(userType?: string) {
    const rows = await database
      .select()
      .from(requiredDocumentTypes)
      .orderBy(asc(requiredDocumentTypes.sortOrder), asc(requiredDocumentTypes.label));

    if (userType === 'staff') {
      return rows.map((row) => this.formatType(row));
    }

    return rows.filter((row) => row.isActive).map((row) => this.formatType(row));
  }

  async createType(dto: CreateRequiredDocumentTypeDto) {
    const label = dto.label.trim();
    if (!label) {
      throw new BadRequestException('Label is required');
    }

    const slug = await this.uniqueSlug(slugifyDocumentTypeLabel(label));
    const maxSort = await database
      .select({ sortOrder: requiredDocumentTypes.sortOrder })
      .from(requiredDocumentTypes)
      .orderBy(asc(requiredDocumentTypes.sortOrder));
    const nextSort = (maxSort.at(-1)?.sortOrder ?? 0) + 1;

    const [created] = await database
      .insert(requiredDocumentTypes)
      .values({
        slug,
        label,
        description: dto.description?.trim() || null,
        sortOrder: nextSort,
      })
      .returning();

    return this.formatType(created);
  }

  async updateType(typeId: string, dto: UpdateRequiredDocumentTypeDto) {
    const [existing] = await database
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.id, typeId))
      .limit(1);

    if (!existing) {
      throw new NotFoundException('Document type not found');
    }

    const nextLabel = dto.label?.trim();
    let nextSlug = existing.slug;
    if (nextLabel && nextLabel !== existing.label) {
      nextSlug = await this.uniqueSlug(slugifyDocumentTypeLabel(nextLabel), typeId);
    }

    const [updated] = await database
      .update(requiredDocumentTypes)
      .set({
        ...(nextLabel ? { label: nextLabel, slug: nextSlug } : {}),
        ...(dto.description !== undefined ? { description: dto.description.trim() || null } : {}),
        ...(dto.isActive !== undefined ? { isActive: dto.isActive } : {}),
        ...(dto.sortOrder !== undefined ? { sortOrder: dto.sortOrder } : {}),
        updatedAt: new Date(),
      })
      .where(eq(requiredDocumentTypes.id, typeId))
      .returning();

    return this.formatType(updated);
  }

  async createUploadUrl(userId: string, dto: CreateDocumentUploadUrlDto) {
    const scholar = await this.requirePrepScholar(userId);
    await this.requireActiveType(dto.typeId);
    this.assertAllowedUpload(dto.fileType, dto.fileSize);

    const fileKey = buildPendingDocumentFileKey(scholar.scholarId, randomUUID(), dto.fileName);
    const upload = await this.objectStorage.createUploadUrl({
      key: fileKey,
      contentType: dto.fileType === 'image/jpg' ? 'image/jpeg' : dto.fileType,
      contentLength: dto.fileSize,
      expiresInSeconds: DOCUMENT_UPLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return { uploadUrl: upload.url, fields: upload.fields, fileKey };
  }

  async confirmUpload(userId: string, dto: ConfirmDocumentUploadDto) {
    const scholar = await this.requirePrepScholar(userId);
    const documentType = await this.requireActiveType(dto.typeId);

    if (!isPendingDocumentFileKey(dto.pendingFileKey, scholar.scholarId)) {
      throw new BadRequestException('Invalid pending file key');
    }

    this.assertAllowedUpload(dto.fileMimeType, dto.fileSizeBytes);

    const { fileKey } = await this.copyPendingUpload({
      pendingFileKey: dto.pendingFileKey,
      scholarId: scholar.scholarId,
      typeId: documentType.id,
      fileName: dto.fileName,
      fileMimeType: dto.fileMimeType === 'image/jpg' ? 'image/jpeg' : dto.fileMimeType,
      fileSizeBytes: dto.fileSizeBytes,
    });

    const [existing] = await database
      .select()
      .from(requiredDocumentFiles)
      .where(
        and(
          eq(requiredDocumentFiles.scholarId, scholar.scholarId),
          eq(requiredDocumentFiles.typeId, documentType.id)
        )
      )
      .limit(1);

    try {
      if (existing) {
        const [updated] = await database
          .update(requiredDocumentFiles)
          .set({
            fileKey,
            fileName: dto.fileName,
            fileMimeType: dto.fileMimeType === 'image/jpg' ? 'image/jpeg' : dto.fileMimeType,
            fileSizeBytes: dto.fileSizeBytes,
            uploadedBy: userId,
            uploadedAt: new Date(),
            updatedAt: new Date(),
          })
          .where(eq(requiredDocumentFiles.id, existing.id))
          .returning();

        await this.deleteStoredObject(dto.pendingFileKey, 'pending document upload');
        if (existing.fileKey !== fileKey) {
          await this.deleteStoredObject(existing.fileKey, 'replaced document file');
        }
        return this.formatFile(updated, documentType);
      }

      const [created] = await database
        .insert(requiredDocumentFiles)
        .values({
          scholarId: scholar.scholarId,
          typeId: documentType.id,
          fileKey,
          fileName: dto.fileName,
          fileMimeType: dto.fileMimeType === 'image/jpg' ? 'image/jpeg' : dto.fileMimeType,
          fileSizeBytes: dto.fileSizeBytes,
          uploadedBy: userId,
        })
        .returning();

      await this.deleteStoredObject(dto.pendingFileKey, 'pending document upload');
      return this.formatFile(created, documentType);
    } catch (error) {
      // Deletes this request's newly copied key, not the winning row's, except a
      // same-millisecond key collision on the concurrent double-submit path.
      await this.deleteStoredObject(fileKey, 'copied document file after save failure');
      if (error instanceof Error && error.message.includes('unique')) {
        throw new ConflictException('A file already exists for this document type');
      }
      throw error;
    }
  }

  async deleteMyFile(userId: string, fileId: string) {
    const scholar = await this.requirePrepScholar(userId);
    const [file] = await database
      .select()
      .from(requiredDocumentFiles)
      .where(eq(requiredDocumentFiles.id, fileId))
      .limit(1);

    if (!file || file.scholarId !== scholar.scholarId) {
      throw new NotFoundException('Document not found');
    }

    await database.delete(requiredDocumentFiles).where(eq(requiredDocumentFiles.id, fileId));
    await this.deleteStoredObject(file.fileKey, 'deleted document file');
    return { success: true };
  }

  async getMyChecklist(userId: string) {
    const scholar = await this.requirePrepScholar(userId);
    return this.getScholarChecklist(scholar.scholarId);
  }

  async getScholarChecklist(scholarId: string) {
    const [scholar] = await database
      .select({ id: scholars.id })
      .from(scholars)
      .where(eq(scholars.id, scholarId))
      .limit(1);

    if (!scholar) {
      throw new NotFoundException('Scholar not found');
    }

    const types = await database
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.isActive, true))
      .orderBy(asc(requiredDocumentTypes.sortOrder), asc(requiredDocumentTypes.label));

    const files = await database
      .select()
      .from(requiredDocumentFiles)
      .where(eq(requiredDocumentFiles.scholarId, scholarId));

    const fileByType = new Map(files.map((file) => [file.typeId, file]));

    return {
      scholarId,
      items: types.map((type) => {
        const file = fileByType.get(type.id);
        return {
          type: this.formatType(type),
          status: file ? ('submitted' as const) : ('missing' as const),
          file: file ? this.formatFile(file, type) : null,
        };
      }),
    };
  }

  async getCohort(missingTypeId?: string) {
    const types = await database
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.isActive, true))
      .orderBy(asc(requiredDocumentTypes.sortOrder), asc(requiredDocumentTypes.label));

    if (missingTypeId && !types.some((type) => type.id === missingTypeId)) {
      throw new BadRequestException('Unknown or inactive document type');
    }

    const prepScholars = await database
      .select({
        scholarId: scholars.id,
        name: users.name,
        email: users.email,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.programStage, 'prep_year'))
      .orderBy(asc(users.name));

    const scholarIds = prepScholars.map((row) => row.scholarId);
    const files =
      scholarIds.length === 0
        ? []
        : await database
            .select()
            .from(requiredDocumentFiles)
            .where(inArray(requiredDocumentFiles.scholarId, scholarIds));

    const filesByScholar = new Map<string, Map<string, (typeof files)[number]>>();
    for (const file of files) {
      const byType = filesByScholar.get(file.scholarId) ?? new Map();
      byType.set(file.typeId, file);
      filesByScholar.set(file.scholarId, byType);
    }

    const scholarsPayload = prepScholars
      .map((row) => {
        const byType = filesByScholar.get(row.scholarId) ?? new Map();
        const items = types.map((type) => {
          const file = byType.get(type.id);
          return {
            typeId: type.id,
            status: file ? ('submitted' as const) : ('missing' as const),
            file: file
              ? {
                  id: file.id,
                  fileName: file.fileName,
                  uploadedAt: file.uploadedAt,
                }
              : null,
          };
        });
        return {
          scholarId: row.scholarId,
          name: row.name,
          email: row.email,
          items,
        };
      })
      .filter((row) => {
        if (!missingTypeId) return true;
        return row.items.some((item) => item.typeId === missingTypeId && item.status === 'missing');
      });

    return {
      types: types.map((type) => this.formatType(type)),
      scholars: scholarsPayload,
    };
  }

  async getDownloadUrl(
    fileId: string,
    userId: string,
    userType: string | undefined,
    disposition: DocumentDownloadDisposition
  ) {
    const [file] = await database
      .select()
      .from(requiredDocumentFiles)
      .where(eq(requiredDocumentFiles.id, fileId))
      .limit(1);

    if (!file) {
      throw new NotFoundException('Document not found');
    }

    if (userType !== 'staff') {
      const [scholar] = await database
        .select({ id: scholars.id })
        .from(scholars)
        .where(eq(scholars.userId, userId))
        .limit(1);

      if (!scholar || scholar.id !== file.scholarId) {
        throw new NotFoundException('Document not found');
      }
    }

    const downloadUrl = await this.objectStorage.createDownloadUrl({
      key: file.fileKey,
      contentDisposition: buildContentDispositionHeader(file.fileName, disposition),
      expiresInSeconds: DOCUMENT_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });

    return { downloadUrl };
  }

  async deleteStoredFilesForScholar(scholarId: string): Promise<void> {
    const files = await database
      .select({ id: requiredDocumentFiles.id, fileKey: requiredDocumentFiles.fileKey })
      .from(requiredDocumentFiles)
      .where(eq(requiredDocumentFiles.scholarId, scholarId));

    for (const file of files) {
      await this.deleteStoredObject(file.fileKey, 'scholar document file');
    }

    if (files.length > 0) {
      await database
        .delete(requiredDocumentFiles)
        .where(eq(requiredDocumentFiles.scholarId, scholarId));
    }
  }

  private async requirePrepScholar(userId: string): Promise<PrepScholar> {
    const [row] = await database
      .select({
        scholarId: scholars.id,
        userId: scholars.userId,
        programStage: scholars.programStage,
      })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);

    if (!row) {
      throw new ForbiddenException('Prep Year document uploads are limited to candidates');
    }

    if (row.programStage !== 'prep_year') {
      throw new ForbiddenException('Prep Year document uploads are limited to candidates');
    }

    return row;
  }

  private async requireActiveType(typeId: string) {
    const [row] = await database
      .select()
      .from(requiredDocumentTypes)
      .where(eq(requiredDocumentTypes.id, typeId))
      .limit(1);

    if (!row) {
      throw new NotFoundException('Document type not found');
    }
    if (!row.isActive) {
      throw new BadRequestException('This document type is no longer required');
    }
    return row;
  }

  private async uniqueSlug(base: string, excludeId?: string): Promise<string> {
    let candidate = base;
    let suffix = 2;
    while (true) {
      const [existing] = await database
        .select({ id: requiredDocumentTypes.id })
        .from(requiredDocumentTypes)
        .where(eq(requiredDocumentTypes.slug, candidate))
        .limit(1);
      if (!existing || existing.id === excludeId) {
        return candidate;
      }
      candidate = `${base}-${suffix}`;
      suffix += 1;
    }
  }

  private async copyPendingUpload(input: {
    pendingFileKey: string;
    scholarId: string;
    typeId: string;
    fileName: string;
    fileMimeType: string;
    fileSizeBytes: number;
  }) {
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

    const fileKey = buildPermanentDocumentFileKey(input.scholarId, input.typeId, input.fileName);
    await this.objectStorage.copyObject(input.pendingFileKey, fileKey);
    return { fileKey };
  }

  private assertAllowedUpload(fileType: string, fileSize: number) {
    const normalized = fileType === 'image/jpg' ? 'image/jpeg' : fileType;
    if (
      !ALLOWED_DOCUMENT_MIME_TYPES.includes(
        normalized as (typeof ALLOWED_DOCUMENT_MIME_TYPES)[number]
      )
    ) {
      throw new BadRequestException(`File type ${fileType} is not allowed`);
    }

    if (fileSize < 1) {
      throw new BadRequestException('File must not be empty');
    }

    if (fileSize > DOCUMENT_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException('File size exceeds 10MB limit');
    }
  }

  private async deleteStoredObject(fileKey: string, label: string): Promise<void> {
    try {
      await this.objectStorage.deleteObject(fileKey);
    } catch (error) {
      this.logger.warn(`Failed to delete ${label} (${fileKey})`, error);
    }
  }

  private formatType(row: typeof requiredDocumentTypes.$inferSelect) {
    return {
      id: row.id,
      slug: row.slug,
      label: row.label,
      description: row.description,
      isActive: row.isActive,
      sortOrder: row.sortOrder,
    };
  }

  private formatFile(
    row: typeof requiredDocumentFiles.$inferSelect,
    type?: typeof requiredDocumentTypes.$inferSelect
  ) {
    return {
      id: row.id,
      typeId: row.typeId,
      typeSlug: type?.slug,
      typeLabel: type?.label,
      fileName: row.fileName,
      fileMimeType: row.fileMimeType,
      fileSizeBytes: row.fileSizeBytes,
      uploadedAt: row.uploadedAt,
    };
  }
}
