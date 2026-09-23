import { BadRequestException, Injectable, Logger } from '@nestjs/common';
import { and, count, desc, eq, ilike, inArray, isNull, ne, or, sql } from 'drizzle-orm';
import { matchAnyNormalizedValue } from '../common/audience-filters/audience-filter.sql';
import { database } from '../db/connection';
import {
  notificationDeliveries,
  requestAssignees,
  scholarNotifications,
  scholars,
  staff,
  staffNotifications,
  taskResponses,
  tasks,
  users,
} from '../db/schema';
import { EmailService } from '../email/email.service';
import { PROPOSAL_STEPS } from '../proposals/proposal-steps';
import { isTaskDueInCalendarDays, isTaskOverdue } from '../tasks/task-due';
import {
  type CreateScholarNotificationInput,
  type GetScholarFeedQueryDto,
  type MarkScholarNotificationsReadDto,
  type ScholarFeedResponseDto,
  type ScholarNotificationDto,
} from './dto/scholar-notifications.dto';
import {
  type CreateStaffNotificationInput,
  type GetStaffFeedQueryDto,
  type MarkStaffNotificationsReadDto,
  type StaffFeedResponseDto,
  type StaffNotificationDto,
} from './dto/staff-notifications.dto';
import { brandedEmail, escapeHtml } from './email-layout';
import { dueSoonWindowLabel, inactivityDays, reminderDays } from './notification-config';
import {
  NOTIFICATION_KINDS,
  SCHOLAR_FEED_KINDS,
  STAFF_FEED_KINDS,
  type ScholarFeedKind,
  type StaffFeedKind,
} from './notification-kinds';
import {
  isMonthlySummaryDay,
  isStaleLastActivity,
  isWeeklyStaffDigestDay,
  monthlyDedupeKey,
  staffDigestDedupeKey,
  utcDateKey,
  utcMonthRange,
} from './notification-windows';

type ScholarAudience = 'prep_year' | 'scholar';

@Injectable()
export class NotificationsService {
  private readonly logger = new Logger(NotificationsService.name);

  constructor(private readonly emailService: EmailService) {}

  async runDailyJobs(now = new Date()): Promise<{
    dueSoon: number;
    monthlySummaries: number;
    staffDigests: number;
  }> {
    const dueSoon = await this.sendDueSoonReminders(now);
    const staffDigests = isWeeklyStaffDigestDay(now) ? await this.sendStaffDigests(now) : 0;
    const monthlySummaries = isMonthlySummaryDay(now) ? await this.sendMonthlySummaries(now) : 0;
    return { dueSoon, monthlySummaries, staffDigests };
  }

  async notifyProposalFeedback(input: {
    scholarId: string;
    stepKey: string;
    action: 'approve' | 'request_changes' | 'comment';
    eventId: string;
    comment?: string | null;
  }): Promise<void> {
    const recipient = await this.scholarRecipient(input.scholarId);
    if (!recipient) return;

    const claim = {
      kind: NOTIFICATION_KINDS.proposalFeedback,
      recipientUserId: recipient.userId,
      dedupeKey: `${input.scholarId}:${input.stepKey}:${input.action}:${input.eventId}`,
    };
    const claimId = await this.claimDelivery(claim);
    if (!claimId) return;

    const stepTitle =
      PROPOSAL_STEPS.find((step) => step.key === input.stepKey)?.title ?? input.stepKey;
    const audience = audienceNoun(recipient.programStage);
    const actionCopy = proposalActionCopy(input.action, stepTitle);
    const portalUrl = `${scholarAppUrl()}/proposal`;
    const commentHtml = input.comment
      ? `<div style="background: #f8f9fa; padding: 16px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #0D9488;"><p style="white-space: pre-wrap; margin: 0;">${escapeHtml(input.comment)}</p></div>`
      : '';
    const commentText = input.comment ? `\n\nComment:\n${input.comment}` : '';
    const email = brandedEmail({
      title: actionCopy.title,
      greeting: `Dear ${recipient.name},`,
      bodyHtml: `<p>${escapeHtml(actionCopy.body(audience))}</p>${commentHtml}`,
      textBody: `${actionCopy.body(audience)}${commentText}`,
      ctaUrl: portalUrl,
      ctaLabel: 'Open proposal',
    });

    const delivered = await this.sendAfterClaim(claimId, recipient.email, actionCopy.title, email);
    if (!delivered) {
      throw new Error(`Failed to send proposal feedback to ${recipient.email}`);
    }
  }

  async createStaffNotifications(rows: CreateStaffNotificationInput[]): Promise<number> {
    if (rows.length === 0) return 0;

    const values = rows.map((row) => ({
      recipientUserId: row.recipientUserId,
      kind: row.kind,
      title: row.title,
      body: row.body,
      scholarId: row.scholarId ?? null,
      scholarName: row.scholarName ?? null,
      entityType: row.entityType,
      entityId: row.entityId,
      href: row.href,
      requestType: row.requestType ?? null,
      dedupeSuffix: row.dedupeSuffix ?? '',
    }));

    const inserted = await database
      .insert(staffNotifications)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: staffNotifications.id });

    return inserted.length;
  }

  async getStaffFeed(userId: string, query: GetStaffFeedQueryDto): Promise<StaffFeedResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const conditions = [eq(staffNotifications.recipientUserId, userId)];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(staffNotifications.scholarName, pattern),
          ilike(staffNotifications.requestType, pattern),
          ilike(staffNotifications.kind, pattern),
          ilike(staffNotifications.title, pattern)
        )!
      );
    }
    const whereClause = and(...conditions);

    const [items, totalRow, unreadRow] = await Promise.all([
      database
        .select()
        .from(staffNotifications)
        .where(whereClause)
        .orderBy(desc(staffNotifications.createdAt))
        .limit(limit)
        .offset(offset),
      database.select({ value: count() }).from(staffNotifications).where(whereClause),
      database
        .select({ value: count() })
        .from(staffNotifications)
        .where(
          and(eq(staffNotifications.recipientUserId, userId), isNull(staffNotifications.readAt))
        ),
    ]);

    return {
      items: items.map(toStaffNotificationDto),
      total: Number(totalRow[0]?.value ?? 0),
      unreadCount: Number(unreadRow[0]?.value ?? 0),
      page,
      limit,
    };
  }

  async markStaffNotificationsRead(
    userId: string,
    dto: MarkStaffNotificationsReadDto
  ): Promise<{ updated: number }> {
    const markAll = dto.all === true;
    const ids = dto.ids ?? [];

    if (markAll === Boolean(ids.length)) {
      throw new BadRequestException('Provide either ids or all: true, not both or neither');
    }

    const now = new Date();
    const conditions = [
      eq(staffNotifications.recipientUserId, userId),
      isNull(staffNotifications.readAt),
    ];
    if (!markAll) {
      conditions.push(inArray(staffNotifications.id, ids));
    }

    const updated = await database
      .update(staffNotifications)
      .set({ readAt: now })
      .where(and(...conditions))
      .returning({ id: staffNotifications.id });

    return { updated: updated.length };
  }

  async notifyRequestReceived(input: {
    requestId: string;
    scholarId: string;
    scholarName: string;
    requestType: string;
    assigneeIds: string[];
  }): Promise<void> {
    const recipients = await this.requestAudienceUserIds(input.assigneeIds);
    const typeLabel = formatRequestType(input.requestType);
    const href = buildRequestHref(input.scholarName, input.requestId);

    await this.createStaffNotifications(
      recipients.map((recipientUserId) => ({
        recipientUserId,
        kind: STAFF_FEED_KINDS.requestReceived,
        title: `New request from ${input.scholarName}`,
        body: `${input.scholarName} submitted a ${typeLabel} request`,
        scholarId: input.scholarId,
        scholarName: input.scholarName,
        entityType: 'request',
        entityId: input.requestId,
        href,
        requestType: input.requestType,
        dedupeSuffix: 'created',
      }))
    );
  }

  async notifyRequestStatusChanged(input: {
    requestId: string;
    scholarId: string;
    scholarName: string;
    requestType: string;
    status: string;
    actorUserId?: string | null;
    dedupeSuffix: string;
  }): Promise<void> {
    const assigneeIds = await this.requestAssigneeUserIds(input.requestId);
    let recipients = await this.requestAudienceUserIds(assigneeIds);
    if (input.actorUserId) {
      recipients = recipients.filter((id) => id !== input.actorUserId);
    }

    const typeLabel = formatRequestType(input.requestType);
    const statusLabel = formatStatus(input.status);
    const href = buildRequestHref(input.scholarName, input.requestId);

    await this.createStaffNotifications(
      recipients.map((recipientUserId) => ({
        recipientUserId,
        kind: STAFF_FEED_KINDS.requestStatusChanged,
        title: `Request ${statusLabel} for ${input.scholarName}`,
        body: `${input.scholarName}'s ${typeLabel} request is now ${statusLabel}`,
        scholarId: input.scholarId,
        scholarName: input.scholarName,
        entityType: 'request',
        entityId: input.requestId,
        href,
        requestType: input.requestType,
        dedupeSuffix: input.dedupeSuffix,
      }))
    );
  }

  async notifyTaskCompleted(input: {
    taskId: string;
    taskTitle: string;
    scholarId: string;
    scholarName: string;
    completedAt: Date;
  }): Promise<void> {
    const recipients = await this.activeStaffUserIds();
    const href = `/?tab=scholars&view=scholar-profile&scholarId=${encodeURIComponent(input.scholarId)}&scholarTab=tasks`;

    await this.createStaffNotifications(
      recipients.map((recipientUserId) => ({
        recipientUserId,
        kind: STAFF_FEED_KINDS.taskCompleted,
        title: `${input.scholarName} completed a task`,
        body: `${input.scholarName} completed "${input.taskTitle}"`,
        scholarId: input.scholarId,
        scholarName: input.scholarName,
        entityType: 'task',
        entityId: input.taskId,
        href,
        dedupeSuffix: input.completedAt.toISOString(),
      }))
    );
  }

  async notifyAnnualReviewSubmitted(input: {
    annualUpdateId: string;
    scholarId: string;
    scholarName: string;
    academicYear: string;
  }): Promise<void> {
    const recipients = await this.activeStaffUserIds();
    const href = `/?tab=scholars&view=scholar-profile&scholarId=${encodeURIComponent(input.scholarId)}&scholarTab=annual-reviews`;

    await this.createStaffNotifications(
      recipients.map((recipientUserId) => ({
        recipientUserId,
        kind: STAFF_FEED_KINDS.annualReviewSubmitted,
        title: `${input.scholarName} submitted annual review`,
        body: `${input.scholarName} submitted their ${input.academicYear} annual review`,
        scholarId: input.scholarId,
        scholarName: input.scholarName,
        entityType: 'annual_update',
        entityId: input.annualUpdateId,
        href,
        dedupeSuffix: input.academicYear,
      }))
    );
  }

  async createScholarNotifications(rows: CreateScholarNotificationInput[]): Promise<number> {
    if (rows.length === 0) return 0;

    const values = rows.map((row) => ({
      recipientUserId: row.recipientUserId,
      kind: row.kind,
      title: row.title,
      body: row.body,
      entityType: row.entityType,
      entityId: row.entityId,
      href: row.href,
      dedupeSuffix: row.dedupeSuffix ?? '',
    }));

    const inserted = await database
      .insert(scholarNotifications)
      .values(values)
      .onConflictDoNothing()
      .returning({ id: scholarNotifications.id });

    return inserted.length;
  }

  async getScholarFeed(
    userId: string,
    query: GetScholarFeedQueryDto
  ): Promise<ScholarFeedResponseDto> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const offset = (page - 1) * limit;
    const search = query.search?.trim();

    const conditions = [eq(scholarNotifications.recipientUserId, userId)];
    if (search) {
      const pattern = `%${search}%`;
      conditions.push(
        or(
          ilike(scholarNotifications.kind, pattern),
          ilike(scholarNotifications.title, pattern),
          ilike(scholarNotifications.body, pattern)
        )!
      );
    }
    const whereClause = and(...conditions);

    const [items, totalRow, unreadRow] = await Promise.all([
      database
        .select()
        .from(scholarNotifications)
        .where(whereClause)
        .orderBy(desc(scholarNotifications.createdAt))
        .limit(limit)
        .offset(offset),
      database.select({ value: count() }).from(scholarNotifications).where(whereClause),
      database
        .select({ value: count() })
        .from(scholarNotifications)
        .where(
          and(
            eq(scholarNotifications.recipientUserId, userId),
            isNull(scholarNotifications.readAt)
          )
        ),
    ]);

    return {
      items: items.map(toScholarNotificationDto),
      total: Number(totalRow[0]?.value ?? 0),
      unreadCount: Number(unreadRow[0]?.value ?? 0),
      page,
      limit,
    };
  }

  async markScholarNotificationsRead(
    userId: string,
    dto: MarkScholarNotificationsReadDto
  ): Promise<{ updated: number }> {
    const markAll = dto.all === true;
    const ids = dto.ids ?? [];

    if (markAll === Boolean(ids.length)) {
      throw new BadRequestException('Provide either ids or all: true, not both or neither');
    }

    const now = new Date();
    const conditions = [
      eq(scholarNotifications.recipientUserId, userId),
      isNull(scholarNotifications.readAt),
    ];
    if (!markAll) {
      conditions.push(inArray(scholarNotifications.id, ids));
    }

    const updated = await database
      .update(scholarNotifications)
      .set({ readAt: now })
      .where(and(...conditions))
      .returning({ id: scholarNotifications.id });

    return { updated: updated.length };
  }

  async notifyTaskAssigned(input: {
    assignments: Array<{ taskId: string; scholarId: string; title: string }>;
  }): Promise<void> {
    if (input.assignments.length === 0) return;

    const scholarIds = Array.from(new Set(input.assignments.map((row) => row.scholarId)));
    const recipients = await database
      .select({ scholarId: scholars.id, userId: scholars.userId })
      .from(scholars)
      .where(inArray(scholars.id, scholarIds));
    const userIdByScholarId = new Map(recipients.map((row) => [row.scholarId, row.userId]));

    await this.createScholarNotifications(
      input.assignments.flatMap((assignment) => {
        const recipientUserId = userIdByScholarId.get(assignment.scholarId);
        if (!recipientUserId) return [];
        return [
          {
            recipientUserId,
            kind: SCHOLAR_FEED_KINDS.taskAssigned,
            title: 'New task assigned',
            body: assignment.title,
            entityType: 'task',
            entityId: assignment.taskId,
            href: '/tasks',
            dedupeSuffix: '',
          },
        ];
      })
    );
  }

  async notifyAnnouncementCreated(input: {
    announcementId: string;
    title: string;
    scholarIds: string[];
  }): Promise<void> {
    if (input.scholarIds.length === 0) return;

    const recipients = await database
      .select({ userId: scholars.userId })
      .from(scholars)
      .where(inArray(scholars.id, input.scholarIds));

    await this.createScholarNotifications(
      recipients.map((recipient) => ({
        recipientUserId: recipient.userId,
        kind: SCHOLAR_FEED_KINDS.announcementCreated,
        title: 'New announcement',
        body: input.title,
        entityType: 'announcement',
        entityId: input.announcementId,
        href: '/announcements',
        dedupeSuffix: '',
      }))
    );
  }

  async notifyResourceLive(input: {
    resourceId: string;
    title: string;
    filters: Array<{ filterType: string; filterValue: string }>;
  }): Promise<void> {
    const recipientUserIds = await this.scholarUserIdsMatchingAudience(input.filters);
    if (recipientUserIds.length === 0) return;

    await this.createScholarNotifications(
      recipientUserIds.map((recipientUserId) => ({
        recipientUserId,
        kind: SCHOLAR_FEED_KINDS.resourceLive,
        title: 'New resource available',
        body: input.title,
        entityType: 'resource',
        entityId: input.resourceId,
        href: '/resources',
        dedupeSuffix: 'live',
      }))
    );
  }

  private async scholarUserIdsMatchingAudience(
    filters: Array<{ filterType: string; filterValue: string }>
  ): Promise<string[]> {
    const filtersByType = new Map<string, string[]>();
    for (const filter of filters) {
      const values = filtersByType.get(filter.filterType) ?? [];
      values.push(filter.filterValue);
      filtersByType.set(filter.filterType, values);
    }

    const scholarColumns = {
      year: scholars.year,
      program: scholars.program,
      university: scholars.university,
      status: scholars.status,
      location: scholars.location,
    };
    const whereConditions = Array.from(filtersByType.entries()).map(([type, values]) => {
      const column = scholarColumns[type as keyof typeof scholarColumns];
      if (!column) return sql`FALSE`;
      return matchAnyNormalizedValue(column, values);
    });

    const whereClause = whereConditions.length > 0 ? and(...whereConditions) : undefined;
    const matching = await database
      .select({ userId: scholars.userId })
      .from(scholars)
      .where(whereClause);

    return matching.map((row) => row.userId);
  }

  private async requestAssigneeUserIds(requestId: string): Promise<string[]> {
    const rows = await database
      .select({ userId: requestAssignees.userId })
      .from(requestAssignees)
      .where(eq(requestAssignees.requestId, requestId));
    return rows.map((row) => row.userId);
  }

  private async requestAudienceUserIds(assigneeIds: string[]): Promise<string[]> {
    const uniqueAssigneeIds = [...new Set(assigneeIds.filter(Boolean))];
    const activeAssignees =
      uniqueAssigneeIds.length === 0
        ? []
        : await database
            .select({ userId: staff.userId })
            .from(staff)
            .where(and(eq(staff.isActive, true), inArray(staff.userId, uniqueAssigneeIds)));

    const superAdmins = await database
      .select({ userId: staff.userId })
      .from(staff)
      .where(and(eq(staff.isActive, true), eq(staff.isSuperAdmin, true)));

    return Array.from(
      new Set([
        ...activeAssignees.map((row) => row.userId),
        ...superAdmins.map((row) => row.userId),
      ])
    );
  }

  private async activeStaffUserIds(): Promise<string[]> {
    const rows = await database
      .select({ userId: staff.userId })
      .from(staff)
      .where(eq(staff.isActive, true));
    return rows.map((row) => row.userId);
  }

  private async sendDueSoonReminders(now: Date): Promise<number> {
    const days = reminderDays();
    const rows = await database
      .select({
        taskId: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        scholarName: users.name,
        scholarEmail: users.email,
        userId: users.id,
        programStage: scholars.programStage,
      })
      .from(tasks)
      .innerJoin(scholars, eq(tasks.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(and(isNull(tasks.deletedAt), ne(tasks.status, 'completed')));

    let sent = 0;
    for (const row of rows) {
      if (!isTaskDueInCalendarDays(row, days, now)) continue;
      const claimId = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.taskDueSoon,
        recipientUserId: row.userId,
        dedupeKey: `${row.taskId}:${utcDateKey(row.dueDate)}`,
      });
      if (!claimId) continue;

      const dueLabel = formatDueDate(row.dueDate);
      const windowLabel = dueSoonWindowLabel(days);
      const subject = `Reminder: ${row.title} is due ${windowLabel}`;
      const audience = audienceNoun(row.programStage);
      const email = brandedEmail({
        title: subject,
        greeting: `Dear ${row.scholarName},`,
        bodyHtml: `<p>This is a reminder that your ${escapeHtml(audience)} task <strong>${escapeHtml(row.title)}</strong> is due on <strong>${escapeHtml(dueLabel)}</strong> (${escapeHtml(windowLabel)}).</p>`,
        textBody: `Your ${audience} task "${row.title}" is due on ${dueLabel} (${windowLabel}).`,
        ctaUrl: `${scholarAppUrl()}/tasks`,
        ctaLabel: 'Open tasks',
      });
      if (await this.sendAfterClaim(claimId, row.scholarEmail, subject, email)) {
        sent += 1;
      }
    }
    return sent;
  }

  private async sendMonthlySummaries(now: Date): Promise<number> {
    const lastMonth = utcMonthRange(now, -1);
    const thisMonth = utcMonthRange(now, 0);
    const recipientRows = await database
      .select({
        scholarId: scholars.id,
        userId: users.id,
        name: users.name,
        email: users.email,
        programStage: scholars.programStage,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.status, 'active'));

    const openTasks = await database
      .select({
        scholarId: tasks.scholarId,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        completedAt: tasks.completedAt,
      })
      .from(tasks)
      .where(isNull(tasks.deletedAt));

    let sent = 0;
    const monthKey = monthlyDedupeKey(now);
    for (const recipient of recipientRows) {
      const completed = openTasks.filter(
        (task) =>
          task.scholarId === recipient.scholarId &&
          task.status === 'completed' &&
          task.completedAt &&
          task.completedAt >= lastMonth.start &&
          task.completedAt < lastMonth.end
      );
      const due = openTasks.filter(
        (task) =>
          task.scholarId === recipient.scholarId &&
          task.status !== 'completed' &&
          task.dueDate >= thisMonth.start &&
          task.dueDate < thisMonth.end
      );
      if (completed.length === 0 && due.length === 0) continue;

      const claimId = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.monthlySummary,
        recipientUserId: recipient.userId,
        dedupeKey: monthKey,
      });
      if (!claimId) continue;

      const audience = audienceNoun(recipient.programStage);
      const completedHtml = listHtml(
        completed.map((task) => task.title),
        'No tasks completed last month.'
      );
      const dueHtml = listHtml(
        due.map((task) => `${task.title} — ${formatDueDate(task.dueDate)}`),
        'No tasks due this month.'
      );
      const email = brandedEmail({
        title: 'Your monthly task summary',
        greeting: `Dear ${recipient.name},`,
        bodyHtml: `<p>Here is your ${escapeHtml(audience)} task summary.</p><p><strong>Completed last month</strong></p>${completedHtml}<p><strong>Due this month</strong></p>${dueHtml}`,
        textBody: `Completed last month:\n${listText(completed.map((task) => task.title))}\n\nDue this month:\n${listText(due.map((task) => `${task.title} — ${formatDueDate(task.dueDate)}`))}`,
        ctaUrl: `${scholarAppUrl()}/tasks`,
        ctaLabel: 'Open tasks',
      });
      if (await this.sendAfterClaim(claimId, recipient.email, 'Your monthly task summary', email)) {
        sent += 1;
      }
    }
    return sent;
  }

  private async sendStaffDigests(now: Date): Promise<number> {
    const staffRecipients = await database
      .select({ userId: users.id, email: users.email, name: users.name })
      .from(staff)
      .innerJoin(users, eq(staff.userId, users.id))
      .where(eq(staff.isActive, true));
    if (staffRecipients.length === 0) return 0;

    const scholarRows = await database
      .select({
        scholarId: scholars.id,
        name: users.name,
        lastActivity: scholars.lastActivity,
        status: scholars.status,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.status, 'active'));

    const inactive = scholarRows.filter((row) => isStaleLastActivity(row.lastActivity, now));

    const incompleteTasks = await database
      .select({
        taskId: tasks.id,
        title: tasks.title,
        dueDate: tasks.dueDate,
        status: tasks.status,
        scholarName: users.name,
      })
      .from(tasks)
      .innerJoin(scholars, eq(tasks.scholarId, scholars.id))
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(
        and(isNull(tasks.deletedAt), ne(tasks.status, 'completed'), eq(scholars.status, 'active'))
      );

    const taskIds = incompleteTasks.map((task) => task.taskId);
    const responses =
      taskIds.length === 0
        ? []
        : await database
            .select({ taskId: taskResponses.taskId })
            .from(taskResponses)
            .where(inArray(taskResponses.taskId, taskIds));
    const submitted = new Set(responses.map((row) => row.taskId));
    const overdueWithoutSubmission = incompleteTasks.filter(
      (task) => isTaskOverdue(task, now) && !submitted.has(task.taskId)
    );
    if (inactive.length === 0 && overdueWithoutSubmission.length === 0) return 0;

    const digestKey = staffDigestDedupeKey(now);
    const inactiveHtml = listHtml(
      inactive.map((row) => row.name),
      'None'
    );
    const overdueHtml = listHtml(
      overdueWithoutSubmission.map((task) => `${task.scholarName}: ${task.title}`),
      'None'
    );
    const textBody = `No recent activity (${inactivityDays()} days):\n${listText(inactive.map((row) => row.name))}\n\nOverdue with no submission:\n${listText(overdueWithoutSubmission.map((task) => `${task.scholarName}: ${task.title}`))}`;

    let sent = 0;
    for (const recipient of staffRecipients) {
      const claimId = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.staffDigest,
        recipientUserId: recipient.userId,
        dedupeKey: digestKey,
      });
      if (!claimId) continue;

      const email = brandedEmail({
        title: 'Weekly coordinator alerts',
        greeting: `Dear ${recipient.name},`,
        bodyHtml: `<p>Candidates who need attention on the scholar list:</p><p><strong>No recent activity</strong></p>${inactiveHtml}<p><strong>Overdue tasks with no submission</strong></p>${overdueHtml}`,
        textBody,
        ctaUrl: staffScholarsUrl(),
        ctaLabel: 'Open scholar list',
      });
      if (await this.sendAfterClaim(claimId, recipient.email, 'Weekly coordinator alerts', email)) {
        sent += 1;
      }
    }
    return sent;
  }

  private async scholarRecipient(scholarId: string) {
    const [row] = await database
      .select({
        userId: users.id,
        name: users.name,
        email: users.email,
        programStage: scholars.programStage,
      })
      .from(scholars)
      .innerJoin(users, eq(scholars.userId, users.id))
      .where(eq(scholars.id, scholarId))
      .limit(1);
    return row ?? null;
  }

  private async claimDelivery(input: {
    kind: string;
    recipientUserId: string;
    dedupeKey: string;
  }): Promise<string | null> {
    const [row] = await database
      .insert(notificationDeliveries)
      .values({
        kind: input.kind,
        recipientUserId: input.recipientUserId,
        dedupeKey: input.dedupeKey,
      })
      .onConflictDoNothing()
      .returning({ id: notificationDeliveries.id });
    return row?.id ?? null;
  }

  private async releaseDelivery(claimId: string): Promise<void> {
    await database.delete(notificationDeliveries).where(eq(notificationDeliveries.id, claimId));
  }

  private async sendAfterClaim(
    claimId: string,
    to: string,
    subject: string,
    email: { html: string; text: string }
  ): Promise<boolean> {
    try {
      await this.emailService.sendEmail({ to, subject, html: email.html, text: email.text });
      return true;
    } catch (error) {
      this.logger.error(`Failed to send "${subject}" to ${to}`, error);
      await this.releaseDelivery(claimId);
      return false;
    }
  }
}

function toStaffNotificationDto(row: typeof staffNotifications.$inferSelect): StaffNotificationDto {
  return {
    id: row.id,
    kind: row.kind as StaffFeedKind,
    title: row.title,
    body: row.body,
    scholarId: row.scholarId,
    scholarName: row.scholarName,
    entityType: row.entityType,
    entityId: row.entityId,
    href: row.href,
    requestType: row.requestType,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

function toScholarNotificationDto(
  row: typeof scholarNotifications.$inferSelect
): ScholarNotificationDto {
  return {
    id: row.id,
    kind: row.kind as ScholarFeedKind,
    title: row.title,
    body: row.body,
    entityType: row.entityType,
    entityId: row.entityId,
    href: row.href,
    readAt: row.readAt,
    createdAt: row.createdAt,
  };
}

function buildRequestHref(scholarName: string, requestId: string, status?: string): string {
  const params = new URLSearchParams({
    tab: 'requests',
    search: scholarName,
    requestId,
  });
  if (status) params.set('status', status);
  return `/?${params.toString()}`;
}

function formatRequestType(type: string): string {
  return type.replace(/_/g, ' ');
}

function formatStatus(status: string): string {
  return status.replace(/_/g, ' ');
}

function audienceNoun(programStage: ScholarAudience | string): string {
  return programStage === 'prep_year' ? 'Prep Year' : 'scholar';
}

function scholarAppUrl(): string {
  return process.env.SCHOLAR_APP_URL || 'http://localhost:4002';
}

function staffAppUrl(): string {
  return process.env.STAFF_APP_URL || 'http://localhost:4001';
}

function staffScholarsUrl(): string {
  return `${staffAppUrl().replace(/\/$/, '')}/?tab=scholars`;
}

function formatDueDate(dueDate: Date): string {
  return new Date(dueDate).toLocaleDateString('en-GB', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    timeZone: 'UTC',
  });
}

function proposalActionCopy(
  action: 'approve' | 'request_changes' | 'comment',
  stepTitle: string
): { title: string; body: (audience: string) => string } {
  if (action === 'approve') {
    return {
      title: `${stepTitle} approved`,
      body: (audience) =>
        `Your coordinator approved the ${stepTitle} step of your ${audience} proposal. The next step is now available.`,
    };
  }
  if (action === 'request_changes') {
    return {
      title: `Changes requested on ${stepTitle}`,
      body: (audience) =>
        `Your coordinator requested changes on the ${stepTitle} step of your ${audience} proposal.`,
    };
  }
  return {
    title: `New comment on ${stepTitle}`,
    body: (audience) =>
      `Your coordinator left feedback on the ${stepTitle} step of your ${audience} proposal.`,
  };
}

function listHtml(items: string[], empty: string): string {
  if (items.length === 0) {
    return `<p>${escapeHtml(empty)}</p>`;
  }
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>`;
}

function listText(items: string[]): string {
  if (items.length === 0) return 'None';
  return items.map((item) => `- ${item}`).join('\n');
}
