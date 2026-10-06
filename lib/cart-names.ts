import type { CartLine } from './types';
import { pickName, type Lang } from './i18n';

// A saved cart line can be one of two shapes. Lines added before the language
// toggle shipped carry a single frozen `name` (plus `name_kitchen`); newer ones
// carry both languages so the cart can be re-read when the toggle flips. A
// customer may have either sitting in localStorage right now, so read both.

/** What the customer sees, re-read whenever they switch language. */
export function lineName(lang: Lang, l: CartLine): string {
  if (l.name_en) return pickName(lang, l.name_en, l.name_th);
  return l.name ?? '';
}

/** What the kitchen ticket says, the same wording whoever ordered. */
export function kitchenName(l: CartLine): string {
  return l.name_th?.trim() || l.name_en || l.name_kitchen || l.name || '';
}
