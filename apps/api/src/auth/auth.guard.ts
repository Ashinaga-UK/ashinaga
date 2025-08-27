import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { auth } from './auth.config';

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

      // Attach the user ID to the request for use in controllers
      request.user = {
        id: session.user.id,
        email: session.user.email,
        userType: (session.user as any).userType,
      };

      return true;
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}
