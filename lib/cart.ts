'use client';
import { useEffect, useState } from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { CartLine, Fulfilment } from './types';

// The LINE in-app browser can refuse localStorage entirely (it throws rather
// than returning null). Falling back to memory keeps the cart alive for the
// session instead of silently emptying it between pages.
const fallback = new Map<string, string>();
const safeStorage = {
  getItem: (k: string) => {
    try { return window.localStorage.getItem(k); } catch { return fallback.get(k) ?? null; }
  },
  setItem: (k: string, v: string) => {
    try { window.localStorage.setItem(k, v); } catch { fallback.set(k, v); }
  },
  removeItem: (k: string) => {
    try { window.localStorage.removeItem(k); } catch { fallback.delete(k); }
  },
};

type CartState = {
  lines: CartLine[];
  fulfilment: Fulfilment | null;
  lastCategoryId: string | null;
  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  setFulfilment: (f: Fulfilment) => void;
  setLastCategoryId: (id: string) => void;
  clear: () => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      fulfilment: null,
      lastCategoryId: null,
      add: (line) => set((s) => {
        const existing = s.lines.find((l) => l.key === line.key);
        if (!existing) return { lines: [...s.lines, line] };
        const unit = existing.line_total_satang / existing.qty;
        const qty = existing.qty + line.qty;
        return { lines: s.lines.map((l) => l.key === line.key ? { ...l, qty, line_total_satang: unit * qty } : l) };
      }),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) => set((s) => ({
        lines: s.lines.flatMap((l) => {
          if (l.key !== key) return [l];
          if (qty < 1) return [];
          return [{ ...l, qty, line_total_satang: (l.line_total_satang / l.qty) * qty }];
        }),
      })),
      setFulfilment: (fulfilment) => set({ fulfilment }),
      setLastCategoryId: (lastCategoryId) => set({ lastCategoryId }),
      clear: () => set({ lines: [], fulfilment: null }),
      subtotal: () => get().lines.reduce((n, l) => n + l.line_total_satang, 0),
    }),
    {
      name: 'mbb-cart',
      storage: createJSONStorage(() => safeStorage),
      partialize: (s) => ({ lines: s.lines, fulfilment: s.fulfilment, lastCategoryId: s.lastCategoryId }),
    },
  ),
);

// Guard pages against the persist rehydration race: on a fresh page load the
// store starts empty, so an "empty cart -> go home" check fires before the
// saved cart arrives and bounces the customer out mid-checkout.
export function useCartHydrated() {
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => {
    const p = useCart.persist;
    if (!p) { setHydrated(true); return; }
    if (p.hasHydrated()) setHydrated(true);
    return p.onFinishHydration(() => setHydrated(true));
  }, []);
  return hydrated;
}
