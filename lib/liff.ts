'use client';
import { useEffect, useState } from 'react';

type Profile = { userId: string; displayName: string; pictureUrl?: string } | null;

export function useLiff() {
  const [ready, setReady] = useState(false);
  const [profile, setProfile] = useState<Profile>(null);
  const [inClient, setInClient] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) { setReady(true); return; }
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        if (cancelled) return;
        setInClient(liff.isInClient());
        if (!liff.isLoggedIn()) {
          if (liff.isInClient()) liff.login();
          else { setReady(true); return; }
        }
        const p = await liff.getProfile();
        if (!cancelled) { setProfile(p); setReady(true); }
      } catch (e) {
        console.warn('LIFF init failed, continuing as guest', e);
        if (!cancelled) setReady(true);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  return { ready, profile, inClient };
}
