'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { Header } from '@/components/Header';
import { CountUp } from '@/components/CountUp';
import { useLang } from '@/lib/i18n';
import { useMe } from '@/lib/me';
import { baht } from '@/lib/money';

type Reward = {
  id: string;
  title_th: string; title_en: string;
  detail_th: string | null; detail_en: string | null;
  photo_url: string | null;
  points_cost: number;
  discount_satang: number | null;
  stock: number | null;
  starts_at: string | null;
  ends_at: string | null;
};

export default function RewardsPage() {
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Reward | null>(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const { lang, t } = useLang();
  const { me, needsLine, reload, token } = useMe();

  useEffect(() => {
    (async () => {
      const { data } = await supabase().from('rewards').select('*').eq('is_active', true).order('sort');
      setRewards((data ?? []) as Reward[]);
      setLoading(false);
    })();
  }, []);

  const points = me?.profile.points ?? 0;
  const name = (r: Reward) => (lang === 'th' ? r.title_th : r.title_en);
  const detail = (r: Reward) => (lang === 'th' ? r.detail_th : r.detail_en);

  const problem = (r: Reward) => {
    const now = Date.now();
    if (r.stock !== null && r.stock <= 0) return t.rewardGone;
    if (r.starts_at && new Date(r.starts_at).getTime() > now) return t.rewardNotYet;
    if (r.ends_at && new Date(r.ends_at).getTime() < now) return t.rewardExpired;
    return null;
  };

  function close() {
    setOpen(null); setSent(false); setErr(null);
  }

  async function claim(r: Reward) {
    setSending(true); setErr(null);
    const res = await fetch('/api/redeem', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, reward_id: r.id }),
    });
    setSending(false);
    if (!res.ok) {
      const body = (await res.json().catch(() => ({}))) as { error?: string };
      setErr(
        body.error === 'already pending' ? t.alreadyPending
        : body.error === 'out of stock' ? t.rewardGone
        : body.error === 'expired' ? t.rewardExpired
        : body.error === 'not yet' ? t.rewardNotYet
        : body.error === 'not enough points' ? t.needMore(r.points_cost - points)
        : t.wentWrong,
      );
      return;
    }
    setSent(true);
    await reload();
  }

  return (
    <>
      <Header title={t.rewardsTitle} back="/" />

      {me && (
        <div className="px-4 pt-4">
          <Link href="/me" className="points-card flex items-center gap-2 rounded-2xl px-4 py-3 text-white step-rise">
            <span className="shine">⭐</span>
            <span className="text-sm flex-1">{t.myPoints}</span>
            <CountUp value={points} className="serif text-2xl leading-none" />
            <span className="text-white/80 text-sm">{t.pointsWord}</span>
          </Link>
        </div>
      )}

      {loading && <p className="text-ink-3 text-sm text-center py-10">{t.loading}</p>}
      {!loading && rewards.length === 0 && (
        <div className="p-8 text-center step-rise">
          <div className="text-5xl float">🎁</div>
          <p className="text-ink-3 mt-4 text-sm">{t.noRewardsYet}</p>
          <Link href="/" className="btn-outline mt-5 inline-block">{t.backToMenu}</Link>
        </div>
      )}

      <ul className="grid grid-cols-2 gap-3 px-4 py-4 pb-10 stagger">
        {rewards.map((r) => {
          const stopped = problem(r);
          const short = !stopped && points < r.points_cost;
          return (
            <li key={r.id}>
              <button
                onClick={() => { setErr(null); setSent(false); setOpen(r); }}
                className={`card w-full text-left overflow-hidden transition active:scale-[0.98] ${stopped ? 'opacity-60' : ''}`}
              >
                <span className="block h-28 w-full bg-surface-2">
                  {r.photo_url && <img src={r.photo_url} alt="" className="h-full w-full object-cover" />}
                </span>
                <span className="block p-3">
                  <span className="block text-sm leading-snug line-clamp-2">{name(r)}</span>
                  {r.discount_satang ? (
                    <span className="block mt-1 serif text-xl text-veg leading-none">−{baht(r.discount_satang)}</span>
                  ) : null}
                  <span className="block mt-2 text-accent font-medium text-sm">
                    ⭐ {r.points_cost.toLocaleString('en-US')} {t.pointsWord}
                  </span>
                  <span className="block text-ink-3 text-[11px] mt-0.5">
                    {stopped ?? (short ? t.needMore(r.points_cost - points)
                      : r.stock === null ? t.unlimitedStock : t.pointsLeft(r.stock))}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {!loading && me && (
        <section className="card mx-4 mb-10 p-4">
          <h2 className="serif text-base">{t.howItWorks}</h2>
          <ul className="mt-2 space-y-1.5 text-ink-2 text-xs leading-relaxed">
            {[
              t.ruleEarn(Math.round(me.satangPerPoint / 100)),
              t.ruleWhen,
              me.validMonths > 0 ? t.ruleExpiry(me.validMonths) : t.ruleNoExpiry,
              t.ruleApproval,
              t.ruleOneOrder,
              t.ruleWhereSeen,
            ].map((line, i) => (
              <li key={i} className="flex gap-2"><span className="text-ink-3">·</span>{line}</li>
            ))}
          </ul>
        </section>
      )}

      {open && (
        <div className="fixed inset-0 z-30 flex items-end justify-center bg-ink/40" onClick={close}>
          <div className="sheet w-full max-w-md rounded-t-3xl bg-white p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            {sent ? (
              <div className="text-center py-4">
                <div className="relative mx-auto h-20 w-20">
                  <span className="burst absolute inset-0 rounded-full bg-accent-soft/60" />
                  <span className="relative flex h-20 w-20 items-center justify-center text-5xl">🎉</span>
                </div>
                <p className="serif text-xl mt-3">{t.requestSent}</p>
                <p className="text-ink-3 text-sm mt-1">{t.requestSentNote}</p>
                <Link href="/me" className="btn-primary w-full mt-5">{t.myRewards}</Link>
                <button onClick={close} className="btn-outline w-full mt-2">{t.backToMenu}</button>
              </div>
            ) : (
              <>
                {open.photo_url && (
                  <img src={open.photo_url} alt="" className="h-40 w-full rounded-2xl object-cover" />
                )}
                <h2 className="serif text-xl mt-3">{name(open)}</h2>
                {detail(open) && <p className="text-ink-2 text-sm mt-1 whitespace-pre-wrap">{detail(open)}</p>}

                <div className="mt-4 space-y-1.5 text-sm">
                  <p className="text-ink-2">{t.confirmRedeemNote(open.points_cost)}</p>
                  <p className="text-ink-3 text-xs">{t.ruleApproval}</p>
                  {open.discount_satang ? (
                    <p className="text-ink-3 text-xs">{t.ruleOneOrder}</p>
                  ) : null}
                </div>

                {err && <div className="text-accent text-sm mt-3">{err}</div>}

                {needsLine ? (
                  <p className="text-ink-3 text-sm mt-4 text-center">{t.openInLine}</p>
                ) : (
                  <button
                    onClick={() => claim(open)}
                    disabled={sending || Boolean(problem(open)) || points < open.points_cost}
                    className="btn-primary w-full mt-4 disabled:opacity-50"
                  >
                    {sending ? t.redeeming
                      : problem(open) ?? (points < open.points_cost
                        ? t.needMore(open.points_cost - points)
                        : `${t.redeem} · ${open.points_cost} ${t.pointsWord}`)}
                  </button>
                )}
                <button onClick={close} className="btn-outline w-full mt-2">{t.cancel}</button>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
