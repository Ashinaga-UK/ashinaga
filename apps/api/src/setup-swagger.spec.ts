import { shouldExposeSwagger } from './swagger-exposure';

describe('shouldExposeSwagger', () => {
  it('allows development and test', () => {
    expect(shouldExposeSwagger('development')).toBe(true);
    expect(shouldExposeSwagger('test')).toBe(true);
  });

  it('hides docs in production and when NODE_ENV is unset or mistyped', () => {
    expect(shouldExposeSwagger('production')).toBe(false);
    expect(shouldExposeSwagger('Production')).toBe(false);
    expect(shouldExposeSwagger('prod')).toBe(false);

    const previous = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    try {
      expect(shouldExposeSwagger()).toBe(false);
    } finally {
      process.env.NODE_ENV = previous;
    }
  });
});
