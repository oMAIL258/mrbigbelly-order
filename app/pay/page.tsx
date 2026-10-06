'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, useCartHydrated } from '@/lib/cart';
import { useLiff } from '@/lib/liff';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';
import { useLang } from '@/lib/i18n';
import { kitchenName } from '@/lib/names';

export default function PayPage() {
  const router = useRouter();
  const { lines, fulfilment, subtotal, clear } = useCart();
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);
  const hydrated = useCartHydrated();
  const { ready: liffReady, profile } = useLiff();
  const { t } = useLang();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  async function submit() {
    if (!file || !fulfilment) return;
    setSubmitting(true); setErr(null);
    try {
      const sb = supabase();
      const ext = file.name.split('.').pop()?.toLowerCase() || 'jpg';
      const path = `pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
      const up = await sb.storage.from('slips').upload(path, file, { contentType: file.type, upsert: false });
      if (up.error) throw up.error;

      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          line_user_id: profile?.userId ?? null,
          display_name: profile?.displayName ?? null,
          lines: lines.map((l) => ({
            item_id: l.item_id, name: kitchenName(l), base_price_satang: l.base_price_satang,
            qty: l.qty, options: l.option_labels, option_ids: l.option_ids,
            line_total_satang: l.line_total_satang, note: l.note ?? null,
          })),
          total_satang: subtotal(),
          fulfilment,
          slip_path: up.data.path,
        }),
      });
      if (!res.ok) throw new Error(await res.text());
      const { order_id } = (await res.json()) as { order_id: string };
      setActiveOrderId(order_id);
      clear();
      router.replace(`/order/${order_id}`);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  }

  if (!hydrated) {
    return <><Header title={t.payTitle} back="/checkout" /><div className="p-6 text-ink-3">{t.loading}</div></>;
  }

  if (lines.length === 0 || !fulfilment) {
    return (
      <>
        <Header title={t.payTitle} back="/checkout" />
        <div className="p-10 text-center text-ink-3">
          <p>{lines.length === 0 ? t.cartEmpty : t.howReceive}</p>
          <Link href={lines.length === 0 ? '/' : '/checkout'} className="btn-outline mt-4 inline-block">
            {lines.length === 0 ? t.browseMenu : t.checkoutTitle}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={t.payTitle} back="/checkout" />
      <section className="p-4 text-center">
        <p className="text-ink-2 text-sm">{t.scanQr}</p>
        <div className="mt-3 inline-block rounded-2xl bg-white border border-rule p-3">
          <img src="/qr.jpg" alt="PromptPay QR" className="w-56 h-56 object-contain" />
        </div>
        <div className="serif text-2xl mt-2">{baht(subtotal())}</div>
        <p className="text-ink-3 text-xs">Burassakorn L. · Ref KPS004KB000002337940</p>
      </section>

      <section className="p-4 border-t border-rule">
        <h2 className="serif text-lg">{t.uploadSlip}</h2>
        <p className="text-ink-3 text-xs mt-1">{t.uploadSlipSub}</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {!preview ? (
          <button onClick={() => fileRef.current?.click()} className="btn-outline mt-3 w-full">
            {t.chooseSlip}
          </button>
        ) : (
          <div className="mt-3">
            <img src={preview} alt="slip preview" className="w-full rounded-xl border border-rule" />
            <button onClick={() => pickFile(null)} className="text-ink-3 text-xs mt-2 underline">{t.chooseOther}</button>
          </div>
        )}
      </section>

      <section className="px-4 pb-2">
        {liffReady && (profile ? (
          <p className="text-ink-3 text-xs">{t.signedInAs(profile.displayName)}</p>
        ) : (
          <div className="rounded-xl border border-accent bg-accent-soft/20 p-3">
            <div className="text-sm font-medium">{t.noLineTitle}</div>
            <p className="text-ink-2 text-xs mt-1">{t.noLineBody}</p>
          </div>
        ))}
      </section>

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3">
        {err && <div className="text-sm text-accent mb-2">{t.wentWrong}: {err}</div>}
        {!file && <p className="text-ink-3 text-xs mb-2">{t.uploadToFinish}</p>}
        <button onClick={submit} disabled={!file || submitting} className="btn-primary w-full disabled:opacity-50">
          {submitting ? t.sending : t.submitOrder}
        </button>
      </div>
    </>
  );
}
