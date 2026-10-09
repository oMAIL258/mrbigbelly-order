'use client';
import Link from 'next/link';
import { CountUp } from './CountUp';
import { useLang } from '@/lib/i18n';
import { useMe } from '@/lib/me';

/**
 * The customer's points, on the menu where they are already looking. Shown only
 * once the profile is known, so the menu never flashes an empty card at someone
 * browsing from an ordinary browser.
 */
export function MemberStrip() {
  const { me, loading } = useMe();
  const { t } = useLang();
  if (loading || !me) return null;

  return (
    <section className="px-4 pt-3 step-rise">
      <div className="points-card rounded-2xl p-4 text-white">
        <div className="flex items-center gap-3">
          {me.profile.picture
            ? <img src={me.profile.picture} alt="" className="h-10 w-10 rounded-full object-cover ring-2 ring-white/40" />
            : <span className="h-10 w-10 rounded-full bg-white/20 flex items-center justify-center shine">⭐</span>}
          <div className="min-w-0 flex-1">
            <div className="text-white/70 text-xs">{t.myPoints}</div>
            <div className="flex items-end gap-1.5">
              <CountUp value={me.profile.points} className="serif text-2xl leading-none" />
              <span className="text-white/80 text-sm">{t.pointsWord}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2 mt-3">
          <Link href="/rewards" className="flex-1 rounded-full bg-white/95 text-accent text-sm font-medium py-2 text-center">
            🎁 {t.browseRewards}
          </Link>
          <Link href="/me" className="rounded-full border border-white/50 text-white text-sm px-4 py-2">
            {t.myRewards}
          </Link>
        </div>
      </div>
    </section>
  );
}
