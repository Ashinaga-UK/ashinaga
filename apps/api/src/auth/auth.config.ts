import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';
import { EmailService } from '../email/email.service';

// Create email service instance
const emailService = new EmailService();

// Better Auth configuration
const authConfig = betterAuth({
  database: drizzleAdapter(getDatabase(), {
    provider: 'pg',
    schema: {
      user: schema.users,
      account: schema.accounts,
    },
  }),
  secret: process.env.BETTER_AUTH_SECRET,
  baseURL: process.env.BETTER_AUTH_URL || 'http://localhost:4000',
  trustedOrigins: (request) => {
    const origin = request.headers.get('origin') || '';
    // Allow all localhost origins in development
    if (process.env.NODE_ENV === 'development' && origin.startsWith('http://localhost:')) {
      return [origin];
    }
    // In production, check against explicit list
    const allowedOrigins = process.env.CORS_ORIGINS?.split(',') || [];
    if (allowedOrigins.includes(origin)) {
      return [origin];
    }
    return [];
  },
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false, // We handle verification through invitations
    sendResetPassword: async (data) => {
      const email = data.user.email;
      if (!email) {
        console.error('No email found for user');
        return;
      }

      // In test environment, just log the reset URL instead of sending email
      if (process.env.NODE_ENV === 'test') {
        console.log('═══════════════════════════════════════════════════════════════');
        console.log('PASSWORD RESET EMAIL (Test Environment)');
        console.log('═══════════════════════════════════════════════════════════════');
        console.log(`To: ${email}`);
        console.log(`Reset Link: ${data.url}`);
        console.log('═══════════════════════════════════════════════════════════════');
        return;
      }

      // In production, use the email service to send password reset emails
      await emailService.sendPasswordResetEmail(email, data.url);
    },
  },
  socialProviders: {
    microsoft:
      process.env.MICROSOFT_CLIENT_ID && process.env.MICROSOFT_CLIENT_SECRET
        ? {
            clientId: process.env.MICROSOFT_CLIENT_ID,
            clientSecret: process.env.MICROSOFT_CLIENT_SECRET,
            tenantId: 'common', // Allow any Microsoft account
          }
        : undefined,
  },
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
        console.log('SignUp Before Hook - Email:', email);

        // In test environment, allow any email to sign up without invitation
        if (process.env.NODE_ENV === 'test') {
          console.log('Test environment: Allowing signup without invitation');
          // Determine user type based on email domain for test environment
          const userType = email.endsWith('@ashinaga.org') ? 'staff' : 'scholar';
          return {
            email,
            name: '',
            userType,
            emailVerified: false,
          };
        }

        try {
          // Check if user has a valid invitation (production behavior)
          const db = getDatabase();
          console.log('Got database connection');

          const invitations = await db
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.email, email))
            .limit(1);

          console.log('Invitations found:', invitations.length);

          const invitation = invitations[0];

          if (!invitation) {
            console.error('No invitation found for email:', email);
            throw new Error('Invalid invitation. You must be invited to join this platform.');
          }

          console.log('Invitation status:', invitation.status);

          if (invitation.status !== 'pending') {
            throw new Error('This invitation has already been used or expired.');
          }

          if (new Date() > new Date(invitation.expiresAt)) {
            throw new Error('This invitation has expired. Please request a new one.');
          }

          console.log('Invitation valid, returning user data');

          // Return user data with userType from invitation
          return {
            email,
            name: '',
            userType: invitation.userType,
            emailVerified: false,
          };
        } catch (error) {
          console.error('SignUp Before Hook Error:', error);
          throw error;
        }
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
