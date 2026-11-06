import { config } from '@workspace/jest-config/nest';

// better-auth 1.6 is ESM-only. Transform every .mjs file, plus the packages that
// ship ESM as .js. pnpm nests copies under node_modules/.pnpm, so both shapes
// have to be allowlisted.
const esmJsPackages =
  'superjson|better-auth|@better-auth|better-call|@better-fetch|@noble/ciphers|@noble/hashes|jose|kysely|nanostores|zod';
const esmJsPnpmFolders =
  'superjson@|better-auth@|@better-auth\\+|better-call@|@better-fetch\\+|@noble\\+ciphers@|@noble\\+hashes@|jose@|kysely@|nanostores@|zod@';

export default {
  ...config,
  displayName: 'Ashinaga API App',
  moduleFileExtensions: ['js', 'mjs', 'ts', 'json'],
  transform: {
    '^.+\\.m?js$': '<rootDir>/../test/esm-to-cjs.cjs',
    '^.+\\.tsx?$': 'ts-jest',
  },
  coverageReporters: ['text', 'lcov', 'html'],
  coveragePathIgnorePatterns: ['/node_modules/', '/dist/', '/coverage/', '\\.d\\.ts$'],
  collectCoverageFrom: [
    '**/*.(t|j)s',
    '!**/*.d.ts',
    '!**/*.spec.ts',
    '!**/node_modules/**',
    '!**/dist/**',
    '!**/coverage/**',
  ],
  transformIgnorePatterns: [
    `/node_modules/(?!.*\\.mjs$|.pnpm|${esmJsPackages})`,
    `/node_modules/.pnpm/(?!.*\\.mjs$|${esmJsPnpmFolders})`,
  ],
};
