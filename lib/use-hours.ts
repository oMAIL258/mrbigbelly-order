'use client';
import { useEffect, useState } from 'react';
import { cachedMenu, fetchMenu, menuIsStale, type MenuData } from './menu-cache';
import { categoryOpen, shopMinutes } from './hours';
import { bestDeal } from './promo';
import type { CartLine } from './types';

/** The shop's clock, ticking over by itself, so the menu opens at 09:00 and the
 *  deal ends at 10:00 for somebody who has had the page open since before. */
export function useShopMinutes() {
  const [now, setNow] = useState(() => shopMinutes());
  useEffect(() => {
    const id = window.setInterval(() => setNow(shopMinutes()), 20_000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

/** The menu as the menu page holds it, for screens that need to know which
 *  category a cart line came from or which deal is on. */
export function useMenuData() {
  const [data, setData] = useState<MenuData | null>(() => cachedMenu());
  useEffect(() => {
    if (!data || menuIsStale()) void fetchMenu().then(setData).catch(() => {});
    // Read once; the menu page keeps it fresh.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return data;
}

/** What the cart comes to now: the deal on, what it takes off, and the lines
 *  that cannot be ordered yet. The payment screen passes a grace period, so a
 *  deal does not vanish between the customer transferring and pressing send. */
export function useCartPricing(lines: CartLine[], grace = 0) {
  const menu = useMenuData();
  const now = useShopMinutes();
  const cats = new Map((menu?.cats ?? []).map((c) => [c.id, c]));
  const itemCat = new Map((menu?.items ?? []).map((i) => [i.id, i.category_id]));
  const deal = bestDeal(menu?.promos ?? [], lines, now, grace);
  // A line from a category that opens later, with the time it opens.
  const notYet = new Map<string, string>();
  for (const l of lines) {
    const cat = cats.get(itemCat.get(l.item_id) ?? '');
    if (cat?.available_from && !categoryOpen(cat, now)) notYet.set(l.key, cat.available_from);
  }
  return { deal, promoOff: deal?.off ?? 0, notYet, now };
}

