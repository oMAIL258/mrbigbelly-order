'use client';
import { useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { CountUp } from '@/components/CountUp';
import { useLang } from '@/lib/i18n';
import { useMe, type MyClaim } from '@/lib/me';
import { baht } from '@/lib/money';

const TZ = 'Asia/Bangkok';
const day = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', timeZone: TZ });

export default function MePage() {
  const { loading, me, needsLine } = useMe();
  const { lang, t } = useLang();
  const [tab, setTab] = useState<'claims' | 'points' | 'orders'>('claims');

  if (loading) {
    return <><Header title={t.myPoints} back="/" /><div className="p-6 text-ink-3">{t.loading}</div></>;
  }

  if (needsLine || !me) {
    return (
      <>
        <Header title={t.myPoints} back="/" />
        <div className="p-8 text-center step-rise">
          <div className="text-5xl float">⭐</div>
          <p className="text-ink-2 mt-4">{t.openInLine}</p>
          <Link href="/" className="btn-outline mt-5 inline-block">{t.backToMenu}</Link>
        </div>
      </>
    );
  }

  const kind = (k: string) =>
    k === 'earn' ? t.keEarn
    : k === 'welcome' ? t.keWelcome
    : k === 'redeem' ? t.keRedeem
    : k === 'refund' ? t.keRefund
    : t.keManual;

  const claimLabel = (s: MyClaim['status']) =>
    s === 'pending' ? t.claimPending
    : s === 'approved' ? t.claimApproved
    : s === 'used' ? t.claimUsed
    : t.claimRejected;

  return (
    <>
      <Header title={t.myPoints} back="/" />

      <section className="px-4 pt-4">
        <div className="points-card rounded-2xl p-5 text-white step-rise">
          <div className="flex items-center gap-3">
            {me.profile.picture
              ? <img src={me.profile.picture} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40" />
              : <span className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center">⭐</span>}
            <div className="min-w-0">
              <div className="serif text-lg truncate">{me.profile.name ?? ''}</div>
              <div className="text-white/70 text-xs">{t.memberSince(day(me.profile.since, lang))}</div>
            </div>
          </div>

          <div className="mt-4 flex items-end gap-2">
            <CountUp value={me.profile.points} className="serif text-5xl leading-none" />
            <span className="text-white/80 pb-1">{t.pointsWord}</span>
          </div>
          <div className="text-white/70 text-xs mt-2">
            {me.pointsEnabled ? t.earnRate(Math.round(me.satangPerPoint / 100)) : t.pointsOff}
          </div>
        </div>

        <Link href="/rewards" className="btn-primary w-full mt-3">🎁 {t.browseRewards}</Link>
      </section>

      <nav className="flex gap-2 px-4 pt-4 overflow-x-auto">
        {([['claims', t.myRewards], ['points', t.myPointsHistory], ['orders', t.myOrders]] as const).map(([k, label]) => (
          <button
            key={k}
            onClick={() => setTab(k)}
            className={`shrink-0 rounded-full px-3 py-1.5 text-sm transition ${
              tab === k ? 'bg-accent text-white' : 'bg-white border border-rule text-ink-2'
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      <section className="px-4 py-3 pb-10">
        {tab === 'claims' && (
          me.claims.length === 0 ? <Empty text={t.nothingYet} /> : (
            <ul className="space-y-2 stagger">
              {me.claims.map((c) => (
                <li key={c.id} className={`card p-3 ${c.status === 'approved' ? 'border-accent' : ''}`}>
                  <div className="flex items-baseline gap-2">
                    <span className="serif text-base flex-1 min-w-0 truncate">
                      {lang === 'th' ? c.reward_title_th : c.reward_title_en}
                    </span>
                    <span className="chip">{claimLabel(c.status)}</span>
                  </div>
                  <div className="text-ink-3 text-xs mt-1">
                    −{c.points_cost} {t.pointsWord} · {day(c.created_at, lang)}
                  </div>
                  {c.status === 'approved' && c.code && (
                    <div className="mt-2 rounded-xl bg-accent-soft/25 p-3 text-center">
                      <div className="serif text-2xl tracking-[0.2em]">{c.code}</div>
                      <div className="text-ink-2 text-xs mt-1">{t.showCode}</div>
                    </div>
                  )}
                  {c.status === 'rejected' && c.reject_reason && (
                    <div className="text-ink-3 text-xs mt-1 italic">{c.reject_reason}</div>
                  )}
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'points' && (
          me.events.length === 0 ? <Empty text={t.nothingYet} /> : (
            <ul className="card divide-y divide-rule stagger">
              {me.events.map((e) => (
                <li key={e.id} className="flex items-center gap-3 p-3 text-sm">
                  <span className={`w-14 shrink-0 font-medium ${e.delta > 0 ? 'text-veg' : 'text-accent'}`}>
                    {e.delta > 0 ? `+${e.delta}` : e.delta}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span className="block">{kind(e.kind)}</span>
                    {e.note && <span className="block text-ink-3 text-xs truncate">{e.note}</span>}
                  </span>
                  <span className="text-ink-3 text-xs shrink-0">{day(e.created_at, lang)}</span>
                </li>
              ))}
            </ul>
          )
        )}

        {tab === 'orders' && (
          me.orders.length === 0 ? <Empty text={t.nothingYet} /> : (
            <ul className="space-y-2 stagger">
              {me.orders.map((o) => (
                <li key={o.id}>
                  <Link href={`/order/${o.id}`} className="card block p-3 hover:border-ink-3">
                    <div className="flex justify-between items-baseline">
                      <span className="serif text-sm">{o.short_code ?? o.id.slice(0, 6)}</span>
                      <span className="text-ink-3 text-xs">{day(o.created_at, lang)}</span>
                    </div>
                    <div className="text-ink-3 text-xs mt-1 truncate">
                      {o.order_items.map((i) => `${i.qty}× ${i.name_snapshot}`).join(', ')}
                    </div>
                    <div className="flex justify-between text-sm mt-1">
                      <span className="text-ink-2">{o.fulfilment_mode === 'pickup' ? t.pickup : t.delivery}</span>
                      <span className="font-medium">{baht(o.total_satang)}</span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )
        )}
      </section>
    </>
  );
}

const Empty = ({ text }: { text: string }) => (
  <p className="text-ink-3 text-sm text-center py-10">{text}</p>
);
