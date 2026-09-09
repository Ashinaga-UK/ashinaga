import { Injectable, Logger } from '@nestjs/common';
import { and, eq, inArray, isNull, ne } from 'drizzle-orm';
import { database } from '../db/connection';
import { notificationDeliveries, scholars, staff, taskResponses, tasks, users } from '../db/schema';
import { EmailService } from '../email/email.service';
import { PROPOSAL_STEPS } from '../proposals/proposal-steps';
import { isTaskDueInCalendarDays, isTaskOverdue } from '../tasks/task-due';
import { brandedEmail, escapeHtml } from './email-layout';
import { inactivityDays, reminderDays } from './notification-config';
import { NOTIFICATION_KINDS } from './notification-kinds';
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

    const claimed = await this.claimDelivery({
      kind: NOTIFICATION_KINDS.proposalFeedback,
      recipientUserId: recipient.userId,
      dedupeKey: `${input.scholarId}:${input.stepKey}:${input.action}:${input.eventId}`,
    });
    if (!claimed) return;

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

    await this.emailService.sendEmail({
      to: recipient.email,
      subject: actionCopy.title,
      html: email.html,
      text: email.text,
    });
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
      const claimed = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.taskDueSoon,
        recipientUserId: row.userId,
        dedupeKey: `${row.taskId}:${utcDateKey(row.dueDate)}`,
      });
      if (!claimed) continue;

      const dueLabel = formatDueDate(row.dueDate);
      const audience = audienceNoun(row.programStage);
      const email = brandedEmail({
        title: `Reminder: ${row.title} is due in 48 hours`,
        greeting: `Dear ${row.scholarName},`,
        bodyHtml: `<p>This is a reminder that your ${escapeHtml(audience)} task <strong>${escapeHtml(row.title)}</strong> is due on <strong>${escapeHtml(dueLabel)}</strong>.</p>`,
        textBody: `Your ${audience} task "${row.title}" is due on ${dueLabel}.`,
        ctaUrl: `${scholarAppUrl()}/tasks`,
        ctaLabel: 'Open tasks',
      });
      await this.safeSend(row.scholarEmail, `Reminder: ${row.title} is due in 48 hours`, email);
      sent += 1;
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

      const claimed = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.monthlySummary,
        recipientUserId: recipient.userId,
        dedupeKey: monthKey,
      });
      if (!claimed) continue;

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
      await this.safeSend(recipient.email, 'Your monthly task summary', email);
      sent += 1;
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
      const claimed = await this.claimDelivery({
        kind: NOTIFICATION_KINDS.staffDigest,
        recipientUserId: recipient.userId,
        dedupeKey: digestKey,
      });
      if (!claimed) continue;

      const email = brandedEmail({
        title: 'Weekly coordinator alerts',
        greeting: `Dear ${recipient.name},`,
        bodyHtml: `<p>Candidates who need attention on the scholar list:</p><p><strong>No recent activity</strong></p>${inactiveHtml}<p><strong>Overdue tasks with no submission</strong></p>${overdueHtml}`,
        textBody,
        ctaUrl: staffScholarsUrl(),
        ctaLabel: 'Open scholar list',
      });
      await this.safeSend(recipient.email, 'Weekly coordinator alerts', email);
      sent += 1;
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
  }): Promise<boolean> {
    const [row] = await database
      .insert(notificationDeliveries)
      .values({
        kind: input.kind,
        recipientUserId: input.recipientUserId,
        dedupeKey: input.dedupeKey,
      })
      .onConflictDoNothing()
      .returning({ id: notificationDeliveries.id });
    return Boolean(row);
  }

  private async safeSend(
    to: string,
    subject: string,
    email: { html: string; text: string }
  ): Promise<void> {
    try {
      await this.emailService.sendEmail({ to, subject, html: email.html, text: email.text });
    } catch (error) {
      this.logger.error(`Failed to send "${subject}" to ${to}`, error);
    }
  }
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
