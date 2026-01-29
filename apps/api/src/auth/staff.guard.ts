import type { CanActivate, ExecutionContext } from '@nestjs/common';
import { ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { eq } from 'drizzle-orm';
import { getDatabase } from '../db/connection';
import { staff } from '../db/schema';
import { auth } from './auth.config';

@Injectable()
export class StaffGuard implements CanActivate {
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

      // Check if user is staff
      const userType = (session.user as any).userType;
      if (userType !== 'staff') {
        throw new ForbiddenException('Access restricted to staff members only');
      }

      // Verify staff status in database
      const db = getDatabase();
      const staffMember = await db
        .select()
        .from(staff)
        .where(eq(staff.userId, session.user.id))
        .limit(1);

      if (!staffMember[0] || !staffMember[0].isActive) {
        throw new ForbiddenException('Staff access denied or account inactive');
      }

      // Attach the user and staff info to the request
      request.user = {
        id: session.user.id,
        email: session.user.email,
        userType: userType,
        staffRole: staffMember[0].role,
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
