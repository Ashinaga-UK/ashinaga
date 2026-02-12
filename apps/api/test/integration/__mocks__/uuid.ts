/**
 * Mock for uuid (ESM) so Jest can load it in integration tests.
 */
import { randomUUID } from 'node:crypto';
export function v4(): string {
  return randomUUID();
}
export default { v4 };
