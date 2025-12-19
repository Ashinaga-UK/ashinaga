import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import * as schema from '../db/schema';
import { EmailService } from '../email/email.service';

// Create email service instance
const emailService = new EmailService();

function getPortalBaseUrl(userType: string): string {
  const isStaff = userType === 'staff';
  const envVar = isStaff ? 'STAFF_APP_URL' : 'SCHOLAR_APP_URL';
  const fallback = isStaff ? 'http://localhost:4001' : 'http://localhost:4002';
  return (process.env[envVar] || fallback).replace(/\/$/, '');
}

type UserType = 'staff' | 'scholar';
type ResetPasswordUser = { userType?: UserType };

function extractResetToken(urlString: string): string | null {
  try {
    const url = new URL(urlString);
    const tokenFromQuery = url.searchParams.get('token');
    if (tokenFromQuery) return tokenFromQuery;

    // Better Auth can format the reset URL as /api/auth/reset-password/<token>
    const parts = url.pathname.split('/').filter(Boolean);
    const resetIdx = parts.findIndex((p) => p === 'reset-password');
    if (resetIdx !== -1 && parts[resetIdx + 1]) {
      return parts[resetIdx + 1];
    }
    return null;
  } catch {
    return null;
  }
}

// Better Auth configuration
const authConfig = betterAuth({
  database: drizzleAdapter(getDatabase(), {
    provider: 'pg',
    schema: {
      user: schema.users,
      account: schema.accounts,
      session: schema.sessions,
      verification: schema.verification,
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

      // Build a portal-correct reset URL (staff -> staff app, scholar -> scholar app)
      const token = extractResetToken(data.url);
      const userType = (data.user as unknown as ResetPasswordUser)?.userType || 'scholar';
      const portalBaseUrl = getPortalBaseUrl(userType);
      const resetUrl = token
        ? `${portalBaseUrl}/reset-password?token=${encodeURIComponent(token)}`
        : data.url;

      const appName = userType === 'staff' ? 'Ashinaga Staff Portal' : 'Ashinaga Scholar Portal';

      await emailService.sendEmail({
        to: email,
        subject: `Reset your ${appName} password`,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
              <title>Reset Your Password</title>
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 28px;">Ashinaga</h1>
              </div>

              <div style="background: white; padding: 30px; border: 1px solid #e5e5e5; border-top: none; border-radius: 0 0 10px 10px;">
                <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

                <p>Hi there,</p>

                <p>We received a request to reset your password for your ${appName} account. Click the button below to create a new password:</p>

                <div style="text-align: center; margin: 30px 0;">
                  <a href="${resetUrl}" style="display: inline-block; background: linear-gradient(135deg, #0D9488 0%, #16A34A 100%); color: white; text-decoration: none; padding: 12px 30px; border-radius: 5px; font-weight: 600;">Reset Password</a>
                </div>

                <p>Or copy and paste this link into your browser:</p>
                <p style="word-break: break-all; color: #0D9488;">${resetUrl}</p>

                <p>This link will expire in 1 hour for security reasons.</p>

                <p>If you didn't request this password reset, you can safely ignore this email. Your password won't be changed.</p>

                <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 30px 0;">

                <p style="color: #666; font-size: 14px;">
                  Best regards,<br>
                  The Ashinaga Team
                </p>
              </div>

              <div style="text-align: center; padding: 20px; color: #999; font-size: 12px;">
                <p>© ${new Date().getFullYear()} Ashinaga. All rights reserved.</p>
              </div>
            </body>
          </html>
        `,
        text: `
Reset Your Password (${appName})

We received a request to reset your password for your ${appName} account.

Reset link (expires in 1 hour):
${resetUrl}

If you didn't request this, you can ignore this email.
        `.trim(),
      });
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
        defaultValue: 'scholar', // Provide a default to avoid null
      },
    },
  },
  account: {
    accountLinking: {
      enabled: true, // Allow linking Microsoft account to email/password account
    },
  },
  callbacks: {
    session: {
      fetchUser: async ({ user }) => {
        // Add staff data to the user object when fetching session
        if (user.userType === 'staff') {
          const db = getDatabase();
          const staffResults = await db
            .select()
            .from(schema.staff)
            .where(eq(schema.staff.userId, user.id))
            .limit(1);

          const staffData = staffResults[0];
          console.log('[Session fetchUser] Staff data from DB:', staffData);

          if (staffData) {
            // Parse the department field to extract job title and department
            // Format is "JobTitle - Department" or just one of them
            let jobTitle = null;
            let department = null;

            if (staffData.department) {
              if (staffData.department.includes(' - ')) {
                const parts = staffData.department.split(' - ');
                jobTitle = parts[0] || null;
                department = parts[1] || null;
              } else {
                // If no separator, treat it as job title
                jobTitle = staffData.department;
                department = null;
              }
            }

            console.log(
              '[Session fetchUser] Parsed - jobTitle:',
              jobTitle,
              'department:',
              department
            );

            const result = {
              ...user,
              phone: staffData.phone || null,
              department: department || null,
              role: jobTitle || null,
            };

            console.log('[Session fetchUser] Returning user with staff data:', result);
            return result;
          }
        }
        return user;
      },
    },
    signUp: {
      before: async ({ email, name }) => {
        console.log('==========================================');
        console.log('SignUp Before Hook - Email received:', email);
        console.log('SignUp Before Hook - Name received:', name);
        console.log('SignUp Before Hook - Email lowercase:', email.toLowerCase());
        console.log('==========================================');

        // In test environment, allow any email to sign up without invitation
        if (process.env.NODE_ENV === 'test') {
          console.log('Test environment: Allowing signup without invitation');
          // Determine user type based on email domain for test environment
          const userType = email.endsWith('@ashinaga.org') ? 'staff' : 'scholar';
          return {
            email,
            name: name || '',
            userType: userType,
            emailVerified: false,
          };
        }

        try {
          // Check if user has a valid invitation (production behavior)
          const db = getDatabase();
          console.log('Got database connection, checking for invitation...');

          // Always use lowercase for email comparison
          const emailLower = email.toLowerCase();

          console.log('Searching for invitation with email:', emailLower);

          const invitations = await db
            .select()
            .from(schema.invitations)
            .where(eq(schema.invitations.email, emailLower))
            .limit(1);

          console.log('Query result - Invitations found:', invitations.length);

          const invitation = invitations[0];

          if (invitation) {
            console.log('Invitation details:', {
              id: invitation.id,
              email: invitation.email,
              status: invitation.status,
              userType: invitation.userType,
              expiresAt: invitation.expiresAt,
            });
          }

          if (!invitation) {
            console.error('ERROR: No invitation found for email:', emailLower);
            console.error('Make sure invitation was created with lowercase email');
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
          console.log('Returning user data for signup with name:', name);
          return {
            email,
            name: name || '', // Use the name from signup form
            userType: invitation.userType,
            emailVerified: false,
          };
        } catch (error) {
          console.error('SignUp Before Hook Error:', error);
          throw error;
        }
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
      after: async ({ user }) => {
        // Add staff data to user object after sign in
        if (user.userType === 'staff') {
          const db = getDatabase();
          const staffResults = await db
            .select()
            .from(schema.staff)
            .where(eq(schema.staff.userId, user.id))
            .limit(1);

          const staffData = staffResults[0];
          console.log('[SignIn After] Staff data from DB:', staffData);

          if (staffData) {
            // Parse the department field to extract job title and department
            let jobTitle = null;
            let department = null;

            if (staffData.department) {
              if (staffData.department.includes(' - ')) {
                const parts = staffData.department.split(' - ');
                jobTitle = parts[0] || null;
                department = parts[1] || null;
              } else {
                // If no separator, treat it as job title
                jobTitle = staffData.department;
                department = null;
              }
            }

            console.log('[SignIn After] Parsed - jobTitle:', jobTitle, 'department:', department);

            // Add staff fields to user object
            const userWithStaff = user as Record<string, unknown>;
            userWithStaff.phone = staffData.phone || null;
            userWithStaff.department = department || null;
            userWithStaff.role = jobTitle || null;

            console.log('[SignIn After] Updated user object:', user);
          }
        }
        return user;
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
