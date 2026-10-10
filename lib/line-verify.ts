import 'server-only';
import { createHash } from 'node:crypto';

export type LineUser = { userId: string; displayName: string | null; pictureUrl: string | null };

/**
 * Asking LINE who a token belongs to costs a round trip out of the data centre,
 * and the same customer's token arrives several times in a row: the menu, the
 * rewards list, the payment screen, the order they just placed. The answer
 * cannot change inside a minute in any way that matters — a token stays issued
 * to the person it was issued to — so it is held briefly rather than bought
 * again on every request.
 *
 * Only successes are kept. A refusal is never cached, so a customer whose token
 * has only just become valid is not locked out for a minute.
 *
 * The key is a hash, not the token: the raw credential has no business sitting
 * in a structure that outlives the request that brought it.
 */
const TTL_MS = 60_000;
const CEILING = 500;
const held = new Map<string, { who: LineUser; until: number }>();

const keyFor = (token: string) => createHash('sha256').update(token).digest('base64');

function remember(key: string, who: LineUser) {
  // Each instance of the site's server holds its own copy, so this is a small
  // cache rather than a store. Dropping the oldest entries keeps it that way.
  if (held.size >= CEILING) {
    const now = Date.now();
    for (const [k, v] of held) if (v.until <= now) held.delete(k);
    while (held.size >= CEILING) {
      const oldest = held.keys().next();
      if (oldest.done) break;
      held.delete(oldest.value);
    }
  }
  held.set(key, { who, until: Date.now() + TTL_MS });
}

/**
 * Who the caller actually is, according to LINE rather than according to the
 * browser. A page could send any userId it liked, and points are worth money,
 * so every read or spend of them goes through here first.
 *
 * The LIFF access token is checked against LINE's own profile endpoint, which
 * needs no extra configuration — the token already belongs to our channel.
 */
export async function lineUserFromToken(token: string | null | undefined): Promise<LineUser | null> {
  if (!token) return null;

  const key = keyFor(token);
  const hit = held.get(key);
  if (hit && hit.until > Date.now()) return hit.who;
  if (hit) held.delete(key);

  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const profile = (await res.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
    if (!profile.userId) return null;
    const who: LineUser = {
      userId: profile.userId,
      displayName: profile.displayName ?? null,
      pictureUrl: profile.pictureUrl ?? null,
    };
    remember(key, who);
    return who;
  } catch {
    // LINE unreachable is not proof of identity, so nobody gets in.
    return null;
  }
}
