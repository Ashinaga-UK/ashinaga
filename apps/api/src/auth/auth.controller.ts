import { All, Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { invitations, staff, scholars, users } from '../db/schema';
import { auth } from './auth.config';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  // Helper method to forward requests to Better Auth
  private async forwardToAuth(req: FastifyRequest, res: FastifyReply, path: string) {
    const url = new URL(
      `/api/auth${path}`,
      `${req.protocol}://${req.hostname}:${process.env.PORT || 3000}`
    );

    const headers = new Headers();
    Object.entries(req.headers).forEach(([key, value]) => {
      if (typeof value === 'string') {
        headers.set(key, value);
      } else if (Array.isArray(value)) {
        value.forEach((v) => headers.append(key, v));
      }
    });

    let body: string | undefined;
    if (req.method !== 'GET' && req.method !== 'HEAD' && req.body) {
      body = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
      if (!headers.has('content-type')) {
        headers.set('content-type', 'application/json');
      }
    }

    const request = new Request(url.toString(), {
      method: req.method,
      headers,
      body,
    });

    try {
      console.log('=== AUTH CONTROLLER ===');
      console.log('URL:', url.toString());
      console.log('Method:', req.method);
      console.log('Body:', body);

      const authResponse = await auth.handler(request);

      console.log('Better Auth Response Status:', authResponse?.status);

      if (authResponse) {
        res.status(authResponse.status || 200);
        authResponse.headers?.forEach((value, key) => {
          res.header(key, value);
        });

        if (authResponse.status === 302 || authResponse.status === 301) {
          const location =
            authResponse.headers?.get('Location') || authResponse.headers?.get('location');
          if (location) {
            return res.redirect(location);
          }
        }

        const responseBody = await authResponse.text();
        console.log('Better Auth Response Body:', responseBody);

        if (responseBody) {
          return res.send(responseBody);
        }
      }

      return res.status(200).send({ ok: true });
    } catch (error) {
      console.error('Better Auth error:', error);
      return res.status(500).send({ error: 'Authentication error' });
    }
  }

  @Get('me')
  @ApiOperation({ summary: 'Get current authenticated user with properties' })
  @ApiResponse({ status: 200, description: 'Current user information' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getCurrentUser(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/me');
  }

  @Get('ok')
  @ApiOperation({ summary: 'Better Auth health check endpoint' })
  @ApiResponse({ status: 200, description: 'Auth service is healthy' })
  async healthCheck(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/ok');
  }

  @Post('sign-in/email')
  @ApiOperation({ summary: 'Sign in with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
      },
      required: ['email', 'password'],
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully signed in' })
  @ApiResponse({ status: 401, description: 'Invalid credentials' })
  async signInWithEmail(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/sign-in/email');
  }

  @Post('sign-up/email')
  @ApiOperation({ summary: 'Sign up with email and password' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
        password: { type: 'string' },
        name: { type: 'string' },
      },
      required: ['email', 'password', 'name'],
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully signed up' })
  @ApiResponse({ status: 400, description: 'Email already exists' })
  async signUpWithEmail(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const body = req.body as {
      email: string;
      password: string;
      name: string;
      invitationToken?: string;
      // Scholar-specific fields
      program?: string;
      year?: string;
      university?: string;
      location?: string;
      phone?: string;
      bio?: string;
    };
    const emailLower = body.email.toLowerCase();

    // First, check the invitation to get userType
    const db = getDatabase();
    const invitation = await db
      .select()
      .from(invitations)
      .where(eq(invitations.email, emailLower))
      .limit(1);

    if (!invitation[0]) {
      return res.status(400).send({ error: 'No invitation found for this email' });
    }

    const userType = invitation[0].userType;

    // Capture the response body
    let responseBody: string | undefined;
    const originalSend = res.send.bind(res);
    res.send = function (data: any) {
      responseBody = typeof data === 'string' ? data : JSON.stringify(data);
      return originalSend(data);
    };

    // Forward to Better Auth to create the user
    await this.forwardToAuth(req, res, '/sign-up/email');

    // If signup was successful, handle our post-signup logic
    if (res.statusCode === 200 && responseBody) {
      try {
        // Parse the response to get the user ID
        const responseData = JSON.parse(responseBody);
        const userId = responseData.user?.id;

        if (userId) {
          console.log('User created with ID:', userId, 'Type:', userType);

          // Update the user's userType field
          await db.update(users).set({ userType: userType }).where(eq(users.id, userId));

          console.log('User type updated to:', userType);

          // Update invitation status
          await db
            .update(invitations)
            .set({
              status: 'accepted',
              acceptedAt: new Date(),
              userId: userId,
              updatedAt: new Date(),
            })
            .where(eq(invitations.email, emailLower));

          console.log('Invitation marked as accepted');

          // Create staff or scholar profile
          if (userType === 'staff') {
            await db.insert(staff).values({
              userId: userId,
              role: 'viewer',
              isActive: true,
            });
            console.log('Staff profile created');
          } else if (userType === 'scholar') {
            // Use the form data provided during signup, fallback to defaults if not provided
            // The name is already handled by Better Auth in the user record
            await db.insert(scholars).values({
              userId: userId,
              status: 'active',
              startDate: new Date(),
              program: body.program || 'TBD',
              year: body.year || 'TBD',
              university: body.university || 'TBD',
              location: body.location || null,
              phone: body.phone || null,
              bio: body.bio || null,
            });
            console.log('Scholar profile created with data:', {
              program: body.program,
              year: body.year,
              university: body.university,
              location: body.location,
              phone: body.phone,
              bio: body.bio,
            });
          }
        }
      } catch (error) {
        console.error('Error in post-signup logic:', error);
      }
    }

    // Response already sent by forwardToAuth
    return res;
  }

  @Get('session')
  @ApiOperation({ summary: 'Get current user session' })
  @ApiResponse({ status: 200, description: 'Current session information' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async getSession(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/session');
  }

  @Get('get-session')
  @ApiOperation({ summary: 'Get current user session (alias)' })
  @ApiResponse({ status: 200, description: 'Current session information' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async getSessionAlias(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/get-session');
  }

  @Post('sign-out')
  @ApiOperation({ summary: 'Sign out current user' })
  @ApiResponse({ status: 200, description: 'Successfully signed out' })
  async signOut(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/sign-out');
  }

  @Post('forget-password')
  @ApiOperation({ summary: 'Request password reset email' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password reset email sent' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async forgetPassword(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/forget-password');
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Reset password with token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['token', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password successfully reset' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async resetPassword(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/reset-password');
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Verify email address with token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        token: { type: 'string' },
      },
      required: ['token'],
    },
  })
  @ApiResponse({ status: 200, description: 'Email successfully verified' })
  @ApiResponse({ status: 400, description: 'Invalid or expired token' })
  async verifyEmail(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/verify-email');
  }

  @Post('send-verification-email')
  @ApiOperation({ summary: 'Send email verification link' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        email: { type: 'string', format: 'email' },
      },
      required: ['email'],
    },
  })
  @ApiResponse({ status: 200, description: 'Verification email sent' })
  @ApiResponse({ status: 404, description: 'Email not found' })
  async sendVerificationEmail(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/send-verification-email');
  }

  @Post('change-password')
  @ApiOperation({ summary: 'Change password for authenticated user' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        currentPassword: { type: 'string' },
        newPassword: { type: 'string' },
      },
      required: ['currentPassword', 'newPassword'],
    },
  })
  @ApiResponse({ status: 200, description: 'Password successfully changed' })
  @ApiResponse({ status: 401, description: 'Current password incorrect' })
  async changePassword(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/change-password');
  }

  @Post('update-user')
  @ApiOperation({ summary: 'Update user profile information' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        name: { type: 'string' },
        image: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'User profile updated' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateUser(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/update-user');
  }

  @Post('delete-user')
  @ApiOperation({ summary: 'Delete user account' })
  @ApiResponse({ status: 200, description: 'User account deleted' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async deleteUser(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/delete-user');
  }

  @Get('list-sessions')
  @ApiOperation({ summary: 'List all active sessions for current user' })
  @ApiResponse({ status: 200, description: 'List of active sessions' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async listSessions(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/list-sessions');
  }

  @Post('revoke-session')
  @ApiOperation({ summary: 'Revoke a specific session' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        sessionId: { type: 'string' },
      },
      required: ['sessionId'],
    },
  })
  @ApiResponse({ status: 200, description: 'Session revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeSession(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/revoke-session');
  }

  @Post('revoke-all-sessions')
  @ApiOperation({ summary: 'Revoke all sessions except current' })
  @ApiResponse({ status: 200, description: 'All other sessions revoked' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async revokeAllSessions(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/revoke-all-sessions');
  }

  // Catch-all handler for any Better Auth routes we haven't explicitly defined
  // This should be the last route in the controller
  @All('*')
  @ApiOperation({ summary: 'Fallback for other Better Auth endpoints' })
  async handleAuthFallback(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    // Extract the path after /api/auth
    const path = req.url.replace(/^\/api\/auth/, '');
    console.log('Auth fallback handling path:', path);
    return this.forwardToAuth(req, res, path);
  }
}
