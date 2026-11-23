import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { afterAll, describe, expect, it } from '@jest/globals';
import { getTestPool } from './helpers/seed';

const testDatabase = getTestPool();

describe('resource category migration', () => {
  afterAll(async () => {
    await testDatabase.close();
  });

  it('queues every legacy category for review and preserves proposal context', async () => {
    const schema = `resource_category_migration_${Date.now()}`;
    const client = await testDatabase.pool.connect();

    try {
      await client.query(`CREATE SCHEMA "${schema}"`);
      await client.query(`SET search_path TO "${schema}"`);
      await client.query(`
        CREATE TYPE "${schema}"."resource_category"
          AS ENUM ('LDF', 'Handbook', 'Proposal', 'Support');
        CREATE TABLE "${schema}"."user" (
          "id" text PRIMARY KEY
        );
        CREATE TABLE "${schema}"."resources" (
          "id" uuid PRIMARY KEY,
          "title" text NOT NULL,
          "category" "${schema}"."resource_category" NOT NULL
        );
        INSERT INTO "${schema}"."resources" ("id", "title", "category") VALUES
          ('00000000-0000-0000-0000-000000000001', 'LDF resource', 'LDF'),
          ('00000000-0000-0000-0000-000000000002', 'Handbook resource', 'Handbook'),
          ('00000000-0000-0000-0000-000000000003', 'Proposal resource', 'Proposal'),
          ('00000000-0000-0000-0000-000000000004', 'Support resource', 'Support');
      `);

      const migration = await readFile(
        resolve(process.cwd(), 'src/db/migrations/0036_cheerful_lethal_legion.sql'),
        'utf8'
      );
      await client.query(migration.replaceAll('"public".', `"${schema}".`));

      const resources = await client.query<{
        title: string;
        category: string;
        proposal_context: boolean;
      }>(
        `SELECT "title", "category", "proposal_context"
         FROM "${schema}"."resources"
         ORDER BY "title"`
      );
      expect(resources.rows).toEqual([
        { title: 'Handbook resource', category: 'Other', proposal_context: false },
        { title: 'LDF resource', category: 'Other', proposal_context: false },
        { title: 'Proposal resource', category: 'Other', proposal_context: true },
        { title: 'Support resource', category: 'Other', proposal_context: false },
      ]);

      const reviews = await client.query<{
        resource_title: string;
        legacy_category: string;
        final_category: string | null;
      }>(
        `SELECT "resource_title", "legacy_category", "final_category"
         FROM "${schema}"."resource_category_reviews"
         ORDER BY "resource_title"`
      );
      expect(reviews.rows).toEqual([
        {
          resource_title: 'Handbook resource',
          legacy_category: 'Handbook',
          final_category: null,
        },
        { resource_title: 'LDF resource', legacy_category: 'LDF', final_category: null },
        {
          resource_title: 'Proposal resource',
          legacy_category: 'Proposal',
          final_category: null,
        },
        {
          resource_title: 'Support resource',
          legacy_category: 'Support',
          final_category: null,
        },
      ]);

      await expect(
        client.query(
          `UPDATE "${schema}"."resources"
           SET "category" = 'Support'
           WHERE "title" = 'Support resource'`
        )
      ).rejects.toThrow();
    } finally {
      await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
      client.release();
    }
  });
});
