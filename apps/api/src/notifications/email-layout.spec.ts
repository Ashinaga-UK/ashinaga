import { escapeHtml } from './email-layout';

describe('escapeHtml', () => {
  it('escapes markup in interpolated email copy', () => {
    expect(escapeHtml('<script>alert("x")</script>')).toBe(
      '&lt;script&gt;alert(&quot;x&quot;)&lt;/script&gt;'
    );
  });
});
