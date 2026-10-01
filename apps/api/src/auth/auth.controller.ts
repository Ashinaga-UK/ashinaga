import { All, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { and, eq } from 'drizzle-orm';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { getDatabase } from '../db/connection';
import { invitations, scholars, staff, users } from '../db/schema';
import { auth } from './auth.config';

@ApiTags('auth')
@Controller('api/auth')
export class AuthController {
  // Helper method to forward requests to Better Auth
  private async forwardToAuth(req: FastifyRequest, res: FastifyReply, path: string) {
    try {
      const result = await this.callAuth(req, path);
      return this.sendAuthResult(res, result);
    } catch (error) {
      console.error('Better Auth error:', error);
      return res.status(500).send({ error: 'Authentication error' });
    }
  }

  private async callAuth(req: FastifyRequest, path: string) {
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

    console.log('=== AUTH CONTROLLER ===');
    console.log('URL:', url.toString());
    console.log('Method:', req.method);
    console.log('Body:', body);

    const authResponse = await auth.handler(request);
    console.log('Better Auth Response Status:', authResponse?.status);

    const responseBody = authResponse ? await authResponse.text() : '';
    console.log('Better Auth Response Body:', responseBody);

    return {
      status: authResponse?.status || 200,
      headers: authResponse?.headers,
      body: responseBody,
    };
  }

  private sendAuthResult(
    res: FastifyReply,
    result: { status: number; headers?: Headers; body: string }
  ) {
    res.status(result.status);
    result.headers?.forEach((value, key) => {
      res.header(key, value);
    });

    if (result.status === 302 || result.status === 301) {
      const location = result.headers?.get('Location') || result.headers?.get('location');
      if (location) {
        return res.redirect(location);
      }
    }

    if (result.body) {
      return res.send(result.body);
    }

    return res.status(200).send({ ok: true });
  }

  private async claimInvitation(invitationId: string): Promise<boolean> {
    const claimed = await getDatabase()
      .update(invitations)
      .set({ status: 'accepted', updatedAt: new Date() })
      .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'pending')))
      .returning({ id: invitations.id });

    return claimed.length > 0;
  }

  private async releaseInvitationClaim(invitationId: string): Promise<void> {
    await getDatabase()
      .update(invitations)
      .set({
        status: 'pending',
        acceptedAt: null,
        userId: null,
        updatedAt: new Date(),
      })
      .where(and(eq(invitations.id, invitationId), eq(invitations.status, 'accepted')));
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
        invitationToken: { type: 'string' },
      },
      required: ['email', 'password', 'name', 'invitationToken'],
    },
  })
  @ApiResponse({ status: 200, description: 'Successfully signed up' })
  @ApiResponse({ status: 400, description: 'Invalid invitation' })
  async signUpWithEmail(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    const body = (req.body ?? {}) as {
      email?: string;
      password?: string;
      name?: string;
      invitationToken?: string;
      // Scholar-specific fields
      program?: string;
      year?: string;
      university?: string;
      location?: string;
      phone?: string;
      bio?: string;
      intendedUniversity?: string;
      intendedCourse?: string;
      degreePathway?: string;
    };
    const emailLower = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const invitationToken =
      typeof body.invitationToken === 'string' ? body.invitationToken.trim() : '';

    if (!emailLower || !invitationToken) {
      return res.status(400).send({ error: 'Invalid invitation' });
    }

    // The token is the credential. Email alone must not authorize signup.
    const db = getDatabase();
    const [invitationWithData] = await db
      .select()
      .from(invitations)
      .where(eq(invitations.token, invitationToken))
      .limit(1);

    const expiresAt = invitationWithData ? new Date(invitationWithData.expiresAt) : null;
    const invitationValid =
      !!invitationWithData &&
      invitationWithData.status === 'pending' &&
      !!expiresAt &&
      !Number.isNaN(expiresAt.getTime()) &&
      new Date() <= expiresAt &&
      invitationWithData.email.toLowerCase() === emailLower;

    if (!invitationValid || !invitationWithData) {
      return res.status(400).send({ error: 'Invalid invitation' });
    }

    const userType = invitationWithData.userType;
    let scholarData: {
      program?: string;
      year?: string;
      university?: string;
      location?: string;
      phone?: string;
      bio?: string;
      aaiScholarId?: string;
      dateOfBirth?: string;
      gender?: string;
      nationality?: string;
      addressHomeCountry?: string;
      passportExpirationDate?: string;
      visaExpirationDate?: string;
      emergencyContactCountryOfStudy?: string;
      emergencyContactHomeCountry?: string;
      startDate?: string;
      graduationDate?: string;
      universityId?: string;
      dietaryInformation?: string;
      kokorozashi?: string;
      longTermCareerPlan?: string;
      postGraduationPlan?: string;
      majorCategory?: string;
      fieldOfStudy?: string;
      programStage?: 'prep_year' | 'scholar';
      intendedUniversity?: string;
      intendedCourse?: string;
      degreePathway?: string;
    } = {};

    if (userType === 'scholar' && invitationWithData.scholarData) {
      try {
        scholarData =
          typeof invitationWithData.scholarData === 'string'
            ? JSON.parse(invitationWithData.scholarData)
            : invitationWithData.scholarData;
      } catch (error) {
        console.error('Failed to parse scholar data from invitation:', error);
        return res.status(500).send({
          error: 'Invitation data is corrupted. Please contact support.',
        });
      }
    }

    const intendedUniversity =
      scholarData.intendedUniversity?.trim() || body.intendedUniversity?.trim() || '';
    const intendedCourse = scholarData.intendedCourse?.trim() || body.intendedCourse?.trim() || '';
    const degreePathway = scholarData.degreePathway?.trim() || body.degreePathway?.trim() || '';

    if (scholarData.programStage === 'prep_year') {
      if (!intendedUniversity) {
        return res.status(400).send({
          error: 'Intended university is required for prep-year sign up',
        });
      }
      if (!intendedCourse) {
        return res.status(400).send({
          error: 'Intended course is required for prep-year sign up',
        });
      }
      if (!degreePathway) {
        return res.status(400).send({
          error: 'Degree pathway is required for prep-year sign up',
        });
      }
    }

    // One pending row can be claimed. A second request loses the update and is rejected.
    const claimed = await this.claimInvitation(invitationWithData.id);
    if (!claimed) {
      return res.status(400).send({ error: 'Invalid invitation' });
    }

    let authResult: { status: number; headers?: Headers; body: string };
    try {
      authResult = await this.callAuth(req, '/sign-up/email');
    } catch (error) {
      console.error('Better Auth error:', error);
      await this.releaseInvitationClaim(invitationWithData.id);
      return res.status(500).send({ error: 'Authentication error' });
    }

    if (authResult.status !== 200) {
      await this.releaseInvitationClaim(invitationWithData.id);
      return this.sendAuthResult(res, authResult);
    }

    try {
      const responseData = authResult.body ? JSON.parse(authResult.body) : {};
      const userId = responseData.user?.id as string | undefined;
      if (!userId) {
        throw new Error('Signup response did not include a user id');
      }

      console.log('User created with ID:', userId, 'Type:', userType);

      await db.update(users).set({ userType: userType }).where(eq(users.id, userId));

      console.log('User type updated to:', userType);

      await db
        .update(invitations)
        .set({
          acceptedAt: new Date(),
          userId: userId,
          updatedAt: new Date(),
        })
        .where(eq(invitations.id, invitationWithData.id));

      console.log('Invitation marked as accepted');

      if (userType === 'staff') {
        await db.insert(staff).values({
          userId: userId,
          role: 'viewer',
          isActive: true,
        });
        console.log('Staff profile created');
      } else if (userType === 'scholar') {
        await db.insert(scholars).values({
          userId: userId,
          status: 'active',
          program: scholarData.program || 'TBD',
          year: scholarData.year || 'TBD',
          university: scholarData.university || 'TBD',
          startDate: scholarData.startDate ? new Date(scholarData.startDate) : new Date(),
          location: scholarData.location || null,
          phone: scholarData.phone || null,
          bio: scholarData.bio || null,
          aaiScholarId: scholarData.aaiScholarId || null,
          dateOfBirth: scholarData.dateOfBirth || null,
          gender: (scholarData.gender as 'male' | 'female' | 'other' | 'prefer_not_to_say') || null,
          nationality: scholarData.nationality || null,
          addressHomeCountry: scholarData.addressHomeCountry || null,
          passportExpirationDate: scholarData.passportExpirationDate || null,
          visaExpirationDate: scholarData.visaExpirationDate || null,
          emergencyContactCountryOfStudy: scholarData.emergencyContactCountryOfStudy || null,
          emergencyContactHomeCountry: scholarData.emergencyContactHomeCountry || null,
          graduationDate: scholarData.graduationDate ? new Date(scholarData.graduationDate) : null,
          universityId: scholarData.universityId || null,
          dietaryInformation: scholarData.dietaryInformation || null,
          kokorozashi: scholarData.kokorozashi || null,
          longTermCareerPlan: scholarData.longTermCareerPlan || null,
          postGraduationPlan: scholarData.postGraduationPlan || null,
          majorCategory: scholarData.majorCategory || null,
          fieldOfStudy: scholarData.fieldOfStudy || null,
          programStage: scholarData.programStage || 'scholar',
          intendedUniversity: intendedUniversity || null,
          intendedCourse: intendedCourse || null,
          degreePathway: degreePathway || null,
        });
        console.log('Scholar profile created with all invitation data');
      }
    } catch (error) {
      console.error('Error in post-signup logic:', error);
      return res.status(500).send({
        error: 'Account setup failed. Please contact support.',
      });
    }

    return this.sendAuthResult(res, authResult);
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
    const pathname = path.split('?')[0] ?? '';
    // Signup is only allowed through signUpWithEmail, which checks the invitation token.
    // Better Auth's own hook still authorizes by email, so this fallback must not reach it.
    if (pathname.includes('sign-up')) {
      return res.status(400).send({ error: 'Invalid invitation' });
    }
    console.log('Auth fallback handling path:', path);
    return this.forwardToAuth(req, res, path);
  }
}
