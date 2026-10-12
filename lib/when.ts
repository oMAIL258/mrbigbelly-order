// Shop time, written the way somebody reads it out loud. Kept in step with
// the admin's lib/day.ts, which says the same things on the shop's screens.
export const TZ = 'Asia/Bangkok';

/** 'YYYY-MM-DD' for an instant, in shop time, so a 10pm order lands on the right day. */
export const dayKey = (iso: string | number | Date) =>
  new Date(iso).toLocaleDateString('en-CA', { timeZone: TZ });

export const todayKey = () => dayKey(new Date());

const shiftDay = (key: string, by: number) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d + by)).toISOString().slice(0, 10);
};

export const shopTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', timeZone: TZ });

/** 'วันนี้' / 'Yesterday' / '5 ต.ค.', with the year on anything older. */
export function dayLabel(iso: string, lang: 'th' | 'en' = 'en', words?: { today: string; yesterday: string }) {
  const key = dayKey(iso);
  if (key === todayKey()) return words?.today ?? 'Today';
  if (key === shiftDay(todayKey(), -1)) return words?.yesterday ?? 'Yesterday';
  const [y, m, d] = key.split('-').map(Number);
  const thisYear = Number(todayKey().slice(0, 4));
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', {
    day: 'numeric', month: 'short', timeZone: 'UTC',
    ...(y === thisYear ? {} : { year: 'numeric' }),
  });
}

/** 'Today at 17:30' / 'วันนี้ 17:30 น.' */
export function stamp(iso: string, lang: 'th' | 'en' = 'en', words?: { today: string; yesterday: string }) {
  const day = dayLabel(iso, lang, words);
  return lang === 'th' ? `${day} ${shopTime(iso)} น.` : `${day} at ${shopTime(iso)}`;
}
