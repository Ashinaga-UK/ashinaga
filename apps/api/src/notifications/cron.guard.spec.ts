import { ServiceUnavailableException, UnauthorizedException } from '@nestjs/common';
import { CronGuard } from './cron.guard';

describe('CronGuard', () => {
  const guard = new CronGuard();

  afterEach(() => {
    delete process.env.CRON_SECRET;
  });

  it('returns 503 when CRON_SECRET is unset', () => {
    delete process.env.CRON_SECRET;
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never)
    ).toThrow(ServiceUnavailableException);
  });

  it('rejects a missing or wrong secret', () => {
    process.env.CRON_SECRET = 'expected-secret';
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({ getRequest: () => ({ headers: {} }) }),
      } as never)
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ headers: { 'x-cron-secret': 'wrong' } }),
        }),
      } as never)
    ).toThrow(UnauthorizedException);
  });

  it('accepts a matching bearer or x-cron-secret', () => {
    process.env.CRON_SECRET = 'expected-secret';
    expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ headers: { 'x-cron-secret': 'expected-secret' } }),
        }),
      } as never)
    ).toBe(true);
    expect(
      guard.canActivate({
        switchToHttp: () => ({
          getRequest: () => ({ headers: { authorization: 'Bearer expected-secret' } }),
        }),
      } as never)
    ).toBe(true);
  });
});
