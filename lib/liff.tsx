'use client';
import { createContext, useContext, useEffect, useState } from 'react';

type Profile = { userId: string; displayName: string; pictureUrl?: string } | null;
// The access token is what proves to our own server that this really is the
// customer whose points are about to be read or spent. The browser-supplied
// userId alone proves nothing, so points never travel on it.
type LiffValue = { ready: boolean; profile: Profile; token: string | null };

const LiffContext = createContext<LiffValue>({ ready: false, profile: null, token: null });

export function LiffProvider({ children }: { children: React.ReactNode }) {
  const [value, setValue] = useState<LiffValue>({ ready: false, profile: null, token: null });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
      if (!liffId) { setValue({ ready: true, profile: null, token: null }); return; }
      let profile: Profile = null;
      let token: string | null = null;
      try {
        const liff = (await import('@line/liff')).default;
        await liff.init({ liffId });
        // Never call liff.login(). It is a full-page redirect that returns to
        // the LIFF entry URL, so calling it mid-checkout throws the customer
        // back to the menu. Inside LINE the user is already authenticated; if
        // they somehow are not, the order still works, it just gets no push.
        if (liff.isLoggedIn()) {
          profile = await liff.getProfile();
          token = liff.getAccessToken();
        }
      } catch (e) {
        console.warn('LIFF unavailable, continuing as guest', e);
      }
      if (!cancelled) setValue({ ready: true, profile, token });
    })();
    return () => { cancelled = true; };
  }, []);

  return <LiffContext.Provider value={value}>{children}</LiffContext.Provider>;
}

export const useLiff = () => useContext(LiffContext);
