import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { database } from '../db/connection';
import { CoordinatorNotesService } from './coordinator-notes.service';

jest.mock('../db/connection', () => ({
  database: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

const scholarId = '11111111-1111-4111-8111-111111111111';
const noteId = '22222222-2222-4222-8222-222222222222';
const meetingId = '33333333-3333-4333-8333-333333333333';
const actorId = 'staff-user-1';

function mockSelectSequence(results: unknown[][]) {
  let call = 0;
  (database.select as jest.Mock).mockImplementation(() => {
    const rows = results[call] ?? [];
    call += 1;
    const chain: Record<string, unknown> = {};
    const thenable = {
      from: jest.fn().mockReturnValue(chain),
      innerJoin: jest.fn().mockReturnValue(chain),
      leftJoin: jest.fn().mockReturnValue(chain),
      where: jest.fn().mockReturnValue(chain),
      orderBy: jest.fn().mockResolvedValue(rows),
      limit: jest.fn().mockResolvedValue(rows),
    };
    Object.assign(chain, thenable);
    return thenable;
  });
}

describe('CoordinatorNotesService', () => {
  let service: CoordinatorNotesService;

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [CoordinatorNotesService],
    }).compile();
    service = module.get(CoordinatorNotesService);
  });

  it('throws 404 when listing notes for a missing scholar', async () => {
    mockSelectSequence([[]]);
    await expect(service.listNotes(scholarId)).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns notes newest first with author names', async () => {
    const newer = {
      id: noteId,
      scholarId,
      body: 'Latest note',
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    mockSelectSequence([[{ id: scholarId }], [{ note: newer, authorName: 'Ada Coordinator' }]]);

    const result = await service.listNotes(scholarId);

    expect(result).toEqual([
      expect.objectContaining({
        id: noteId,
        body: 'Latest note',
        authorName: 'Ada Coordinator',
      }),
    ]);
  });

  it('creates a note for an existing scholar', async () => {
    mockSelectSequence([[{ id: scholarId }], [{ name: 'Ada Coordinator' }]]);
    const created = {
      id: noteId,
      scholarId,
      body: 'Private follow-up',
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    (database.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([created]),
      }),
    });

    const result = await service.createNote(scholarId, actorId, { body: '  Private follow-up  ' });

    expect(result.body).toBe('Private follow-up');
    expect(result.authorName).toBe('Ada Coordinator');
  });

  it('rejects a meeting with no content', async () => {
    mockSelectSequence([[{ id: scholarId }]]);
    await expect(
      service.createMeeting(scholarId, actorId, { meetingDate: '2026-09-03' })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('rejects an impossible calendar date', async () => {
    mockSelectSequence([[{ id: scholarId }]]);
    await expect(
      service.createMeeting(scholarId, actorId, {
        meetingDate: '2026-02-31',
        concern: 'Late',
      })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.insert).not.toHaveBeenCalled();
  });

  it('creates a meeting with concern and further action', async () => {
    mockSelectSequence([[{ id: scholarId }], [{ name: 'Ada Coordinator' }]]);
    const created = {
      id: meetingId,
      scholarId,
      meetingDate: '2026-09-03',
      notes: null,
      concern: 'Missed deadline',
      furtherAction: 'Follow up Friday',
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    (database.insert as jest.Mock).mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([created]),
      }),
    });

    const result = await service.createMeeting(scholarId, actorId, {
      meetingDate: '2026-09-03',
      concern: 'Missed deadline',
      furtherAction: 'Follow up Friday',
    });

    expect(result).toEqual(
      expect.objectContaining({
        meetingDate: '2026-09-03',
        concern: 'Missed deadline',
        furtherAction: 'Follow up Friday',
        authorName: 'Ada Coordinator',
      })
    );
  });

  it('rejects clearing every meeting content field on update', async () => {
    const existing = {
      id: meetingId,
      scholarId,
      meetingDate: '2026-09-03',
      notes: 'Weekly',
      concern: null,
      furtherAction: null,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    mockSelectSequence([[{ id: scholarId }], [existing]]);

    await expect(
      service.updateMeeting(scholarId, meetingId, actorId, { notes: '   ' })
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(database.update).not.toHaveBeenCalled();
  });

  it('returns 404 when deleting a note that does not belong to the scholar', async () => {
    mockSelectSequence([[{ id: scholarId }], []]);
    await expect(service.deleteNote(scholarId, noteId)).rejects.toBeInstanceOf(NotFoundException);
    expect(database.delete).not.toHaveBeenCalled();
  });

  it('updates and deletes a note for the matching scholar', async () => {
    const existing = {
      id: noteId,
      scholarId,
      body: 'Old',
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    const updated = { ...existing, body: 'New', updatedAt: new Date('2026-09-03T13:00:00.000Z') };
    mockSelectSequence([
      [{ id: scholarId }],
      [existing],
      [{ name: 'Ada Coordinator' }],
      [{ id: scholarId }],
      [existing],
    ]);
    (database.update as jest.Mock).mockReturnValue({
      set: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([updated]),
        }),
      }),
    });
    (database.delete as jest.Mock).mockReturnValue({
      where: jest.fn().mockResolvedValue(undefined),
    });

    const result = await service.updateNote(scholarId, noteId, actorId, { body: 'New' });
    expect(result.body).toBe('New');
    await expect(service.deleteNote(scholarId, noteId)).resolves.toEqual({ success: true });
    expect(database.delete).toHaveBeenCalled();
  });

  it('lists meetings newest date first', async () => {
    const meeting = {
      id: meetingId,
      scholarId,
      meetingDate: '2026-09-03',
      notes: 'Weekly',
      concern: null,
      furtherAction: null,
      createdBy: actorId,
      updatedBy: actorId,
      createdAt: new Date('2026-09-03T12:00:00.000Z'),
      updatedAt: new Date('2026-09-03T12:00:00.000Z'),
    };
    mockSelectSequence([[{ id: scholarId }], [{ meeting, authorName: 'Ada Coordinator' }]]);

    const result = await service.listMeetings(scholarId);
    expect(result).toEqual([
      expect.objectContaining({
        id: meetingId,
        meetingDate: '2026-09-03',
        notes: 'Weekly',
        authorName: 'Ada Coordinator',
      }),
    ]);
  });
});
