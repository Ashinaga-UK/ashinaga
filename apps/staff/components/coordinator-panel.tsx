'use client';

import { Loader2, Pencil, Plus, Trash2 } from 'lucide-react';
import { useState } from 'react';
import type { CoordinatorMeetingUpdate, CoordinatorNote } from '../lib/api-client';
import {
  useCoordinatorMeetingUpdates,
  useCoordinatorNotes,
  useCreateCoordinatorMeetingUpdate,
  useCreateCoordinatorNote,
  useDeleteCoordinatorMeetingUpdate,
  useDeleteCoordinatorNote,
  useUpdateCoordinatorMeetingUpdate,
  useUpdateCoordinatorNote,
} from '../lib/hooks/use-queries';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';
import { Button } from './ui/button';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { Textarea } from './ui/textarea';
import { useToast } from './ui/use-toast';

function formatIsoDate(value: string) {
  const [year, month, day] = value.split('-').map(Number);
  if (!year || !month || !day) {
    return value;
  }
  return new Date(year, month - 1, day).toLocaleDateString();
}

function formatTimestamp(value: string) {
  return new Date(value).toLocaleString();
}

function mutationErrorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

export function CoordinatorPanel({ scholarId }: { scholarId: string }) {
  return (
    <div className="space-y-6">
      <PrivateNotesSection scholarId={scholarId} />
      <MeetingLogSection scholarId={scholarId} />
    </div>
  );
}

function PrivateNotesSection({ scholarId }: { scholarId: string }) {
  const { toast } = useToast();
  const { data: notes = [], isLoading } = useCoordinatorNotes(scholarId);
  const createNote = useCreateCoordinatorNote(scholarId);
  const updateNote = useUpdateCoordinatorNote(scholarId);
  const deleteNote = useDeleteCoordinatorNote(scholarId);
  const [body, setBody] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [pendingDelete, setPendingDelete] = useState<CoordinatorNote | null>(null);

  const handleCreate = async () => {
    const trimmed = body.trim();
    if (!trimmed) {
      return;
    }
    try {
      await createNote.mutateAsync({ body: trimmed });
      setBody('');
    } catch (error) {
      toast({
        title: 'Could not save note',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async (noteId: string) => {
    const trimmed = editingBody.trim();
    if (!trimmed) {
      return;
    }
    try {
      await updateNote.mutateAsync({ noteId, body: trimmed });
      setEditingId(null);
      setEditingBody('');
    } catch (error) {
      toast({
        title: 'Could not update note',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteNote.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      toast({
        title: 'Could not delete note',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Private notes</h3>
        <p className="text-sm text-muted-foreground">
          Staff only. Scholars cannot see these notes.
        </p>
      </div>
      <Card>
        <CardContent className="space-y-3 pt-4">
          <Label htmlFor="coordinator-note-body">Add a note</Label>
          <Textarea
            id="coordinator-note-body"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            placeholder="Write a private coordinator note"
            rows={3}
          />
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={!body.trim() || createNote.isPending}
          >
            {createNote.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add note
          </Button>
        </CardContent>
      </Card>
      {isLoading ? (
        <div className="flex items-center py-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading private notes...
        </div>
      ) : notes.length === 0 ? (
        <p className="text-sm text-muted-foreground">No private notes yet.</p>
      ) : (
        <ul className="space-y-3">
          {notes.map((note) => (
            <li key={note.id}>
              <Card>
                <CardContent className="space-y-3 pt-4">
                  {editingId === note.id ? (
                    <>
                      <Textarea
                        value={editingBody}
                        onChange={(event) => setEditingBody(event.target.value)}
                        rows={3}
                        aria-label="Edit note"
                      />
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleUpdate(note.id)}
                          disabled={!editingBody.trim() || updateNote.isPending}
                        >
                          {updateNote.isPending && (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditingId(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <p className="whitespace-pre-wrap text-sm">{note.body}</p>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-xs text-muted-foreground">
                          {note.authorName} · {formatTimestamp(note.createdAt)}
                          {note.updatedAt !== note.createdAt ? ' · edited' : ''}
                        </p>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setEditingId(note.id);
                              setEditingBody(note.body);
                            }}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(note)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note?</AlertDialogTitle>
            <AlertDialogDescription>
              This private note will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteNote.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}

function MeetingLogSection({ scholarId }: { scholarId: string }) {
  const { toast } = useToast();
  const { data: meetings = [], isLoading } = useCoordinatorMeetingUpdates(scholarId);
  const createMeeting = useCreateCoordinatorMeetingUpdate(scholarId);
  const updateMeeting = useUpdateCoordinatorMeetingUpdate(scholarId);
  const deleteMeeting = useDeleteCoordinatorMeetingUpdate(scholarId);
  const [meetingDate, setMeetingDate] = useState('');
  const [notes, setNotes] = useState('');
  const [concern, setConcern] = useState('');
  const [furtherAction, setFurtherAction] = useState('');
  const [editing, setEditing] = useState<CoordinatorMeetingUpdate | null>(null);
  const [pendingDelete, setPendingDelete] = useState<CoordinatorMeetingUpdate | null>(null);

  const canCreate = Boolean(
    meetingDate && (notes.trim() || concern.trim() || furtherAction.trim())
  );

  const handleCreate = async () => {
    if (!canCreate) {
      return;
    }
    try {
      await createMeeting.mutateAsync({
        meetingDate,
        notes: notes.trim() || undefined,
        concern: concern.trim() || undefined,
        furtherAction: furtherAction.trim() || undefined,
      });
      setMeetingDate('');
      setNotes('');
      setConcern('');
      setFurtherAction('');
    } catch (error) {
      toast({
        title: 'Could not save meeting update',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleUpdate = async () => {
    if (!editing) {
      return;
    }
    if (!editing.notes?.trim() && !editing.concern?.trim() && !editing.furtherAction?.trim()) {
      toast({
        title: 'Could not update meeting',
        description: 'Add notes, a concern, or a further action.',
        variant: 'destructive',
      });
      return;
    }
    try {
      await updateMeeting.mutateAsync({
        updateId: editing.id,
        data: {
          meetingDate: editing.meetingDate,
          notes: editing.notes ?? '',
          concern: editing.concern ?? '',
          furtherAction: editing.furtherAction ?? '',
        },
      });
      setEditing(null);
    } catch (error) {
      toast({
        title: 'Could not update meeting',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  const handleDelete = async () => {
    if (!pendingDelete) {
      return;
    }
    try {
      await deleteMeeting.mutateAsync(pendingDelete.id);
      setPendingDelete(null);
    } catch (error) {
      toast({
        title: 'Could not delete meeting update',
        description: mutationErrorMessage(error, 'Please try again.'),
        variant: 'destructive',
      });
    }
  };

  return (
    <section className="space-y-3">
      <div>
        <h3 className="text-lg font-semibold">Meeting log</h3>
        <p className="text-sm text-muted-foreground">
          Dated coordinator updates with notes, concern, and further action.
        </p>
      </div>
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Add meeting update</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-1.5">
            <Label htmlFor="meeting-date">Date</Label>
            <Input
              id="meeting-date"
              type="date"
              value={meetingDate}
              onChange={(event) => setMeetingDate(event.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting-notes">Notes</Label>
            <Textarea
              id="meeting-notes"
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting-concern">Concern</Label>
            <Textarea
              id="meeting-concern"
              value={concern}
              onChange={(event) => setConcern(event.target.value)}
              rows={2}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="meeting-further-action">Further action</Label>
            <Textarea
              id="meeting-further-action"
              value={furtherAction}
              onChange={(event) => setFurtherAction(event.target.value)}
              rows={2}
            />
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => void handleCreate()}
            disabled={!canCreate || createMeeting.isPending}
          >
            {createMeeting.isPending ? (
              <Loader2 className="mr-1 h-4 w-4 animate-spin" />
            ) : (
              <Plus className="mr-1 h-4 w-4" />
            )}
            Add meeting
          </Button>
        </CardContent>
      </Card>
      {isLoading ? (
        <div className="flex items-center py-4 text-sm text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Loading meeting log...
        </div>
      ) : meetings.length === 0 ? (
        <p className="text-sm text-muted-foreground">No meeting updates yet.</p>
      ) : (
        <ul className="space-y-3">
          {meetings.map((meeting) => (
            <li key={meeting.id}>
              <Card>
                <CardContent className="space-y-3 pt-4">
                  {editing?.id === meeting.id ? (
                    <>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-meeting-date-${meeting.id}`}>Date</Label>
                        <Input
                          id={`edit-meeting-date-${meeting.id}`}
                          type="date"
                          value={editing.meetingDate}
                          onChange={(event) =>
                            setEditing({ ...editing, meetingDate: event.target.value })
                          }
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-meeting-notes-${meeting.id}`}>Notes</Label>
                        <Textarea
                          id={`edit-meeting-notes-${meeting.id}`}
                          value={editing.notes ?? ''}
                          onChange={(event) =>
                            setEditing({ ...editing, notes: event.target.value })
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-meeting-concern-${meeting.id}`}>Concern</Label>
                        <Textarea
                          id={`edit-meeting-concern-${meeting.id}`}
                          value={editing.concern ?? ''}
                          onChange={(event) =>
                            setEditing({ ...editing, concern: event.target.value })
                          }
                          rows={2}
                        />
                      </div>
                      <div className="space-y-1.5">
                        <Label htmlFor={`edit-meeting-action-${meeting.id}`}>Further action</Label>
                        <Textarea
                          id={`edit-meeting-action-${meeting.id}`}
                          value={editing.furtherAction ?? ''}
                          onChange={(event) =>
                            setEditing({ ...editing, furtherAction: event.target.value })
                          }
                          rows={2}
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          type="button"
                          size="sm"
                          onClick={() => void handleUpdate()}
                          disabled={updateMeeting.isPending}
                        >
                          {updateMeeting.isPending && (
                            <Loader2 className="mr-1 h-4 w-4 animate-spin" />
                          )}
                          Save
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={() => setEditing(null)}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="font-medium">{formatIsoDate(meeting.meetingDate)}</p>
                          <p className="text-xs text-muted-foreground">
                            {meeting.authorName} · {formatTimestamp(meeting.createdAt)}
                          </p>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditing(meeting)}
                          >
                            <Pencil className="mr-1 h-3.5 w-3.5" />
                            Edit
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            className="text-destructive hover:text-destructive"
                            onClick={() => setPendingDelete(meeting)}
                          >
                            <Trash2 className="mr-1 h-3.5 w-3.5" />
                            Delete
                          </Button>
                        </div>
                      </div>
                      {meeting.notes ? (
                        <p className="whitespace-pre-wrap text-sm">
                          <span className="text-muted-foreground">Notes: </span>
                          {meeting.notes}
                        </p>
                      ) : null}
                      {meeting.concern ? (
                        <p className="whitespace-pre-wrap text-sm">
                          <span className="text-muted-foreground">Concern: </span>
                          {meeting.concern}
                        </p>
                      ) : null}
                      {meeting.furtherAction ? (
                        <p className="whitespace-pre-wrap text-sm">
                          <span className="text-muted-foreground">Further action: </span>
                          {meeting.furtherAction}
                        </p>
                      ) : null}
                    </>
                  )}
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => {
          if (!open) {
            setPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete meeting update?</AlertDialogTitle>
            <AlertDialogDescription>
              This meeting log entry will be removed. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={(event) => {
                event.preventDefault();
                void handleDelete();
              }}
            >
              {deleteMeeting.isPending && <Loader2 className="mr-1 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}
