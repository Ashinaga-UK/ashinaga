/**
 * One-shot migration: move data:image/... avatars from users.image into S3.
 *
 * Usage (from apps/api, with DB + S3 env set):
 *   pnpm db:migrate-avatars
 *
 * Skips nulls and http(s) URLs (e.g. dicebear seed). Legacy data URLs still
 * render via GET /api/avatars/:userId until this has been run.
 */
import { randomUUID } from 'node:crypto';
import { PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { eq, like } from 'drizzle-orm';
import { getDatabase } from './connection';
import { users } from './schema';

const DATA_URL_PATTERN = /^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/i;

async function main() {
  const bucketName = process.env.S3_BUCKET_NAME;
  if (!bucketName) {
    throw new Error('S3_BUCKET_NAME must be set');
  }

  const s3 = new S3Client({
    region: process.env.AWS_REGION || 'eu-west-3',
  });
  const db = getDatabase();

  const rows = await db
    .select({ id: users.id, image: users.image })
    .from(users)
    .where(like(users.image, 'data:image/%'));

  console.log(`Found ${rows.length} data-URL avatar(s) to migrate`);

  let migrated = 0;
  let failed = 0;

  for (const row of rows) {
    if (!row.image) continue;
    const match = row.image.match(DATA_URL_PATTERN);
    if (!match) {
      console.warn(`Skipping ${row.id}: unrecognised data URL`);
      failed += 1;
      continue;
    }

    const body = Buffer.from(match[2], 'base64');
    const key = `avatars/${row.id}/${randomUUID()}.jpg`;

    try {
      await s3.send(
        new PutObjectCommand({
          Bucket: bucketName,
          Key: key,
          Body: body,
          ContentType: 'image/jpeg',
        })
      );

      await db.update(users).set({ image: key, updatedAt: new Date() }).where(eq(users.id, row.id));

      migrated += 1;
      console.log(`Migrated ${row.id} -> ${key}`);
    } catch (error) {
      failed += 1;
      console.error(`Failed ${row.id}:`, error instanceof Error ? error.message : error);
    }
  }

  console.log(`Done. migrated=${migrated} failed=${failed}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
