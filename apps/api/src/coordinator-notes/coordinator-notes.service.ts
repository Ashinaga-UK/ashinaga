import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { and, desc, eq } from 'drizzle-orm';
import { alias } from 'drizzle-orm/pg-core';
import { database } from '../db/connection';
import { coordinatorMeetingUpdates, coordinatorNotes, scholars, users } from '../db/schema';
import type {
  CreateCoordinatorNoteDto,
  CreateMeetingUpdateDto,
  UpdateCoordinatorNoteDto,
  UpdateMeetingUpdateDto,
} from './dto/coordinator-notes.dto';
import { ISO_DATE_PATTERN } from './dto/coordinator-notes.dto';

const createdByUser = alias(users, 'coordinator_created_by');

type NoteRow = typeof coordinatorNotes.$inferSelect;
type MeetingRow = typeof coordinatorMeetingUpdates.$inferSelect;

@Injectable()
export class CoordinatorNotesService {
  async listNotes(scholarId: string) {
    await this.requireScholar(scholarId);

    const rows = await database
      .select({
        note: coordinatorNotes,
        authorName: createdByUser.name,
      })
      .from(coordinatorNotes)
      .leftJoin(createdByUser, eq(coordinatorNotes.createdBy, createdByUser.id))
      .where(eq(coordinatorNotes.scholarId, scholarId))
      .orderBy(desc(coordinatorNotes.createdAt));

    return rows.map((row) => this.formatNote(row.note, row.authorName));
  }

  async createNote(scholarId: string, actorId: string, dto: CreateCoordinatorNoteDto) {
    await this.requireScholar(scholarId);
    const body = this.requireTrimmed(dto.body, 'Note body is required');

    const [created] = await database
      .insert(coordinatorNotes)
      .values({
        scholarId,
        body,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();

    return this.formatNote(created, await this.getUserName(created.createdBy));
  }

  async updateNote(
    scholarId: string,
    noteId: string,
    actorId: string,
    dto: UpdateCoordinatorNoteDto
  ) {
    await this.requireScholar(scholarId);
    await this.requireNote(scholarId, noteId);
    const body = this.requireTrimmed(dto.body, 'Note body is required');

    const [updated] = await database
      .update(coordinatorNotes)
      .set({
        body,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(and(eq(coordinatorNotes.id, noteId), eq(coordinatorNotes.scholarId, scholarId)))
      .returning();

    return this.formatNote(updated, await this.getUserName(updated.createdBy));
  }

  async deleteNote(scholarId: string, noteId: string) {
    await this.requireScholar(scholarId);
    await this.requireNote(scholarId, noteId);

    await database
      .delete(coordinatorNotes)
      .where(and(eq(coordinatorNotes.id, noteId), eq(coordinatorNotes.scholarId, scholarId)));

    return { success: true };
  }

  async listMeetings(scholarId: string) {
    await this.requireScholar(scholarId);

    const rows = await database
      .select({
        meeting: coordinatorMeetingUpdates,
        authorName: createdByUser.name,
      })
      .from(coordinatorMeetingUpdates)
      .leftJoin(createdByUser, eq(coordinatorMeetingUpdates.createdBy, createdByUser.id))
      .where(eq(coordinatorMeetingUpdates.scholarId, scholarId))
      .orderBy(
        desc(coordinatorMeetingUpdates.meetingDate),
        desc(coordinatorMeetingUpdates.createdAt)
      );

    return rows.map((row) => this.formatMeeting(row.meeting, row.authorName));
  }

  async createMeeting(scholarId: string, actorId: string, dto: CreateMeetingUpdateDto) {
    await this.requireScholar(scholarId);
    const meetingDate = this.requireIsoDate(dto.meetingDate);
    const notes = this.blankToNull(dto.notes);
    const concern = this.blankToNull(dto.concern);
    const furtherAction = this.blankToNull(dto.furtherAction);
    this.assertMeetingContent({ notes, concern, furtherAction });

    const [created] = await database
      .insert(coordinatorMeetingUpdates)
      .values({
        scholarId,
        meetingDate,
        notes,
        concern,
        furtherAction,
        createdBy: actorId,
        updatedBy: actorId,
      })
      .returning();

    return this.formatMeeting(created, await this.getUserName(created.createdBy));
  }

  async updateMeeting(
    scholarId: string,
    updateId: string,
    actorId: string,
    dto: UpdateMeetingUpdateDto
  ) {
    await this.requireScholar(scholarId);
    const existing = await this.requireMeeting(scholarId, updateId);

    const meetingDate =
      dto.meetingDate !== undefined ? this.requireIsoDate(dto.meetingDate) : existing.meetingDate;
    const notes = dto.notes !== undefined ? this.blankToNull(dto.notes) : existing.notes;
    const concern = dto.concern !== undefined ? this.blankToNull(dto.concern) : existing.concern;
    const furtherAction =
      dto.furtherAction !== undefined
        ? this.blankToNull(dto.furtherAction)
        : existing.furtherAction;
    this.assertMeetingContent({ notes, concern, furtherAction });

    const [updated] = await database
      .update(coordinatorMeetingUpdates)
      .set({
        meetingDate,
        notes,
        concern,
        furtherAction,
        updatedBy: actorId,
        updatedAt: new Date(),
      })
      .where(
        and(
          eq(coordinatorMeetingUpdates.id, updateId),
          eq(coordinatorMeetingUpdates.scholarId, scholarId)
        )
      )
      .returning();

    return this.formatMeeting(updated, await this.getUserName(updated.createdBy));
  }

  async deleteMeeting(scholarId: string, updateId: string) {
    await this.requireScholar(scholarId);
    await this.requireMeeting(scholarId, updateId);

    await database
      .delete(coordinatorMeetingUpdates)
      .where(
        and(
          eq(coordinatorMeetingUpdates.id, updateId),
          eq(coordinatorMeetingUpdates.scholarId, scholarId)
        )
      );

    return { success: true };
  }

  private async requireScholar(scholarId: string) {
    const [scholar] = await database
      .select({ id: scholars.id })
      .from(scholars)
      .where(eq(scholars.id, scholarId))
      .limit(1);

    if (!scholar) {
      throw new NotFoundException('Scholar not found');
    }

    return scholar;
  }

  private async requireNote(scholarId: string, noteId: string): Promise<NoteRow> {
    const [note] = await database
      .select()
      .from(coordinatorNotes)
      .where(and(eq(coordinatorNotes.id, noteId), eq(coordinatorNotes.scholarId, scholarId)))
      .limit(1);

    if (!note) {
      throw new NotFoundException('Coordinator note not found');
    }

    return note;
  }

  private async requireMeeting(scholarId: string, updateId: string): Promise<MeetingRow> {
    const [meeting] = await database
      .select()
      .from(coordinatorMeetingUpdates)
      .where(
        and(
          eq(coordinatorMeetingUpdates.id, updateId),
          eq(coordinatorMeetingUpdates.scholarId, scholarId)
        )
      )
      .limit(1);

    if (!meeting) {
      throw new NotFoundException('Meeting update not found');
    }

    return meeting;
  }

  private async getUserName(userId: string): Promise<string> {
    const [user] = await database
      .select({ name: users.name })
      .from(users)
      .where(eq(users.id, userId))
      .limit(1);

    return user?.name ?? 'Unknown staff';
  }

  private formatNote(row: NoteRow, authorName: string | null) {
    return {
      id: row.id,
      scholarId: row.scholarId,
      body: row.body,
      createdBy: row.createdBy,
      authorName: authorName ?? 'Unknown staff',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private formatMeeting(row: MeetingRow, authorName: string | null) {
    return {
      id: row.id,
      scholarId: row.scholarId,
      meetingDate: row.meetingDate,
      notes: row.notes,
      concern: row.concern,
      furtherAction: row.furtherAction,
      createdBy: row.createdBy,
      authorName: authorName ?? 'Unknown staff',
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
    };
  }

  private requireTrimmed(value: string, message: string): string {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException(message);
    }
    return trimmed;
  }

  private blankToNull(value: string | null | undefined): string | null {
    if (value === undefined || value === null) {
      return null;
    }
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  private assertMeetingContent(fields: {
    notes: string | null;
    concern: string | null;
    furtherAction: string | null;
  }) {
    if (!fields.notes && !fields.concern && !fields.furtherAction) {
      throw new BadRequestException('At least one of notes, concern, or furtherAction is required');
    }
  }

  private requireIsoDate(value: string): string {
    if (!ISO_DATE_PATTERN.test(value)) {
      throw new BadRequestException('meetingDate must be YYYY-MM-DD');
    }

    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
      parsed.getUTCFullYear() !== year ||
      parsed.getUTCMonth() !== month - 1 ||
      parsed.getUTCDate() !== day
    ) {
      throw new BadRequestException('meetingDate is not a valid date');
    }

    return value;
  }
}
