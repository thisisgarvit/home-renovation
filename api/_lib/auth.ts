import { timingSafeEqual } from 'node:crypto';
import { env, text } from './env.js';

/** Constant-time comparison so the code can't be guessed character by character. */
export const sameCode = (given: string, expected: string) => {
  if (!given || !expected) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

/** Returns an error Response when the request doesn't carry the family code, otherwise null. */
export function requireFamily(request: Request): Response | null {
  const expected = env.familyCode();
  if (!expected) return text('FAMILY_CODE is not set on the server. See docs/SETUP.md.', 501);
  const url = new URL(request.url);
  const given = request.headers.get('x-family-key') || url.searchParams.get('k') || '';
  return sameCode(given, expected) ? null : text('Wrong or missing family code.', 401);
}
