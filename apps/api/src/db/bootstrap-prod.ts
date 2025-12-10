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
  console.log('This will create the first admin staff member and their invitation.\n');

  try {
    // Check if any staff already exists
    const existingStaff = await db.select().from(schema.staff).limit(1);
    if (existingStaff.length > 0) {
      console.log('⚠️  Staff members already exist. Skipping bootstrap.');
      console.log(
        'If you need to create additional staff, use the invitation endpoint after logging in.'
      );
      process.exit(0);
    }

    // Get the email from environment variable or prompt
    const staffEmail = process.env.STAFF_EMAIL || process.argv[2];
    if (!staffEmail) {
      console.error('❌ ERROR: Staff email is required!');
      console.error('Usage: STAFF_EMAIL=email@example.com ts-node src/db/bootstrap-prod.ts');
      console.error('   Or: ts-node src/db/bootstrap-prod.ts email@example.com');
      process.exit(1);
    }

    const emailLower = staffEmail.toLowerCase().trim();
    console.log(`📧 Creating admin staff member: ${emailLower}\n`);

    // Generate user ID
    const userId = generateId();

    // Create the admin user
    console.log('1. Creating user...');
    const [user] = await db
      .insert(schema.users)
      .values({
        id: userId,
        name: 'Admin User', // User can update this after signup
        email: emailLower,
        emailVerified: false, // Will be verified when they sign up
        image: null,
        userType: 'staff',
      })
      .onConflictDoUpdate({
        target: schema.users.email,
        set: {
          userType: 'staff',
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`   ✅ User created: ${user.id}`);

    // Create staff record
    console.log('2. Creating staff record...');
    const [staff] = await db
      .insert(schema.staff)
      .values({
        userId: user.id,
        role: 'admin',
        phone: null,
        department: null,
        isActive: true,
      })
      .onConflictDoUpdate({
        target: schema.staff.userId,
        set: {
          role: 'admin',
          isActive: true,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`   ✅ Staff record created with role: ${staff.role}`);

    // Create invitation (self-invited for bootstrap)
    console.log('3. Creating invitation...');
    const token = generateInvitationToken();
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const [invitation] = await db
      .insert(schema.invitations)
      .values({
        email: emailLower,
        userType: 'staff',
        invitedBy: user.id, // Self-invited for bootstrap
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
          invitedBy: user.id,
          updatedAt: new Date(),
        },
      })
      .returning();

    console.log(`   ✅ Invitation created: ${invitation.id}`);

    // Build invitation URL
    const authUrl = process.env.BETTER_AUTH_URL || 'https://api.ashinaga-uk.org';
    const inviteUrl = `${authUrl}/auth/signup?token=${token}&email=${encodeURIComponent(emailLower)}`;

    console.log('\n✅ Production bootstrap completed successfully!\n');
    console.log('📋 Next steps:');
    console.log(`   1. Send this invitation link to ${emailLower}:`);
    console.log(`      ${inviteUrl}\n`);
    console.log('   2. The staff member should:');
    console.log('      - Click the invitation link');
    console.log('      - Complete signup with their password');
    console.log('      - Log in to the staff dashboard\n');
    console.log('   3. After the first admin logs in, they can invite additional staff');
    console.log('      using the POST /api/invitations endpoint.\n');

    // Output invitation details for easy access
    console.log('📧 Invitation Details:');
    console.log(`   Email: ${emailLower}`);
    console.log(`   Token: ${token}`);
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
