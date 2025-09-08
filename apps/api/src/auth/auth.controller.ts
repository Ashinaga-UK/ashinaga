import { Body, Controller, Get, Post, Req, Res } from '@nestjs/common';
import { ApiOperation, ApiTags, ApiBody, ApiResponse } from '@nestjs/swagger';
import type { FastifyReply, FastifyRequest } from 'fastify';
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
      const authResponse = await auth.handler(request);

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
    return this.forwardToAuth(req, res, '/sign-up/email');
  }

  @Get('session')
  @ApiOperation({ summary: 'Get current user session' })
  @ApiResponse({ status: 200, description: 'Current session information' })
  @ApiResponse({ status: 401, description: 'No active session' })
  async getSession(@Req() req: FastifyRequest, @Res() res: FastifyReply) {
    return this.forwardToAuth(req, res, '/session');
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
}
