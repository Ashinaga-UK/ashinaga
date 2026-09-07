import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { and, asc, eq, inArray } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
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

type SubmissionRow = typeof proposalSubmissions.$inferSelect;

@Injectable()
export class ProposalsService {
  async getMine(userId: string) {
    const scholar = await this.requireScholarForUser(userId);
    return this.assembleTimeline(scholar.id, { hideLockedBodies: true });
  }

  async saveDraft(userId: string, stepKey: string, body: string) {
    return this.writeScholarStep(userId, stepKey, 'draft', body);
  }

  async submit(userId: string, stepKey: string, body: string) {
    return this.writeScholarStep(userId, stepKey, 'submit', body);
  }

  async addScholarComment(userId: string, stepKey: string, body: string) {
    const scholar = await this.requireScholarForUser(userId);
    const key = this.parseStepKey(stepKey);
    const statusByStep = await this.statusByStep(scholar.id);
    const submission = await this.getSubmission(scholar.id, key);
    if (
      !scholarCanWrite('comment', submission?.status ?? null, isStepAvailable(key, statusByStep))
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

    if (trimmedComment.length > 0) {
      await this.insertComment(submission.id, actorId, trimmedComment);
    }

    const now = new Date();
    await database
      .update(proposalSubmissions)
      .set({
        status: nextStatus,
        reviewedAt: now,
        reviewedBy: actorId,
        updatedAt: now,
      })
      .where(eq(proposalSubmissions.id, submission.id));

    return this.assembleTimeline(scholarId, { hideLockedBodies: false });
  }

  async addStaffComment(scholarId: string, stepKey: string, actorId: string, body: string) {
    await this.requireScholar(scholarId);
    const key = this.parseStepKey(stepKey);
    const submission = await this.getSubmission(scholarId, key);
    return this.addComment(submission.id, actorId, body);
  }

  async attachResource(stepKey: string, resourceId: string) {
    const key = this.parseStepKey(stepKey);
    const [resource] = await database
      .select({ id: resources.id, archived: resources.archived, status: resources.status })
      .from(resources)
      .where(eq(resources.id, resourceId))
      .limit(1);

    if (!resource || resource.archived || resource.status !== 'live') {
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
    body: string
  ) {
    const scholar = await this.requireScholarForUser(userId);
    const key = this.parseStepKey(stepKey);
    const trimmed = this.requireTrimmed(body, 'Proposal text is required');
    const statusByStep = await this.statusByStep(scholar.id);
    const existing = await this.findSubmission(scholar.id, key);
    const available = isStepAvailable(key, statusByStep);

    let nextStatus: ProposalStatus;
    try {
      nextStatus = nextStatusAfterScholarWrite(action, existing?.status ?? null, available);
    } catch {
      throw new ForbiddenException('This proposal step is locked');
    }

    const now = new Date();
    if (existing) {
      const [updated] = await database
        .update(proposalSubmissions)
        .set({
          body: trimmed,
          status: nextStatus,
          submittedAt: action === 'submit' ? now : existing.submittedAt,
          updatedAt: now,
        })
        .where(eq(proposalSubmissions.id, existing.id))
        .returning();
      return this.formatScholarWrite(scholar.id, updated);
    }

    const [created] = await database
      .insert(proposalSubmissions)
      .values({
        scholarId: scholar.id,
        stepKey: key,
        status: nextStatus,
        body: trimmed,
        submittedAt: action === 'submit' ? now : null,
      })
      .returning();
    return this.formatScholarWrite(scholar.id, created);
  }

  private async assembleTimeline(scholarId: string, options: { hideLockedBodies: boolean }) {
    const submissions = await database
      .select()
      .from(proposalSubmissions)
      .where(eq(proposalSubmissions.scholarId, scholarId));
    const statusByStep = this.toStatusByStep(submissions);
    const current = currentStepKey(statusByStep);
    const commentsBySubmission = await this.commentsBySubmission(submissions.map((row) => row.id));
    const resourcesByStep = await this.resourcesByStep();

    return {
      catalog: PROPOSAL_STEPS.map((step) => ({ ...step })),
      currentStepKey: current,
      steps: PROPOSAL_STEPS.map((step) => {
        const submission = submissions.find((row) => row.stepKey === step.key) ?? null;
        const available = isStepAvailable(step.key, statusByStep);
        const hideBody =
          options.hideLockedBodies && !available && submission?.status !== 'approved';
        if (options.hideLockedBodies && !available && submission?.status !== 'approved') {
          return {
            ...step,
            available: false,
            status: null,
            body: null,
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
          body: hideBody ? null : (submission?.body ?? null),
          comments: hideBody ? [] : (commentsBySubmission.get(submission?.id ?? '') ?? []),
          resources: resourcesByStep.get(step.key) ?? [],
          submittedAt: submission?.submittedAt?.toISOString() ?? null,
          reviewedAt: submission?.reviewedAt?.toISOString() ?? null,
        };
      }),
    };
  }

  private async formatScholarWrite(scholarId: string, _updated: SubmissionRow) {
    return this.assembleTimeline(scholarId, { hideLockedBodies: true });
  }

  private async addComment(submissionId: string, authorId: string, body: string) {
    const trimmed = this.requireTrimmed(body, 'Comment is required');
    const created = await this.insertComment(submissionId, authorId, trimmed);
    const [author] = await database
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, authorId))
      .limit(1);
    return this.formatComment(created, author?.name ?? 'Unknown');
  }

  private async insertComment(submissionId: string, authorId: string, body: string) {
    const [created] = await database
      .insert(proposalComments)
      .values({ submissionId, authorId, body })
      .returning();
    return created;
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

  private async resourcesByStep() {
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
          eq(resources.category, 'Proposal')
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
