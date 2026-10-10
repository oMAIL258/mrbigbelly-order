/**
 * One way of writing a phone number, so that "081-234-5678", "081 234 5678"
 * and "+66 81 234 5678" all find the same customer. The database holds the
 * same rule in `normalise_phone()`, and that one is the authority — this
 * copy is here so the counter can look a number up without a round trip and
 * so a typo is caught before it is saved.
 */
export function normalisePhone(input: string | null | undefined): string | null {
  const digits = (input ?? '').replace(/[^0-9]/g, '');
  // Thailand's country code written out: +66 81 … is the local 081 ….
  if (digits.startsWith('66') && (digits.length === 11 || digits.length === 12)) {
    return `0${digits.slice(2)}`;
  }
  return digits.length >= 9 ? digits : null;
}

/** A Thai mobile is ten digits from 06, 08 or 09; a landline is nine from 0. */
export function looksLikeThaiPhone(input: string | null | undefined): boolean {
  const n = normalisePhone(input);
  if (!n) return false;
  if (!n.startsWith('0')) return false;
  return n.length === 9 || n.length === 10;
}

/** 0812345678 → 081-234-5678, which is how a Thai customer reads it back. */
export function prettyPhone(input: string | null | undefined): string {
  const n = normalisePhone(input);
  if (!n) return input ?? '';
  if (n.length === 10) return `${n.slice(0, 3)}-${n.slice(3, 6)}-${n.slice(6)}`;
  if (n.length === 9) return `${n.slice(0, 2)}-${n.slice(2, 5)}-${n.slice(5)}`;
  return n;
}
