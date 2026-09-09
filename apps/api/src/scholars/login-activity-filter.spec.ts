import { sqlFragmentText } from './platform-setup';
import { loginActivityFilterSql } from './login-activity-filter';

describe('loginActivityFilterSql', () => {
  it('requires a known last_activity older than the inactivity window', () => {
    const text = sqlFragmentText(loginActivityFilterSql('stale', 14));
    expect(text).toContain('last_activity');
    expect(text).toContain('IS NOT NULL');
    expect(text).toContain('INTERVAL');
  });
});
