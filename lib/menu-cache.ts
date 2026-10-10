'use client';
import { supabase } from './supabase';
import type { Category, MenuItem, StoreSettings } from './types';

export type MenuData = { cats: Category[]; items: MenuItem[]; settings: StoreSettings | null };

// The menu does not change while somebody is reading it, but it was fetched
// again every time they came back from a dish, so the whole list arrived from
// Singapore once per tap of the back button. It is held here instead and
// refreshed quietly behind whatever is already on screen.
let held: MenuData | null = null;
let heldAt = 0;
let inFlight: Promise<MenuData> | null = null;

const FRESH_MS = 60_000;

/** What is already known, for a first paint with no waiting. */
export function cachedMenu(): MenuData | null {
  return held;
}

export function menuIsStale(): boolean {
  return !held || Date.now() - heldAt > FRESH_MS;
}

export async function fetchMenu(): Promise<MenuData> {
  if (inFlight) return inFlight;
  inFlight = (async () => {
    try {
      const sb = supabase();
      const [c, i, s] = await Promise.all([
        sb.from('categories').select('*').order('sort'),
        sb.from('menu_items').select('*').eq('is_available', true).order('sort'),
        sb.from('store_settings').select('accepting_orders, closed_message').limit(1).maybeSingle(),
      ]);
      const next: MenuData = {
        cats: (c.data ?? []) as Category[],
        items: (i.data ?? []) as MenuItem[],
        settings: (s.data ?? null) as StoreSettings | null,
      };
      // An empty answer is usually a dropped connection rather than a shop with
      // no menu, so what was already known is kept.
      if (next.cats.length === 0 && held) return held;
      held = next;
      heldAt = Date.now();
      return next;
    } finally {
      inFlight = null;
    }
  })();
  return inFlight;
}
