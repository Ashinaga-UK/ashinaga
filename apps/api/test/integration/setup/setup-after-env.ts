/**
 * Runs after the test framework is installed, before test files.
 * Signup hits Better Auth, which reads BETTER_AUTH_SECRET when auth.config loads.
 */
process.env.BETTER_AUTH_SECRET =
  process.env.BETTER_AUTH_SECRET || 'integration-test-secret-key-minimum-32-characters-long';
process.env.BETTER_AUTH_URL = process.env.BETTER_AUTH_URL || 'http://localhost:4000';
