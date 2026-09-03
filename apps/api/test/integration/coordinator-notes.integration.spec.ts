import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import { eq } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import type { Pool } from 'pg';
import request from 'supertest';
import { coordinatorMeetingUpdates, coordinatorNotes, scholars } from '../../src/db/schema';
import {
  type AuthContext,
  createAuthenticatedIntegrationApp,
  createIntegrationApp,
} from './helpers/create-app';
import {
  cleanupSeeded,
  getTestPool,
  type SeededScholar,
  type SeededStaff,
  seedScholarUser,
  seedStaffUser,
} from './helpers/seed';

const NOTE_SECRET = 'ash-84-private-note-secret-do-not-leak';
const CONCERN_SECRET = 'ash-84-private-concern-secret-do-not-leak';
const MISSING_SCHOLAR_ID = '00000000-0000-4000-8000-000000000000';

describe('Coordinator notes API (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;
  let auth: AuthContext;
  let pool: Pool;
  let db: NodePgDatabase;
  let staffActor: SeededStaff;
  let prepScholar: SeededScholar;
  let otherScholar: SeededScholar;
  let noteId: string;
  let meetingId: string;

  beforeAll(async () => {
    const built = await createAuthenticatedIntegrationApp();
    app = built.app;
    auth = built.auth;
    const testDatabase = getTestPool();
    pool = testDatabase.pool;
    db = testDatabase.db;

    staffActor = await seedStaffUser(db, { name: 'Notes Staff' });
    prepScholar = await seedScholarUser(db, {
      name: 'Prep Candidate',
      programStage: 'prep_year',
    });
    otherScholar = await seedScholarUser(db, {
      name: 'Other Scholar',
      programStage: 'scholar',
    });

    asStaff();
    const createdNote = await request(app.getHttpServer())
      .post(`/api/scholars/${prepScholar.scholarId}/coordinator-notes`)
      .send({ body: NOTE_SECRET })
      .expect(201);
    noteId = createdNote.body.id;

    const createdMeeting = await request(app.getHttpServer())
      .post(`/api/scholars/${prepScholar.scholarId}/meeting-updates`)
      .send({
        meetingDate: '2026-09-03',
        notes: 'Weekly check-in',
        concern: CONCERN_SECRET,
        furtherAction: 'Email the university',
      })
      .expect(201);
    meetingId = createdMeeting.body.id;
  }, 30000);

  afterAll(async () => {
    await cleanupSeeded(db, {
      userIds: [staffActor.userId, prepScholar.userId, otherScholar.userId],
      scholarIds: [prepScholar.scholarId, otherScholar.scholarId],
    });
    await pool.end();
    await app.close();
  }, 15000);

  function asStaff() {
    auth.setUser({
      id: staffActor.userId,
      email: staffActor.email,
      userType: 'staff',
    });
  }

  function asScholar() {
    auth.setUser({
      id: prepScholar.userId,
      email: prepScholar.email,
      userType: 'scholar',
    });
  }

  it('lets staff CRUD notes and meeting updates', async () => {
    asStaff();

    const listedNotes = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/coordinator-notes`)
      .expect(200);
    expect(listedNotes.body.some((note: { id: string }) => note.id === noteId)).toBe(true);
    expect(listedNotes.body[0].authorName).toBe('Notes Staff');

    const extraNote = await request(app.getHttpServer())
      .post(`/api/scholars/${prepScholar.scholarId}/coordinator-notes`)
      .send({ body: 'Second private note' })
      .expect(201);

    const updatedNote = await request(app.getHttpServer())
      .patch(`/api/scholars/${prepScholar.scholarId}/coordinator-notes/${extraNote.body.id}`)
      .send({ body: 'Second private note edited' })
      .expect(200);
    expect(updatedNote.body.body).toBe('Second private note edited');

    await request(app.getHttpServer())
      .delete(`/api/scholars/${prepScholar.scholarId}/coordinator-notes/${extraNote.body.id}`)
      .expect(200);

    const extraMeeting = await request(app.getHttpServer())
      .post(`/api/scholars/${prepScholar.scholarId}/meeting-updates`)
      .send({
        meetingDate: '2026-09-04',
        concern: 'Temporary concern',
        furtherAction: 'Temporary action',
      })
      .expect(201);

    const updatedMeeting = await request(app.getHttpServer())
      .patch(`/api/scholars/${prepScholar.scholarId}/meeting-updates/${extraMeeting.body.id}`)
      .send({ furtherAction: 'Call Friday' })
      .expect(200);
    expect(updatedMeeting.body.furtherAction).toBe('Call Friday');
    expect(updatedMeeting.body.concern).toBe('Temporary concern');

    await request(app.getHttpServer())
      .delete(`/api/scholars/${prepScholar.scholarId}/meeting-updates/${extraMeeting.body.id}`)
      .expect(200);

    await request(app.getHttpServer())
      .post(`/api/scholars/${prepScholar.scholarId}/meeting-updates`)
      .send({ meetingDate: '2026-09-03' })
      .expect(400);
  });

  it('returns 404 for a missing scholar and does not leak notes across scholars', async () => {
    asStaff();
    await request(app.getHttpServer())
      .get(`/api/scholars/${MISSING_SCHOLAR_ID}/coordinator-notes`)
      .expect(404);

    await request(app.getHttpServer())
      .patch(`/api/scholars/${otherScholar.scholarId}/coordinator-notes/${noteId}`)
      .send({ body: 'should not work' })
      .expect(404);
  });

  it('returns 403 when a scholar session hits note or meeting routes', async () => {
    asScholar();
    const routes = [
      ['get', `/api/scholars/${prepScholar.scholarId}/coordinator-notes`],
      ['post', `/api/scholars/${prepScholar.scholarId}/coordinator-notes`],
      ['patch', `/api/scholars/${prepScholar.scholarId}/coordinator-notes/${noteId}`],
      ['delete', `/api/scholars/${prepScholar.scholarId}/coordinator-notes/${noteId}`],
      ['get', `/api/scholars/${prepScholar.scholarId}/meeting-updates`],
      ['post', `/api/scholars/${prepScholar.scholarId}/meeting-updates`],
      ['patch', `/api/scholars/${prepScholar.scholarId}/meeting-updates/${meetingId}`],
      ['delete', `/api/scholars/${prepScholar.scholarId}/meeting-updates/${meetingId}`],
    ] as const;

    for (const [method, path] of routes) {
      await request(app.getHttpServer())[method](path).send({ body: 'nope' }).expect(403);
    }
  });

  it('does not put note or meeting bodies on scholar list, detail, staff profile, or my-profile', async () => {
    asStaff();
    const notes = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/coordinator-notes`)
      .expect(200);
    expect(JSON.stringify(notes.body)).toContain(NOTE_SECRET);

    const meetings = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/meeting-updates`)
      .expect(200);
    expect(JSON.stringify(meetings.body)).toContain(CONCERN_SECRET);

    const list = await request(app.getHttpServer()).get('/api/scholars').expect(200);
    expect(JSON.stringify(list.body)).not.toContain(NOTE_SECRET);
    expect(JSON.stringify(list.body)).not.toContain(CONCERN_SECRET);

    const detail = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}`)
      .expect(200);
    expect(JSON.stringify(detail.body)).not.toContain(NOTE_SECRET);
    expect(JSON.stringify(detail.body)).not.toContain(CONCERN_SECRET);
    expect(detail.body).not.toHaveProperty('coordinatorNotes');
    expect(detail.body).not.toHaveProperty('meetingUpdates');

    const staffProfile = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/profile`)
      .expect(200);
    expect(JSON.stringify(staffProfile.body)).not.toContain(NOTE_SECRET);
    expect(JSON.stringify(staffProfile.body)).not.toContain(CONCERN_SECRET);
    expect(staffProfile.body).not.toHaveProperty('coordinatorNotes');
    expect(staffProfile.body).not.toHaveProperty('meetingUpdates');

    asScholar();
    const myProfile = await request(app.getHttpServer())
      .get('/api/scholars/my-profile')
      .expect(200);
    expect(JSON.stringify(myProfile.body)).not.toContain(NOTE_SECRET);
    expect(JSON.stringify(myProfile.body)).not.toContain(CONCERN_SECRET);
    expect(myProfile.body).not.toHaveProperty('coordinatorNotes');
    expect(myProfile.body).not.toHaveProperty('meetingUpdates');
    expect(myProfile.body).not.toHaveProperty('furtherAction');
  });

  it('keeps notes after the scholar is enrolled from prep_year', async () => {
    asStaff();
    await db
      .update(scholars)
      .set({ programStage: 'scholar', updatedAt: new Date() })
      .where(eq(scholars.id, prepScholar.scholarId));

    const notes = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/coordinator-notes`)
      .expect(200);
    expect(notes.body.some((note: { body: string }) => note.body.includes(NOTE_SECRET))).toBe(true);

    const meetings = await request(app.getHttpServer())
      .get(`/api/scholars/${prepScholar.scholarId}/meeting-updates`)
      .expect(200);
    expect(
      meetings.body.some(
        (meeting: { concern: string | null }) => meeting.concern === CONCERN_SECRET
      )
    ).toBe(true);

    const remainingNotes = await db
      .select()
      .from(coordinatorNotes)
      .where(eq(coordinatorNotes.scholarId, prepScholar.scholarId));
    const remainingMeetings = await db
      .select()
      .from(coordinatorMeetingUpdates)
      .where(eq(coordinatorMeetingUpdates.scholarId, prepScholar.scholarId));
    expect(remainingNotes.length).toBeGreaterThan(0);
    expect(remainingMeetings.length).toBeGreaterThan(0);
  });
});

describe('Coordinator notes API unauthenticated (integration)', () => {
  let app: import('@nestjs/platform-fastify').NestFastifyApplication;

  beforeAll(async () => {
    app = await createIntegrationApp();
  }, 30000);

  afterAll(async () => {
    await app.close();
  }, 15000);

  it('returns 401 on notes and meeting routes without a session', async () => {
    await request(app.getHttpServer())
      .get(`/api/scholars/${MISSING_SCHOLAR_ID}/coordinator-notes`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/scholars/${MISSING_SCHOLAR_ID}/coordinator-notes`)
      .send({ body: 'nope' })
      .expect(401);
    await request(app.getHttpServer())
      .get(`/api/scholars/${MISSING_SCHOLAR_ID}/meeting-updates`)
      .expect(401);
    await request(app.getHttpServer())
      .post(`/api/scholars/${MISSING_SCHOLAR_ID}/meeting-updates`)
      .send({ meetingDate: '2026-09-03', concern: 'nope' })
      .expect(401);
  });
});
