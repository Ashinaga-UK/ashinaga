import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { jwt } from 'better-auth/plugins';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';

// Better Auth configuration
const authConfig = betterAuth({
  database: drizzleAdapter(getDatabase(), {
    provider: 'pg',
    schema: {
      user: schema.users,
      account: schema.accounts,
      session: schema.sessions,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:3000',
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // We handle verification through invitations
    sendResetPassword: async (_user, url) => {
      // TODO: Implement email sending
      console.log('Password reset link:', url);
    },
  },
  socialProviders: {
    microsoft:
      process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
        ? {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenant: 'common', // Allow any Microsoft account
          }
        : undefined,
  },
  plugins: [
    jwt({
      // JWT configuration options
    }),
  ],
  user: {
    additionalFields: {
      userType: {
        type: 'string',
        required: true,
        defaultValue: 'scholar',
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true, // Allow linking Microsoft account to email/password account
    },
  },
  callbacks: {
    signUp: {
      before: async ({ email }) => {
        // Check if user has a valid invitation
        const db = getDatabase();
        const invitations = await db
          .select()
          .from(schema.invitations)
          .where(eq(schema.invitations.email, email))
          .limit(1);

        const invitation = invitations[0];

        if (!invitation) {
          throw new Error('Invalid invitation. You must be invited to join this platform.');
        }

        if (invitation.status !== 'pending') {
          throw new Error('This invitation has already been used or expired.');
        }

        if (new Date() > new Date(invitation.expiresAt)) {
          throw new Error('This invitation has expired. Please request a new one.');
        }

        // Return user data with userType from invitation
        return {
          email,
          name: '',
          userType: invitation.userType,
        };
      },
      after: async ({ user }) => {
        // Mark invitation as accepted and link to user
        const db = getDatabase();
        await db
          .update(schema.invitations)
          .set({
            status: 'accepted',
            acceptedAt: new Date(),
            userId: user.id,
            updatedAt: new Date(),
          })
          .where(eq(schema.invitations.email, user.email));

        // Create staff or scholar profile based on userType
        if (user.userType === 'staff') {
          await db.insert(schema.staff).values({
            userId: user.id,
            role: 'viewer', // Default role, admin can upgrade later
            isActive: true,
          });
        } else if (user.userType === 'scholar') {
          // Parse any pre-filled scholar data from invitation
          const invitations = await db
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.email, user.email))
            .limit(1);

          const invitation = invitations[0];
          let scholarData: {
            program: string;
            year: string;
            university: string;
            location?: string;
            phone?: string;
            bio?: string;
          } = {
            program: 'TBD',
            year: 'TBD',
            university: 'TBD',
          };

          if (invitation?.scholarData) {
            try {
              const parsed = JSON.parse(invitation.scholarData);
              scholarData = { ...scholarData, ...parsed };
            } catch (e) {
              console.error('Failed to parse scholar data:', e);
            }
          }

          await db.insert(schema.scholars).values({
            userId: user.id,
            status: 'active',
            startDate: new Date(),
            program: scholarData.program,
            year: scholarData.year,
            university: scholarData.university,
            location: scholarData.location,
            phone: scholarData.phone,
            bio: scholarData.bio,
          });
        }

        return user;
      },
    },
    signIn: {
      before: async ({ email }) => {
        // Optional: Check if user is active
        const db = getDatabase();
        const userResults = await db
          .select()
          .from(schema.users)
          .where(eq(schema.users.email, email))
          .limit(1);

        const user = userResults[0];

        if (user && user.userType === 'staff') {
          const staffResults = await db
            .select()
            .from(schema.staff)
            .where(eq(schema.staff.userId, user.id))
            .limit(1);

          const staffMember = staffResults[0];

          if (staffMember && !staffMember.isActive) {
            throw new Error('Your account has been deactivated. Please contact an administrator.');
          }
        }

        return true;
      },
    },
  },
});

export const auth: ReturnType<typeof betterAuth> = authConfig;

// Helper function to create invitation tokens
export function generateInvitationToken(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let token = '';
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}
