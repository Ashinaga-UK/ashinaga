import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { auth } from './auth.config';
import {
  ACCOUNT_DEACTIVATED_CODE,
  ACCOUNT_DEACTIVATED_MESSAGE,
  isDeactivatedStaff,
} from './session-guard';

@Injectable()
export class AuthGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();

    try {
      // Get the session from Better Auth
      const session = await auth.api.getSession({
        headers: request.headers,
      });

      if (!session?.user?.id) {
        throw new UnauthorizedException('User not authenticated');
      }

      const userType = (session.user as any).userType;

      // Sessions created before deactivation stay valid in Better Auth until they expire.
      if (userType === 'staff' && (await isDeactivatedStaff(session.user.id))) {
        throw new ForbiddenException({
          code: ACCOUNT_DEACTIVATED_CODE,
          message: ACCOUNT_DEACTIVATED_MESSAGE,
        });
      }

      // Attach the user ID to the request for use in controllers
      request.user = {
        id: session.user.id,
        email: session.user.email,
        userType,
      };

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException || error instanceof ForbiddenException) {
        throw error;
      }
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
