import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray, sql } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import type { ScholarAudience } from '../common/audience-filters/audience-filter';
import { buildResourceAudienceVisibilitySql } from '../common/audience-filters/audience-filter.sql';
import { database } from '../db/connection';
import {
  proposalComments,
  proposalStatusEnum,
  proposalStepResources,
  proposalSubmissions,
  resources,
  scholars,
  users,
} from '../db/schema';
import { NotificationsService } from '../notifications/notifications.service';
import { ObjectStorageService } from '../storage/object-storage';
import {
  buildContentDispositionHeader,
  buildPendingProposalFileKey,
  buildPermanentProposalFileKey,
  isPendingProposalFileKey,
  PROPOSAL_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
  PROPOSAL_FILE_MAX_SIZE_BYTES,
  PROPOSAL_UPLOAD_URL_EXPIRES_IN_SECONDS,
  type ProposalDownloadDisposition,
  resolveProposalMimeType,
} from './proposal-files';
import { normalizeStageLabel } from './proposal-stage-label';
import { PROPOSAL_STEPS, type ProposalStepKey, requireProposalStepKey } from './proposal-steps';
import {
  currentStepKey,
  isStepAvailable,
  nextStatusAfterReview,
  nextStatusAfterScholarWrite,
  type ProposalStatus,
  type StaffReviewAction,
  type StatusByStep,
  scholarCanWrite,
} from './proposal-workflow';

const authorUser = alias(users, 'proposal_comment_author');

type ProposalFileInput = {
  pendingFileKey: string;
  fileName: string;
  fileMimeType: string;
  fileSizeBytes: number;
};

@Injectable()
export class ProposalsService {
  private readonly logger = new Logger(ProposalsService.name);

  constructor(
    private readonly notifications: NotificationsService,
    private readonly objectStorage: ObjectStorageService
  ) {}

  async getMine(userId: string) {
    const scholar = await this.requireScholarForUser(userId);
    return this.assembleTimeline(scholar.id, { hideLockedBodies: true });
  }

  async saveDraft(userId: string, stepKey: string, body: string, stageLabel?: string) {
    return this.writeScholarStep(userId, stepKey, 'draft', body, stageLabel);
  }

  async submit(
    userId: string,
    stepKey: string,
    body: string,
    stageLabel?: string,
    note?: string,
    file?: ProposalFileInput
  ) {
    return this.writeScholarStep(userId, stepKey, 'submit', body, stageLabel, note, file);
  }

  async createUploadUrl(
    userId: string,
    input: { fileName: string; fileType: string; fileSize: number }
  ) {
    const scholar = await this.requireScholarForUser(userId);
    const mimeType = resolveProposalMimeType(input.fileName, input.fileType);
    if (!mimeType) {
      throw new BadRequestException('Upload a PDF or Word document');
    }
    if (input.fileSize < 1 || input.fileSize > PROPOSAL_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException('Upload a file smaller than 10MB');
    }
    const fileKey = buildPendingProposalFileKey(scholar.id, randomUUID(), input.fileName);
    const upload = await this.objectStorage.createUploadUrl({
      key: fileKey,
      contentType: mimeType,
      contentLength: input.fileSize,
      expiresInSeconds: PROPOSAL_UPLOAD_URL_EXPIRES_IN_SECONDS,
    });
    return { uploadUrl: upload.url, fields: upload.fields, fileKey };
  }

  async getMyFileDownloadUrl(
    userId: string,
    stepKey: string,
    disposition: ProposalDownloadDisposition = 'attachment'
  ) {
    const scholar = await this.requireScholarForUser(userId);
    return this.getFileDownloadUrl(scholar.id, stepKey, disposition);
  }

  async getStaffFileDownloadUrl(
    scholarId: string,
    stepKey: string,
    disposition: ProposalDownloadDisposition = 'attachment'
  ) {
    await this.requireScholar(scholarId);
    return this.getFileDownloadUrl(scholarId, stepKey, disposition);
  }

  async addScholarComment(userId: string, stepKey: string, body: string) {
    const scholar = await this.requireScholarForUser(userId);
    const key = this.parseStepKey(stepKey);
    const statusByStep = await this.statusByStep(scholar.id);
    const submission = await this.findSubmission(scholar.id, key);
    if (
      !submission ||
      !scholarCanWrite('comment', submission.status, isStepAvailable(key, statusByStep))
    ) {
      throw new ForbiddenException('This proposal step is not open for comments');
    }
    return this.addComment(submission.id, userId, body);
  }

  async listInbox() {
    const rows = await database
      .select({
        scholarId: proposalSubmissions.scholarId,
        stepKey: proposalSubmissions.stepKey,
        stageLabel: proposalSubmissions.stageLabel,
        submittedAt: proposalSubmissions.submittedAt,
        scholarName: users.name,
      })
      .from(proposalSubmissions)
      .innerJoin(scholars, eq(proposalSubmissions.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(proposalSubmissions.status, 'submitted'))
      .orderBy(asc(proposalSubmissions.submittedAt));

    return rows.map((row) => ({
      scholarId: row.scholarId,
      scholarName: row.scholarName,
      stepKey: row.stepKey,
      stepTitle: this.stepTitle(row.stepKey),
      stageLabel: row.stageLabel,
      submittedAt: row.submittedAt?.toISOString() ?? null,
    }));
  }

  async getForScholar(scholarId: string) {
    await this.requireScholar(scholarId);
    return this.assembleTimeline(scholarId, { hideLockedBodies: false });
  }

  async review(
    scholarId: string,
    stepKey: string,
    actorId: string,
    action: StaffReviewAction,
    comment?: string
  ) {
    await this.requireScholar(scholarId);
    const key = this.parseStepKey(stepKey);
    const trimmedComment = comment?.trim() ?? '';
    if (action === 'request_changes' && trimmedComment.length === 0) {
      throw new BadRequestException('A comment is required when requesting changes');
    }

    const submission = await this.getSubmission(scholarId, key);
    let nextStatus: ProposalStatus;
    try {
      nextStatus = nextStatusAfterReview(action, submission.status);
    } catch {
      throw new BadRequestException('Only a submitted step can be reviewed');
    }

    const now = new Date();
    let commentId: string | null = null;
    await database.transaction(async (tx) => {
      if (trimmedComment.length > 0) {
        const [comment] = await tx
          .insert(proposalComments)
          .values({
            submissionId: submission.id,
            authorId: actorId,
            body: trimmedComment,
          })
          .returning({ id: proposalComments.id });
        commentId = comment?.id ?? null;
      }
      const [updated] = await tx
        .update(proposalSubmissions)
        .set({
          status: nextStatus,
          reviewedAt: now,
          reviewedBy: actorId,
          updatedAt: now,
        })
        .where(
          and(
            eq(proposalSubmissions.id, submission.id),
            eq(proposalSubmissions.status, 'submitted')
          )
        )
        .returning();
      if (!updated) {
        throw new BadRequestException('Only a submitted step can be reviewed');
      }
    });

    void this.notifications
      .notifyProposalFeedback({
        scholarId,
        stepKey: key,
        action,
        eventId: commentId ?? `review:${now.toISOString()}`,
        comment: trimmedComment || null,
      })
      .catch((error) => this.logger.error('Failed to send proposal feedback notification', error));

    return this.assembleTimeline(scholarId, { hideLockedBodies: false });
  }

  async addStaffComment(scholarId: string, stepKey: string, actorId: string, body: string) {
    await this.requireScholar(scholarId);
    const key = this.parseStepKey(stepKey);
    const submission = await this.getSubmission(scholarId, key);
    const comment = await this.addComment(submission.id, actorId, body);
    void this.notifications
      .notifyProposalFeedback({
        scholarId,
        stepKey: key,
        action: 'comment',
        eventId: comment.id,
        comment: comment.body,
      })
      .catch((error) => this.logger.error('Failed to send proposal comment notification', error));
    return comment;
  }

  async attachResource(stepKey: string, resourceId: string) {
    const key = this.parseStepKey(stepKey);
    const [resource] = await database
      .select({
        id: resources.id,
        archived: resources.archived,
        status: resources.status,
        category: resources.category,
      })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (
      !resource ||
      resource.archived ||
      resource.status !== 'live' ||
      resource.category !== 'Proposal'
    ) {
      throw new NotFoundException('Resource not found');
    }

    await database
      .insert(proposalStepResources)
      .values({ stepKey: key, resourceId })
      .onConflictDoNothing();

    return { stepKey: key, resourceId };
  }

  private async writeScholarStep(
    userId: string,
    stepKey: string,
    action: 'draft' | 'submit',
    body: string,
    stageLabel?: string,
    note?: string,
    file?: ProposalFileInput
  ) {
    const scholar = await this.requireScholarForUser(userId);
    const key = this.parseStepKey(stepKey);
    const trimmed = this.requireTrimmed(body, 'Proposal text is required');
    const statusByStep = await this.statusByStep(scholar.id);
    const available = isStepAvailable(key, statusByStep);
    const existing = await this.findSubmission(scholar.id, key);

    let nextStatus: ProposalStatus;
    try {
      nextStatus = nextStatusAfterScholarWrite(action, statusByStep[key] ?? null, available);
    } catch {
      throw new ForbiddenException('This proposal step is locked');
    }

    let normalizedStageLabel: string | null;
    try {
      normalizedStageLabel = normalizeStageLabel(stageLabel);
    } catch (error) {
      throw new BadRequestException(
        error instanceof Error ? error.message : 'Use a step like 1, 1a, or 1b'
      );
    }
    if (action === 'submit' && !normalizedStageLabel) {
      throw new BadRequestException('Say which step you are on, for example 1a or 1b');
    }

    const storedFile =
      action === 'submit'
        ? await this.resolveSubmissionFile(scholar.id, key, existing, file)
        : null;

    const now = new Date();
    const [written] = await database
      .insert(proposalSubmissions)
      .values({
        scholarId: scholar.id,
        stepKey: key,
        status: nextStatus,
        body: trimmed,
        stageLabel: normalizedStageLabel,
        fileKey: storedFile?.fileKey ?? null,
        fileName: storedFile?.fileName ?? null,
        fileMimeType: storedFile?.fileMimeType ?? null,
        fileSizeBytes: storedFile?.fileSizeBytes ?? null,
        submittedAt: action === 'submit' ? now : null,
      })
      .onConflictDoUpdate({
        target: [proposalSubmissions.scholarId, proposalSubmissions.stepKey],
        set: {
          body: trimmed,
          stageLabel: normalizedStageLabel ?? sql`${proposalSubmissions.stageLabel}`,
          fileKey: storedFile?.fileKey ?? sql`${proposalSubmissions.fileKey}`,
          fileName: storedFile?.fileName ?? sql`${proposalSubmissions.fileName}`,
          fileMimeType: storedFile?.fileMimeType ?? sql`${proposalSubmissions.fileMimeType}`,
          fileSizeBytes: storedFile?.fileSizeBytes ?? sql`${proposalSubmissions.fileSizeBytes}`,
          status: nextStatus,
          submittedAt: action === 'submit' ? now : sql`${proposalSubmissions.submittedAt}`,
          reviewedAt: action === 'submit' ? null : sql`${proposalSubmissions.reviewedAt}`,
          reviewedBy: action === 'submit' ? null : sql`${proposalSubmissions.reviewedBy}`,
          updatedAt: now,
        },
        setWhere: inArray(proposalSubmissions.status, ['draft', 'changes_requested']),
      })
      .returning();
    if (!written) {
      throw new ForbiddenException('This proposal step is locked');
    }
    const trimmedNote = note?.trim();
    if (action === 'submit' && trimmedNote) {
      await this.addComment(written.id, userId, trimmedNote);
    }
    return this.assembleTimeline(scholar.id, { hideLockedBodies: true });
  }

  private async assembleTimeline(scholarId: string, options: { hideLockedBodies: boolean }) {
    const submissions = await database
      .select()
      .from(proposalSubmissions)
      .where(eq(proposalSubmissions.scholarId, scholarId));
    const statusByStep = this.toStatusByStep(submissions);
    const current = currentStepKey(statusByStep);
    const commentsBySubmission = await this.commentsBySubmission(submissions.map((row) => row.id));
    const resourcesByStep = await this.resourcesByStep(
      options.hideLockedBodies ? await this.scholarAudience(scholarId) : undefined
    );

    return {
      catalog: PROPOSAL_STEPS.map((step) => ({ ...step })),
      currentStepKey: current,
      steps: PROPOSAL_STEPS.map((step) => {
        const submission = submissions.find((row) => row.stepKey === step.key) ?? null;
        const available = isStepAvailable(step.key, statusByStep);
        if (options.hideLockedBodies && !available && submission?.status !== 'approved') {
          return {
            ...step,
            available: false,
            status: null,
            body: null,
            stageLabel: null,
            fileName: null,
            comments: [],
            resources: resourcesByStep.get(step.key) ?? [],
            submittedAt: null,
            reviewedAt: null,
          };
        }
        return {
          ...step,
          available,
          status: submission?.status ?? null,
          body: submission?.body ?? null,
          stageLabel: submission?.stageLabel ?? null,
          fileName: submission?.fileName ?? null,
          comments: commentsBySubmission.get(submission?.id ?? '') ?? [],
          resources: resourcesByStep.get(step.key) ?? [],
          submittedAt: submission?.submittedAt?.toISOString() ?? null,
          reviewedAt: submission?.reviewedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  private async addComment(submissionId: string, authorId: string, body: string) {
    const trimmed = this.requireTrimmed(body, 'Comment is required');
    const [created] = await database
      .insert(proposalComments)
      .values({ submissionId, authorId, body: trimmed })
      .returning();
    const [author] = await database
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    return this.formatComment(created, author?.name ?? 'Unknown');
  }

  private async commentsBySubmission(submissionIds: string[]) {
    const map = new Map<string, ReturnType<ProposalsService['formatComment']>[]>();
    if (submissionIds.length === 0) {
      return map;
    }
    const rows = await database
      .select({
        comment: proposalComments,
        authorName: authorUser.name,
      })
      .from(proposalComments)
      .leftJoin(authorUser, eq(proposalComments.authorId, authorUser.id))
      .where(inArray(proposalComments.submissionId, submissionIds))
      .orderBy(asc(proposalComments.createdAt));

    for (const row of rows) {
      const list = map.get(row.comment.submissionId) ?? [];
      list.push(this.formatComment(row.comment, row.authorName));
      map.set(row.comment.submissionId, list);
    }
    return map;
  }

  private async scholarAudience(scholarId: string): Promise<ScholarAudience> {
    const [row] = await database
      .select({
        program: scholars.program,
        year: scholars.year,
        university: scholars.university,
        location: scholars.location,
        status: scholars.status,
      })
      .from(scholars)
      .where(eq(scholars.id, scholarId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    return row;
  }

  private async resourcesByStep(audience?: ScholarAudience) {
    const liveProposal = await database
      .select({
        id: resources.id,
        title: resources.title,
        description: resources.description,
        sourceType: resources.sourceType,
        url: resources.url,
      })
      .from(resources)
      .where(
        and(
          eq(resources.archived, false),
          eq(resources.status, 'live'),
          eq(resources.category, 'Proposal'),
          ...(audience ? [buildResourceAudienceVisibilitySql(audience)] : [])
        )
      );

    const joins = await database.select().from(proposalStepResources);
    const joinedIds = new Set(joins.map((row) => row.resourceId));
    const generic = liveProposal.filter((resource) => !joinedIds.has(resource.id));
    const byId = new Map(liveProposal.map((resource) => [resource.id, resource]));

    const map = new Map<string, typeof liveProposal>();
    for (const step of PROPOSAL_STEPS) {
      const attached = joins
        .filter((row) => row.stepKey === step.key)
        .map((row) => byId.get(row.resourceId))
        .filter((resource): resource is (typeof liveProposal)[number] => resource != null);
      map.set(step.key, [...generic, ...attached]);
    }
    return map;
  }

  private async statusByStep(scholarId: string): Promise<StatusByStep> {
    const rows = await database
      .select({ stepKey: proposalSubmissions.stepKey, status: proposalSubmissions.status })
      .from(proposalSubmissions)
      .where(eq(proposalSubmissions.scholarId, scholarId));
    return this.toStatusByStep(rows);
  }

  private toStatusByStep(
    rows: Array<{ stepKey: string; status: (typeof proposalStatusEnum.enumValues)[number] }>
  ): StatusByStep {
    const map: StatusByStep = {};
    for (const row of rows) {
      if (this.isStatus(row.status) && this.isKnownStep(row.stepKey)) {
        map[row.stepKey] = row.status;
      }
    }
    return map;
  }

  private async resolveSubmissionFile(
    scholarId: string,
    stepKey: ProposalStepKey,
    existing: typeof proposalSubmissions.$inferSelect | null,
    file?: ProposalFileInput
  ) {
    if (file) {
      return this.copyPendingUpload({
        scholarId,
        stepKey,
        pendingFileKey: file.pendingFileKey,
        fileName: file.fileName,
        fileMimeType: file.fileMimeType,
        fileSizeBytes: file.fileSizeBytes,
      });
    }
    if (existing?.fileKey && existing.fileName) {
      return {
        fileKey: existing.fileKey,
        fileName: existing.fileName,
        fileMimeType: existing.fileMimeType,
        fileSizeBytes: existing.fileSizeBytes,
      };
    }
    throw new BadRequestException('Upload the completed file for this step');
  }

  private async copyPendingUpload(input: {
    scholarId: string;
    stepKey: string;
    pendingFileKey: string;
    fileName: string;
    fileMimeType: string;
    fileSizeBytes: number;
  }) {
    if (!isPendingProposalFileKey(input.pendingFileKey, input.scholarId)) {
      throw new BadRequestException('Invalid uploaded file');
    }
    const uploaded = await this.objectStorage.headObject(input.pendingFileKey);
    if (!uploaded) {
      throw new BadRequestException('Uploaded file was not found. Please upload the file again.');
    }
    const storedType = uploaded.contentType?.split(';')[0]?.trim() || input.fileMimeType;
    const mimeType = resolveProposalMimeType(input.fileName, storedType);
    if (!mimeType) {
      throw new BadRequestException('Upload a PDF or Word document');
    }
    const sizeBytes = uploaded.contentLength ?? input.fileSizeBytes;
    if (sizeBytes < 1 || sizeBytes > PROPOSAL_FILE_MAX_SIZE_BYTES) {
      throw new BadRequestException('Upload a file smaller than 10MB');
    }
    const fileKey = buildPermanentProposalFileKey(input.scholarId, input.stepKey, input.fileName);
    await this.objectStorage.copyObject(input.pendingFileKey, fileKey);
    return {
      fileKey,
      fileName: input.fileName,
      fileMimeType: mimeType,
      fileSizeBytes: sizeBytes,
    };
  }

  private async getFileDownloadUrl(
    scholarId: string,
    stepKey: string,
    disposition: ProposalDownloadDisposition
  ) {
    const key = this.parseStepKey(stepKey);
    const submission = await this.getSubmission(scholarId, key);
    if (!submission.fileKey || !submission.fileName) {
      throw new NotFoundException('No completed file has been uploaded for this step');
    }
    const downloadUrl = await this.objectStorage.createDownloadUrl({
      key: submission.fileKey,
      contentDisposition: buildContentDispositionHeader(submission.fileName, disposition),
      expiresInSeconds: PROPOSAL_DOWNLOAD_URL_EXPIRES_IN_SECONDS,
    });
    return { downloadUrl };
  }

  private async getSubmission(scholarId: string, stepKey: ProposalStepKey) {
    const row = await this.findSubmission(scholarId, stepKey);
    if (!row) {
      throw new NotFoundException('Proposal step not found');
    }
    return row;
  }

  private async findSubmission(scholarId: string, stepKey: ProposalStepKey) {
    const [row] = await database
      .select()
      .from(proposalSubmissions)
      .where(
        and(eq(proposalSubmissions.scholarId, scholarId), eq(proposalSubmissions.stepKey, stepKey))
      )
      .limit(1);
    return row ?? null;
  }

  private async requireScholar(scholarId: string) {
    const [row] = await database
      .select({ id: scholars.id })
      .from(scholars)
      .where(eq(scholars.id, scholarId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    return row;
  }

  private async requireScholarForUser(userId: string) {
    const [row] = await database
      .select({ id: scholars.id })
      .from(scholars)
      .where(eq(scholars.userId, userId))
      .limit(1);
    if (!row) {
      throw new NotFoundException('Scholar not found');
    }
    return row;
  }

  private parseStepKey(stepKey: string): ProposalStepKey {
    try {
      return requireProposalStepKey(stepKey);
    } catch {
      throw new BadRequestException('Unknown proposal step');
    }
  }

  private stepTitle(stepKey: string) {
    return PROPOSAL_STEPS.find((step) => step.key === stepKey)?.title ?? stepKey;
  }

  private requireTrimmed(value: string, message: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private formatComment(comment: typeof proposalComments.$inferSelect, authorName: string | null) {
    return {
      id: comment.id,
      body: comment.body,
      authorName: authorName?.trim() || 'Unknown',
      createdAt: comment.createdAt.toISOString(),
    };
  }

  private isStatus(value: string): value is ProposalStatus {
    return (
      value === 'draft' ||
      value === 'submitted' ||
      value === 'changes_requested' ||
      value === 'approved'
    );
  }

  private isKnownStep(value: string): value is ProposalStepKey {
    return PROPOSAL_STEPS.some((step) => step.key === value);
  }
}
