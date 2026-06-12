import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { users } from '../db/schema';
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

      // Check if user is staff or scholar
      let userType = (session.user as any).userType || (session.user as any).user_type;

      if (!userType) {
        const db = getDatabase();
        const userRec = await db
          .select()
          .from(users)
          .where(eq(users.id, session.user.id))
          .limit(1);
        if (userRec[0]) {
          userType = userRec[0].userType;
        }
      }

      // Attach the user ID to the request for use in controllers
      request.user = {
        id: session.user.id,
        email: session.user.email,
        userType: userType || 'scholar',
      };

      return true;
    } catch {
      throw new UnauthorizedException('Authentication failed');
    }
  }
}

