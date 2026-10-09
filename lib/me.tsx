'use client';
import { useCallback, useEffect, useState } from 'react';
import { useLiff } from './liff';

export type PointEvent = {
  id: string; delta: number; kind: string; note: string | null;
  order_id: string | null; created_at: string;
};
export type MyOrder = {
  id: string; short_code: string | null; status: string;
  total_satang: number; fulfilment_mode: 'pickup' | 'delivery'; created_at: string;
  order_items: { name_snapshot: string; qty: number }[];
};
export type MyClaim = {
  id: string; code: string | null; status: 'pending' | 'approved' | 'rejected' | 'used';
  points_cost: number; reward_title_th: string; reward_title_en: string;
  reject_reason: string | null; created_at: string;
};
export type Me = {
  profile: { id: string; name: string | null; picture: string | null; points: number; since: string };
  events: PointEvent[];
  orders: MyOrder[];
  claims: MyClaim[];
  satangPerPoint: number;
  pointsEnabled: boolean;
};

type State = { loading: boolean; me: Me | null; needsLine: boolean };

/**
 * The signed-in customer's own record. The LIFF access token goes with every
 * request and the server asks LINE who it belongs to, so a page cannot ask for
 * somebody else's points by typing in their id.
 */
export function useMe() {
  const { ready, token } = useLiff();
  const [state, setState] = useState<State>({ loading: true, me: null, needsLine: false });

  const load = useCallback(async () => {
    if (!ready) return;
    if (!token) { setState({ loading: false, me: null, needsLine: true }); return; }
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) { setState({ loading: false, me: null, needsLine: true }); return; }
      setState({ loading: false, me: (await res.json()) as Me, needsLine: false });
    } catch {
      setState({ loading: false, me: null, needsLine: true });
    }
  }, [ready, token]);

  useEffect(() => { void load(); }, [load]);

  return { ...state, reload: load, token };
}
