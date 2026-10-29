// What can be ordered at this time of day. Pure, so the order route can ask
// the same questions the menu does.
import type { Category } from './types';

/** Minutes past midnight in the shop. Bangkok is UTC+7 all year, with no DST. */
export function shopMinutes(at: Date = new Date()) {
  return (at.getUTCHours() * 60 + at.getUTCMinutes() + 7 * 60) % 1440;
}

/** '09:00:00' → 540. Empty stays empty. */
export function toMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const [h, m] = time.split(':').map(Number);
  return h * 60 + (m || 0);
}

/** '09:00:00' → '09:00', the way the shop writes it. */
export const clock = (time: string) => time.slice(0, 5);

/** A category with no start time is orderable whenever the shop is. */
export function categoryOpen(cat: Pick<Category, 'available_from'> | undefined, now: number) {
  const from = toMinutes(cat?.available_from);
  return from === null || now >= from;
}
