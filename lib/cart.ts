'use client';
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CartLine } from './types';

type CartState = {
  lines: CartLine[];
  add: (line: CartLine) => void;
  remove: (key: string) => void;
  setQty: (key: string, qty: number) => void;
  clear: () => void;
  subtotal: () => number;
};

export const useCart = create<CartState>()(
  persist(
    (set, get) => ({
      lines: [],
      add: (line) => set((s) => {
        const existing = s.lines.find((l) => l.key === line.key);
        if (existing) {
          return { lines: s.lines.map((l) => l.key === line.key ? { ...l, qty: l.qty + line.qty, line_total_satang: (l.qty + line.qty) * (l.line_total_satang / l.qty) } : l) };
        }
        return { lines: [...s.lines, line] };
      }),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      setQty: (key, qty) => set((s) => ({
        lines: s.lines.map((l) => l.key === key ? { ...l, qty, line_total_satang: qty * (l.line_total_satang / l.qty) } : l).filter((l) => l.qty > 0),
      })),
      clear: () => set({ lines: [] }),
      subtotal: () => get().lines.reduce((n, l) => n + l.line_total_satang, 0),
    }),
    { name: 'mbb-cart' },
  ),
);
