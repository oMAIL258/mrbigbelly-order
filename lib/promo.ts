// Bundle deals: any N of the listed items for one price, between two times.
// Pure, so the cart and the order route price a deal the same way.
import { toMinutes } from './hours';
import type { Promotion } from './types';

type PricedLine = { item_id: string; qty: number; line_total_satang: number };

/** A deal that ended this long ago is still honoured for a cart priced under it,
 *  so somebody transferring at 09:59 is not charged more at 10:01. */
export const PROMO_GRACE_MINUTES = 15;

export function promoLive(p: Promotion, now: number, grace = 0) {
  const from = toMinutes(p.starts_at);
  const to = toMinutes(p.ends_at);
  if (!p.is_active || from === null || to === null) return false;
  return now >= from && now < to + grace;
}

export type PromoResult = {
  promo: Promotion;
  /** What comes off the order. */
  off: number;
  /** Items in the cart the deal covers. */
  eligible: number;
  /** How many more would complete the next bundle. 0 when none are waiting. */
  short: number;
};

/** Each drink is priced as it was picked, iced included. The dearest are put
 *  together first, which is the customer's best deal, and a bundle that would
 *  cost more than the items on their own is left at their own price. */
export function priceDeal(p: Promotion, lines: PricedLine[]): PromoResult {
  const ids = new Set(p.item_ids);
  const units: number[] = [];
  for (const l of lines) {
    if (!ids.has(l.item_id) || l.qty < 1) continue;
    const each = Math.round(l.line_total_satang / l.qty);
    for (let i = 0; i < l.qty; i++) units.push(each);
  }
  units.sort((a, b) => b - a);
  const n = Math.max(2, p.bundle_qty);
  let off = 0;
  for (let i = 0; i + n <= units.length; i += n) {
    const sum = units.slice(i, i + n).reduce((a, b) => a + b, 0);
    off += Math.max(0, sum - p.bundle_price_satang);
  }
  const left = units.length % n;
  return { promo: p, off, eligible: units.length, short: left ? n - left : 0 };
}

/** The live deal worth the most to this cart, or the first live one when none
 *  applies yet, so the cart can say what to add. */
export function bestDeal(promos: Promotion[], lines: PricedLine[], now: number, grace = 0): PromoResult | null {
  let best: PromoResult | null = null;
  for (const p of promos) {
    if (!promoLive(p, now, grace)) continue;
    const r = priceDeal(p, lines);
    if (!best || r.off > best.off || (r.off === best.off && r.eligible > best.eligible)) best = r;
  }
  return best;
}
