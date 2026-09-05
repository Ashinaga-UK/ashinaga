import { GUARDS_METADATA } from '@nestjs/common/constants';
import { Test, type TestingModule } from '@nestjs/testing';
import { StaffGuard } from '../auth/staff.guard';
import { CoordinatorNotesController } from './coordinator-notes.controller';
import { CoordinatorNotesService } from './coordinator-notes.service';

const scholarId = '11111111-1111-4111-8111-111111111111';
const noteId = '22222222-2222-4222-8222-222222222222';
const meetingId = '33333333-3333-4333-8333-333333333333';

describe('CoordinatorNotesController', () => {
  let controller: CoordinatorNotesController;
  const service = {
    listNotes: jest.fn(),
    createNote: jest.fn(),
    updateNote: jest.fn(),
    deleteNote: jest.fn(),
    listMeetings: jest.fn(),
    createMeeting: jest.fn(),
    updateMeeting: jest.fn(),
    deleteMeeting: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CoordinatorNotesController],
      providers: [{ provide: CoordinatorNotesService, useValue: service }],
    }).compile();
    controller = module.get(CoordinatorNotesController);
  });

  it('applies StaffGuard at class level', () => {
    const guards = Reflect.getMetadata(GUARDS_METADATA, CoordinatorNotesController);
    expect(guards).toEqual(expect.arrayContaining([StaffGuard]));
  });

  it('lists notes for a scholar', async () => {
    service.listNotes.mockResolvedValue([{ id: noteId }]);
    await expect(controller.listNotes(scholarId)).resolves.toEqual([{ id: noteId }]);
    expect(service.listNotes).toHaveBeenCalledWith(scholarId);
  });

  it('creates a note with the authenticated staff id', async () => {
    service.createNote.mockResolvedValue({ id: noteId, body: 'Hello' });
    await expect(
      controller.createNote(scholarId, { body: 'Hello' }, { user: { id: 'staff-1' } } as never)
    ).resolves.toEqual({ id: noteId, body: 'Hello' });
    expect(service.createNote).toHaveBeenCalledWith(scholarId, 'staff-1', { body: 'Hello' });
  });

  it('updates and deletes notes', async () => {
    service.updateNote.mockResolvedValue({ id: noteId, body: 'Edited' });
    service.deleteNote.mockResolvedValue({ success: true });

    await expect(
      controller.updateNote(scholarId, noteId, { body: 'Edited' }, {
        user: { id: 'staff-1' },
      } as never)
    ).resolves.toEqual({ id: noteId, body: 'Edited' });
    await expect(controller.deleteNote(scholarId, noteId)).resolves.toEqual({ success: true });
  });

  it('creates, lists, updates, and deletes meeting updates', async () => {
    service.listMeetings.mockResolvedValue([{ id: meetingId }]);
    service.createMeeting.mockResolvedValue({ id: meetingId });
    service.updateMeeting.mockResolvedValue({ id: meetingId, concern: 'Updated' });
    service.deleteMeeting.mockResolvedValue({ success: true });

    await expect(controller.listMeetings(scholarId)).resolves.toEqual([{ id: meetingId }]);
    await expect(
      controller.createMeeting(scholarId, { meetingDate: '2026-09-03', concern: 'Late' }, {
        user: { id: 'staff-1' },
      } as never)
    ).resolves.toEqual({ id: meetingId });
    await expect(
      controller.updateMeeting(scholarId, meetingId, { concern: 'Updated' }, {
        user: { id: 'staff-1' },
      } as never)
    ).resolves.toEqual({ id: meetingId, concern: 'Updated' });
    await expect(controller.deleteMeeting(scholarId, meetingId)).resolves.toEqual({
      success: true,
    });
  });
});
