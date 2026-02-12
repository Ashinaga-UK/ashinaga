/**
 * Integration tests for Scholars API.
 * These tests call real HTTP endpoints against a running Nest app and a real DB.
 * They verify that the API layer and persistence work together correctly.
 */
import { afterAll, beforeAll, describe, expect, it } from '@jest/globals';
import type { INestApplication } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import request from 'supertest';
import { scholars, users } from '../../src/db/schema';
import { createIntegrationApp } from './helpers/create-app';

describe('Scholars API (integration)', () => {
  let app: INestApplication;
  let pool: Pool;
  let seededScholarId: string;
  let seededUserId: string;
  const testUserEmail = `integration-test-${Date.now()}@example.com`;

  beforeAll(async () => {
    app = await createIntegrationApp();
    const server = app.getHttpServer();
    if (!server) throw new Error('HTTP server not available');

    pool = new Pool({
      host: process.env.DB_HOST || 'localhost',
      port: Number(process.env.DB_PORT) || 5433,
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'postgres',
      max: 2,
    });
    const db = drizzle(pool);

    const [insertedUser] = await db
      .insert(users)
      .values({
        id: `integration-user-${Date.now()}`,
        name: 'Integration Test Scholar',
        email: testUserEmail,
        emailVerified: true,
        userType: 'scholar',
      })
      .returning({ id: users.id });

    if (!insertedUser) throw new Error('Failed to seed user');
    seededUserId = insertedUser.id;

    const [insertedScholar] = await db
      .insert(scholars)
      .values({
        userId: seededUserId,
        program: 'Integration Test Program',
        year: 'Year 1',
        university: 'Test University',
        startDate: new Date('2024-09-01'),
        status: 'active',
      })
      .returning({ id: scholars.id });

    if (!insertedScholar) throw new Error('Failed to seed scholar');
    seededScholarId = insertedScholar.id;
  }, 20000);

  afterAll(async () => {
    if (pool && seededUserId) {
      const db = drizzle(pool);
      await db.delete(scholars).where(eq(scholars.userId, seededUserId));
      await db.delete(users).where(eq(users.id, seededUserId));
      await pool.end();
    }
    if (app) await app.close();
  }, 15000);

  describe('GET /health', () => {
    it('returns 200 and status ok', async () => {
      const res = await request(app.getHttpServer()).get('/health').expect(200);
      expect(res.body).toMatchObject({
        status: 'ok',
        environment: expect.any(String),
        uptime: expect.any(Number),
      });
      expect(res.body.timestamp).toBeDefined();
    });
  });

  describe('GET /api/scholars', () => {
    it('returns 200 with data and pagination', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/scholars')
        .query({ page: 1, limit: 10 })
        .expect(200);

      expect(res.body).toHaveProperty('data');
      expect(res.body).toHaveProperty('pagination');
      expect(Array.isArray(res.body.data)).toBe(true);
      expect(res.body.pagination).toMatchObject({
        page: 1,
        limit: 10,
        totalItems: expect.any(Number),
        totalPages: expect.any(Number),
        hasNext: expect.any(Boolean),
        hasPrev: expect.any(Boolean),
      });
    });

    it('returns at least the seeded scholar', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/scholars')
        .query({ limit: 100 })
        .expect(200);

      const found = res.body.data.find((s: { id: string }) => s.id === seededScholarId);
      expect(found).toBeDefined();
      expect(found.name).toBe('Integration Test Scholar');
      expect(found.email).toBe(testUserEmail);
      expect(found.program).toBe('Integration Test Program');
      expect(found.university).toBe('Test University');
      expect(found.status).toBe('active');
    });

    it('excludes archived scholars by default', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/scholars')
        .query({ status: 'archived', limit: 100 })
        .expect(200);

      const activeScholarInArchivedList = res.body.data.find(
        (s: { id: string; status: string }) => s.id === seededScholarId && s.status === 'archived'
      );
      expect(activeScholarInArchivedList).toBeUndefined();
    });
  });

  describe('GET /api/scholars/filters', () => {
    it('returns 200 with programs, years, universities arrays', async () => {
      const res = await request(app.getHttpServer()).get('/api/scholars/filters').expect(200);

      expect(res.body).toHaveProperty('programs');
      expect(res.body).toHaveProperty('years');
      expect(res.body).toHaveProperty('universities');
      expect(Array.isArray(res.body.programs)).toBe(true);
      expect(Array.isArray(res.body.years)).toBe(true);
      expect(Array.isArray(res.body.universities)).toBe(true);
    });
  });

  describe('GET /api/scholars/stats', () => {
    it('returns 200 with total, active, inactive, onHold, archived', async () => {
      const res = await request(app.getHttpServer()).get('/api/scholars/stats').expect(200);

      expect(res.body).toMatchObject({
        total: expect.any(Number),
        active: expect.any(Number),
        inactive: expect.any(Number),
        onHold: expect.any(Number),
        archived: expect.any(Number),
      });
    });
  });

  describe('GET /api/scholars/:id', () => {
    it('returns 200 and scholar when id exists', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/scholars/${seededScholarId}`)
        .expect(200);

      expect(res.body.id).toBe(seededScholarId);
      expect(res.body.name).toBe('Integration Test Scholar');
      expect(res.body.email).toBe(testUserEmail);
      expect(res.body.program).toBe('Integration Test Program');
      expect(res.body.goals).toBeDefined();
      expect(res.body.tasks).toBeDefined();
    });

    it('returns 404 for non-existent scholar id', async () => {
      await request(app.getHttpServer())
        .get('/api/scholars/00000000-0000-0000-0000-000000000000')
        .expect(404);
    });
  });

  describe('GET /api/scholars/:id/profile', () => {
    it('returns 200 and full profile when id exists', async () => {
      const res = await request(app.getHttpServer())
        .get(`/api/scholars/${seededScholarId}/profile`)
        .expect(200);

      expect(res.body.id).toBe(seededScholarId);
      expect(res.body.userId).toBe(seededUserId);
      expect(res.body.name).toBe('Integration Test Scholar');
      expect(res.body.email).toBe(testUserEmail);
      expect(res.body.program).toBe('Integration Test Program');
      expect(res.body.year).toBe('Year 1');
      expect(res.body.university).toBe('Test University');
      expect(res.body.status).toBe('active');
      expect(res.body).toHaveProperty('aaiScholarId');
      expect(res.body).toHaveProperty('dateOfBirth');
      expect(res.body).toHaveProperty('gender');
      expect(res.body).toHaveProperty('nationality');
      expect(res.body).toHaveProperty('emergencyContactCountryOfStudy');
      expect(res.body).toHaveProperty('emergencyContactHomeCountry');
      expect(res.body).toHaveProperty('graduationDate');
      expect(res.body).toHaveProperty('dietaryInformation');
      expect(res.body).toHaveProperty('kokorozashi');
      expect(res.body).toHaveProperty('goals');
      expect(res.body).toHaveProperty('tasks');
      expect(res.body).toHaveProperty('documents');
      expect(Array.isArray(res.body.goals)).toBe(true);
      expect(Array.isArray(res.body.tasks)).toBe(true);
      expect(Array.isArray(res.body.documents)).toBe(true);
    });

    it('returns 404 for non-existent scholar id', async () => {
      await request(app.getHttpServer())
        .get('/api/scholars/00000000-0000-0000-0000-000000000000/profile')
        .expect(404);
    });
  });
});
