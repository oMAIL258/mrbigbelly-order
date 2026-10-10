'use client';
import { useCallback, useEffect, useSyncExternalStore } from 'react';
import { useLiff } from './liff';

export type PointEvent = {
  id: string; delta: number; kind: string; note: string | null;
  order_id: string | null; created_at: string;
};
export type MyOrder = {
  id: string; short_code: string | null; status: string;
  subtotal_satang: number | null; discount_satang: number | null;
  total_satang: number; fulfilment_mode: 'pickup' | 'delivery'; created_at: string;
  order_items: { name_snapshot: string; qty: number }[];
};
export type MyClaim = {
  id: string; code: string | null; status: 'pending' | 'approved' | 'rejected' | 'used';
  points_cost: number; discount_satang: number | null;
  reward_title_th: string; reward_title_en: string;
  reject_reason: string | null; created_at: string;
};
export type Me = {
  profile: { id: string; name: string | null; picture: string | null; points: number; since: string };
  events: PointEvent[];
  orders: MyOrder[];
  claims: MyClaim[];
  satangPerPoint: number;
  pointsEnabled: boolean;
  /** How many months a point lasts. 0 means they never run out. */
  validMonths: number;
  /** The next points to run out, and when. */
  expiring: { points: number; on: string } | null;
};

/**
 * Forget what is held, so the next screen asks again. Used after something the
 * customer did changes their record while they are being taken elsewhere — a
 * voucher spent on an order would otherwise still read as available on their
 * profile until the copy went stale on its own.
 */
export function invalidateMe() {
  heldFor = null;
  heldAt = 0;
}

/** The approved discounts and rewards this customer still has to spend. */
export function usableVouchers(me: Me | null): MyClaim[] {
  return (me?.claims ?? []).filter((c) => c.status === 'approved' && c.discount_satang);
}

type Snapshot = { loading: boolean; me: Me | null; needsLine: boolean };

const INITIAL: Snapshot = { loading: true, me: null, needsLine: false };

// One answer, shared by every component that asks for it. The profile is read
// on the menu, the rewards list, the payment screen and the profile itself, and
// each read costs a round trip to LINE to prove who is calling — so four
// screens used to mean four of them, on the slowest leg of the journey.
let snapshot: Snapshot = INITIAL;
let heldFor: string | null = null;
let heldAt = 0;
let inFlight: Promise<void> | null = null;
const listeners = new Set<() => void>();

// Long enough that moving between screens is free, short enough that a balance
// is never visibly behind. Anything that changes it — claiming a reward,
// placing an order — asks for a fresh copy rather than waiting this out.
const FRESH_MS = 45_000;

function publish(next: Snapshot) {
  snapshot = next;
  for (const l of listeners) l();
}

async function load(token: string, force = false): Promise<void> {
  // A second screen mounting mid-request waits for the one already going out
  // instead of sending its own. A forced reload cannot do that: it is asked for
  // because something just changed, and a reply to a question sent before the
  // change would not show it.
  if (inFlight) {
    if (!force) return inFlight;
    await inFlight.catch(() => {});
  }
  inFlight = (async () => {
    try {
      const res = await fetch('/api/me', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ token }),
      });
      if (!res.ok) {
        // A refused token means this is not the customer any more. A refusal is
        // the one case worth forgetting what we hold.
        heldFor = null;
        publish({ loading: false, me: null, needsLine: true });
        return;
      }
      heldFor = token;
      heldAt = Date.now();
      publish({ loading: false, me: (await res.json()) as Me, needsLine: false });
    } catch {
      // A refresh that could not go out says nothing about the customer, so
      // what is already on screen stays there rather than their balance
      // vanishing on a patchy connection.
      if (!snapshot.me) publish({ loading: false, me: null, needsLine: true });
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}

/**
 * The signed-in customer's own record. The LIFF access token goes with every
 * request and the server asks LINE who it belongs to, so a page cannot ask for
 * somebody else's points by typing in their id.
 *
 * A screen that already has an answer renders it at once and refreshes behind
 * the scenes, so coming back to the menu is instant rather than a spinner.
 */
export function useMe() {
  const { ready, token } = useLiff();
  const state = useSyncExternalStore(
    (onChange) => { listeners.add(onChange); return () => { listeners.delete(onChange); }; },
    () => snapshot,
    () => INITIAL,
  );

  useEffect(() => {
    if (!ready) return;
    if (!token) {
      heldFor = null;
      if (snapshot.me || snapshot.loading) publish({ loading: false, me: null, needsLine: true });
      return;
    }
    // Somebody else's answer is never shown: a different token starts over.
    if (heldFor !== token) { void load(token); return; }
    if (Date.now() - heldAt > FRESH_MS) void load(token);
  }, [ready, token]);

  const reload = useCallback(async () => {
    if (token) await load(token, true);
  }, [token]);

  return { ...state, reload, token };
}
