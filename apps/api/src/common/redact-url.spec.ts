import { redactUrlForLog } from './redact-url';

describe('redactUrlForLog', () => {
  it('drops the query string', () => {
    expect(redactUrlForLog('/api/auth/callback/microsoft?code=abc&state=xyz')).toBe(
      '/api/auth/callback/microsoft'
    );
    expect(redactUrlForLog('/api/auth/verify-email?token=secret&callbackURL=/')).toBe(
      '/api/auth/verify-email'
    );
  });

  it('redacts the invitation token in the path', () => {
    expect(redactUrlForLog('/api/invitations/validate/AbC123-token')).toBe(
      '/api/invitations/validate/[redacted]'
    );
    expect(redactUrlForLog('/api/invitations/validate/AbC123-token?x=1')).toBe(
      '/api/invitations/validate/[redacted]'
    );
  });

  it('redacts a reset-password token and keeps any trailing path', () => {
    expect(redactUrlForLog('/api/auth/reset-password/tok123?callbackURL=https://x')).toBe(
      '/api/auth/reset-password/[redacted]'
    );
    expect(redactUrlForLog('/api/auth/reset-password/tok123/extra')).toBe(
      '/api/auth/reset-password/[redacted]/extra'
    );
  });

  it('leaves ordinary paths unchanged', () => {
    expect(redactUrlForLog('/api/scholars/123e4567-e89b-12d3-a456-426614174000')).toBe(
      '/api/scholars/123e4567-e89b-12d3-a456-426614174000'
    );
    expect(redactUrlForLog('/health')).toBe('/health');
    expect(redactUrlForLog('/api/invitations/validate/')).toBe('/api/invitations/validate/');
  });

  it('handles empty input', () => {
    expect(redactUrlForLog(undefined)).toBe('');
    expect(redactUrlForLog('')).toBe('');
  });
});
