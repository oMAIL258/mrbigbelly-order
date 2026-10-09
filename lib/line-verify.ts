import 'server-only';

/**
 * Who the caller actually is, according to LINE rather than according to the
 * browser. A page could send any userId it liked, and points are worth money,
 * so every read or spend of them goes through here first.
 *
 * The LIFF access token is checked against LINE's own profile endpoint, which
 * needs no extra configuration — the token already belongs to our channel.
 */
export async function lineUserFromToken(token: string | null | undefined) {
  if (!token) return null;
  try {
    const res = await fetch('https://api.line.me/v2/profile', {
      headers: { authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const profile = (await res.json()) as { userId?: string; displayName?: string; pictureUrl?: string };
    if (!profile.userId) return null;
    return {
      userId: profile.userId,
      displayName: profile.displayName ?? null,
      pictureUrl: profile.pictureUrl ?? null,
    };
  } catch {
    // LINE unreachable is not proof of identity, so nobody gets in.
    return null;
  }
}
