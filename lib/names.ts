import type { CartLine } from './types';
import { pickName, otherName, type Lang } from './i18n';

// The shop names juices, bowls, smoothies and most sandwiches in English and
// uses the Thai line to say what is in them; everything else has a real Thai
// name. No column says which is which, so read the text: a line with commas,
// or with three or more words and no "·" separator, is a list of ingredients
// rather than a name. Reading it wrong only swaps the two lines on screen,
// since both are always shown.
function readsAsIngredients(th: string): boolean {
  if (th.includes(',')) return true;
  if (th.includes('·')) return false;
  return th.split(/\s+/).length >= 3;
}

/** The big line for a dish: its name, in the customer's language where it has one. */
export function dishTitle(lang: Lang, en: string, th: string | null | undefined): string {
  const thai = th?.trim();
  if (!thai || readsAsIngredients(thai)) return en;
  return pickName(lang, en, thai);
}

/** The small line under it: the name in the other language, or the ingredients. */
export function dishSubtitle(lang: Lang, en: string, th: string | null | undefined): string | null {
  const thai = th?.trim();
  if (!thai) return null;
  if (readsAsIngredients(thai)) return lang === 'th' ? thai : null;
  return otherName(lang, en, thai);
}

// A saved cart line comes in one of two shapes. Lines added before the language
// toggle shipped carry a single frozen `name` (plus `name_kitchen`); newer ones
// carry both languages so the cart can be re-read when the toggle flips. A
// customer may have either sitting in localStorage right now, so read both.

/** What the customer sees, re-read whenever they switch language. */
export function lineName(lang: Lang, l: CartLine): string {
  if (l.name_en) return dishTitle(lang, l.name_en, l.name_th);
  return l.name ?? '';
}

/** What the kitchen ticket says, the same wording whoever ordered. Never the
 *  ingredient line: "Veggie Joint" is what the counter calls out, not the six
 *  vegetables in it. */
export function kitchenName(l: CartLine): string {
  const thai = l.name_th?.trim();
  if (thai && !readsAsIngredients(thai)) return thai;
  return l.name_en ?? l.name_kitchen ?? l.name ?? '';
}
