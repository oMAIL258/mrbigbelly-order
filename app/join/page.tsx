'use client';
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Header } from '@/components/Header';
import { Rules } from '@/components/Rules';
import { useLang } from '@/lib/i18n';
import { useLiff } from '@/lib/liff';
import { invalidateMe } from '@/lib/me';
import { looksLikeThaiPhone, prettyPhone } from '@/lib/phone';

type Membership = {
  member: boolean;
  phone: string | null;
  points: number;
  since: string | null;
  satangPerPoint: number;
  validMonths: number;
};

const TZ = 'Asia/Bangkok';
const day = (iso: string, lang: string) =>
  new Date(iso).toLocaleDateString(lang === 'th' ? 'th-TH' : 'en-GB', { day: 'numeric', month: 'short', timeZone: TZ });

/**
 * Signing up, and nothing else. This is the page behind the "register" button
 * on the shop's LINE menu: a customer who has just eaten at a table taps it,
 * gives a phone number, and is a member before the bill is paid. It asks for
 * the number rather than a name because LINE already knows the name, and
 * because the number is the only part the counter needs.
 *
 * The box to type in is on screen from the first paint, before LINE has
 * finished saying who is calling and before the shop's own record has been
 * looked up. Typing ten digits takes a person longer than either of those
 * takes the network, so the wait lands on nobody.
 */
export default function JoinPage() {
  const { ready, profile, token } = useLiff();
  const { lang, t } = useLang();

  const [state, setState] = useState<Membership | null>(null);
  const [checked, setChecked] = useState(false);
  const [refused, setRefused] = useState(false);

  const [phone, setPhone] = useState('');
  const [touched, setTouched] = useState(false);
  const [editing, setEditing] = useState(false);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [just, setJust] = useState<'joined' | 'updated' | null>(null);
  const [saved, setSaved] = useState<string | null>(null);

  const check = useCallback(async (t0: string) => {
    const res = await fetch('/api/membership', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: t0 }),
    });
    if (!res.ok) { setRefused(true); setChecked(true); return null; }
    const body = (await res.json()) as Membership;
    setState(body);
    setChecked(true);
    return body;
  }, []);

  useEffect(() => {
    if (!ready) return;
    // Outside LINE there is no way to tell whose account a number would go on,
    // and a membership with nobody attached is worth nothing to either side.
    if (!token) { setRefused(true); setChecked(true); return; }
    void check(token).then((body) => {
      // Their own number goes in the box, unless they are already typing a
      // different one, which is nobody's business to overwrite.
      if (body?.phone) setPhone((cur) => (cur ? cur : body.phone!));
    });
  }, [ready, token, check]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!looksLikeThaiPhone(phone)) { setErr(t.joinBadPhone); return; }
    setBusy(true); setErr(null);
    const res = await fetch('/api/join', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token, phone }),
    });
    const body = (await res.json().catch(() => ({}))) as { error?: string; joined?: boolean; phone?: string };
    setBusy(false);
    if (!res.ok) {
      setErr(body.error === 'taken' ? t.joinTaken : body.error === 'phone' ? t.joinBadPhone : t.joinFailed);
      return;
    }
    setSaved(body.phone ?? phone);
    setJust(body.joined ? 'joined' : 'updated');
    setEditing(false);
    setTouched(false);
    // The number is part of the profile every other screen reads.
    invalidateMe();
    if (token) void check(token);
  }

  const onFile = state?.phone ?? saved;

  // One slot on the page, and one decision about what belongs in it.
  const view =
    refused ? 'line'
    : just === 'joined' ? 'joined'
    : editing ? 'form'
    : onFile && checked && !touched ? 'member'
    : 'form';

  const name = profile?.displayName ?? '';

  return (
    <>
      <Header title={t.joinTitle} back="/" />

      <section className="px-4 pt-4">
        <div className="points-card rounded-2xl p-5 text-white step-rise">
          <div className="flex items-center gap-3">
            {profile?.pictureUrl
              ? <img src={profile.pictureUrl} alt="" className="h-11 w-11 rounded-full object-cover ring-2 ring-white/40" />
              : <span className="h-11 w-11 rounded-full bg-white/20 flex items-center justify-center">⭐</span>}
            <div className="min-w-0">
              <div className="serif text-lg truncate">{name}</div>
              <div className="text-white/70 text-xs">
                {onFile && state?.since ? t.memberSince(day(state.since, lang)) : t.joinLead}
              </div>
            </div>
          </div>
          {onFile && state && (
            <div className="mt-4 flex items-end gap-2">
              <span className="serif text-4xl leading-none">{state.points}</span>
              <span className="text-white/80 pb-1">{t.pointsWord}</span>
            </div>
          )}
          <div className="text-white/70 text-xs mt-2">{t.earnBothWays}</div>
        </div>
      </section>

      <section className="px-4 pt-3 pb-10">
        {view === 'line' && (
          <div className="card p-6 text-center step-rise">
            <div className="text-4xl float">⭐</div>
            <p className="text-ink-2 mt-3">{t.joinOpenInLine}</p>
            <Link href="/" className="btn-outline mt-4 inline-block">{t.backToMenu}</Link>
          </div>
        )}

        {view === 'joined' && (
          <div className="card p-4 text-center step-rise border-veg">
            <div className="text-3xl">🎉</div>
            <h2 className="serif text-lg mt-1">{t.joinDoneTitle}</h2>
            <p className="serif text-2xl tracking-wide mt-2">{prettyPhone(onFile)}</p>
            <p className="text-ink-2 text-sm mt-2">{t.joinDoneBody}</p>
            <div className="flex gap-2 mt-4">
              <Link href="/me" className="btn-outline flex-1 text-center">{t.seeMyPoints}</Link>
              <Link href="/" className="btn-primary flex-1 text-center">{t.browseMenu}</Link>
            </div>
          </div>
        )}

        {view === 'member' && (
          <div className="card p-4">
            <div className="flex items-baseline gap-2">
              <h2 className="serif text-base flex-1">{t.alreadyMember}</h2>
              {just === 'updated' && <span className="text-veg text-xs">{t.phoneUpdated}</span>}
            </div>
            <div className="mt-2 rounded-xl bg-accent-soft/25 py-3 text-center">
              <div className="text-ink-3 text-xs">{t.yourPhone}</div>
              <div className="serif text-2xl tracking-wide mt-0.5">{prettyPhone(onFile)}</div>
            </div>
            <p className="text-ink-3 text-xs mt-2">{t.joinPhoneWhy}</p>
            <div className="flex gap-2 mt-3">
              <button onClick={() => { setEditing(true); setJust(null); }} className="btn-outline flex-1">
                {t.changePhone}
              </button>
              <Link href="/me" className="btn-primary flex-1 text-center">{t.seeMyPoints}</Link>
            </div>
          </div>
        )}

        {view === 'form' && (
          <form onSubmit={submit} className="card p-4 space-y-3">
            <label className="block">
              <span className="text-ink-2 text-sm">{t.joinPhoneLabel}</span>
              <input
                value={phone}
                onChange={(e) => { setPhone(e.target.value); setTouched(true); setErr(null); }}
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="0812345678"
                className="mt-1 w-full rounded-xl border border-rule p-3 text-lg tracking-wide text-center"
              />
            </label>
            <p className="text-ink-3 text-xs">{t.joinPhoneWhy}</p>
            {err && <div className="text-accent text-sm">{err}</div>}
            <div className="flex gap-2">
              {onFile && (
                <button
                  type="button"
                  onClick={() => { setEditing(false); setTouched(false); setPhone(onFile); setErr(null); }}
                  className="btn-outline shrink-0"
                >
                  {t.cancel}
                </button>
              )}
              <button disabled={busy || !ready} className="btn-primary flex-1 disabled:opacity-50">
                {busy || !ready ? '…' : onFile ? t.savePhone : t.joinButton}
              </button>
            </div>
          </form>
        )}

        {state && <Rules satangPerPoint={state.satangPerPoint} validMonths={state.validMonths} />}
      </section>
    </>
  );
}
