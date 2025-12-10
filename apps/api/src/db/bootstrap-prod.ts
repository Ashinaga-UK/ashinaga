/**
 * Production Bootstrap Script
 *
 * This script creates the first admin staff member and their invitation.
 * Run this once after deploying to production to bootstrap the system.
 *
 * Usage:
 *   NODE_ENV=production DB_HOST=... DB_PORT=... DB_NAME=... DB_USER=... DB_PASSWORD=... \
 *   ts-node -r tsconfig-paths/register src/db/bootstrap-prod.ts
 *
 * Or via pnpm:
 *   pnpm db:bootstrap-prod
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { generateInvitationToken } from '../auth/auth.config';
import * as schema from './schema';

// Generate Better Auth compatible IDs
function generateId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let id = '';
  for (let i = 0; i < 32; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return id;
}

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: Number(process.env.DB_PORT) || 5432,
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'postgres',
  database: process.env.DB_NAME || 'postgres',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
});

const db = drizzle(pool, { schema });

async function bootstrapProduction() {
  console.log('🚀 Starting production bootstrap...');
  console.log('This will create a root user and an invitation for the first admin.\n');

  try {
    // Check if any invitations already exist
    const existingInvitations = await db.select().from(schema.invitations).limit(1);
    if (existingInvitations.length > 0) {
      console.log('⚠️  Invitations already exist. Skipping bootstrap.');
      console.log(
        'If you need to create additional staff, use the invitation endpoint after logging in.'
      );
      process.exit(0);
    }

    // Get the admin email from environment variable or command line argument
    const adminEmail = process.env.STAFF_EMAIL || process.argv[2];
    if (!adminEmail) {
      console.error('❌ ERROR: Admin email is required!');
      console.error('Usage: STAFF_EMAIL=email@example.com ts-node src/db/bootstrap-prod.ts');
      console.error('   Or: ts-node src/db/bootstrap-prod.ts email@example.com');
      process.exit(1);
    }

    const adminEmailLower = adminEmail.toLowerCase().trim();
    console.log(`📧 Creating invitation for admin: ${adminEmailLower}\n`);

    // Step 1: Create a simple root user (just for the invitedBy reference)
    console.log('1. Creating root system user...');
    const rootUserId = generateId();
    const rootEmail = 'root@ashinaga-system.org'; // System email that won't conflict

    const [rootUser] = await db
      .insert(schema.users)
      .values({
        id: rootUserId,
        name: 'Staff Root',
        email: rootEmail,
        emailVerified: false,
        image: null,
        userType: 'staff',
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          name: 'Staff Root',
          userType: 'staff',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`   ✅ Root user created: ${rootUser.id} (${rootEmail})`);

    // Step 2: Create invitation for the admin email
    console.log('2. Creating invitation for admin...');
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const [invitation] = await db
      .insert(schema.invitations)
      .values({
        email: adminEmailLower,
        userType: 'staff',
        invitedBy: rootUser.id, // Root user is the inviter
        token,
        expiresAt,
        status: 'pending',
        resentCount: '0',
        sentAt: new Date(),
      })
      .onConflictDoUpdate({
        target: schema.invitations.email,
        set: {
          token,
          expiresAt,
          status: 'pending',
          invitedBy: rootUser.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`   ✅ Invitation created: ${invitation.id}`);

    // Step 3: Build correct invitation URL (pointing to frontend, not API)
    const staffAppUrl = process.env.STAFF_APP_URL || 'https://staff.ashinaga-uk.org';
    const inviteUrl = `${staffAppUrl}/signup?token=${token}`;

    console.log('\n✅ Production bootstrap completed successfully!\n');
    console.log('📋 Next steps:');
    console.log(`   1. Send this invitation link to ${adminEmailLower}:`);
    console.log(`      ${inviteUrl}\n`);
    console.log('   2. The admin should:');
    console.log('      - Click the invitation link');
    console.log('      - Complete signup with their password and name');
    console.log('      - Log in to the staff dashboard\n');
    console.log('   3. After signup, their staff record will be created automatically');
    console.log('      with role: viewer (you can promote to admin via database if needed)\n');
    console.log('   4. After the admin logs in, they can invite additional staff');
    console.log('      using the POST /api/invitations endpoint.\n');

    // Output invitation details for easy access
    console.log('📧 Invitation Details:');
    console.log(`   Email: ${adminEmailLower}`);
    console.log(`   Token: ${token}`);
    console.log(`   Invited By: ${rootUser.id} (${rootEmail})`);
    console.log(`   Expires: ${expiresAt.toISOString()}\n`);
  } catch (error) {
    console.error('❌ Bootstrap failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Run bootstrap
if (require.main === module) {
  bootstrapProduction().catch((error) => {
    console.error('Fatal error during bootstrap:', error);
    process.exit(1);
  });
}

export { bootstrapProduction };
