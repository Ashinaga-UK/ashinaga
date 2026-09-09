import { createHash, timingSafeEqual } from 'node:crypto';
import type { ExecutionContext } from '@nestjs/common';
import {
  type CanActivate,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { cronSecret } from './notification-config';

@Injectable()
export class CronGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const expected = cronSecret();
    if (!expected) {
      throw new ServiceUnavailableException('Notification jobs are not configured');
    }

    const request = context
      .switchToHttp()
      .getRequest<{ headers: Record<string, string | undefined> }>();
    const header = request.headers['x-cron-secret'] ?? request.headers.authorization ?? '';
    const provided = header.toLowerCase().startsWith('bearer ')
      ? header.slice(7).trim()
      : header.trim();
    if (!provided || !secretsEqual(provided, expected)) {
      throw new UnauthorizedException('Invalid cron secret');
    }
    return true;
  }
}

function secretsEqual(provided: string, expected: string): boolean {
  const left = createHash('sha256').update(provided).digest();
  const right = createHash('sha256').update(expected).digest();
  return timingSafeEqual(left, right);
}
