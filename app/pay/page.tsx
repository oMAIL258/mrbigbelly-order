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
import { useMe, usableVouchers } from '@/lib/me';

export default function PayPage() {
  const router = useRouter();
  const { lines, fulfilment, subtotal, clear } = useCart();
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);
  const voucherId = useCart((s) => s.voucherId);
  const setVoucherId = useCart((s) => s.setVoucherId);
  const hydrated = useCartHydrated();
  const { ready: liffReady, profile, token } = useLiff();
  const { t, lang } = useLang();
  const { me, reload } = useMe();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function pickFile(f: File | null) {
    setFile(f);
    setPreview(f ? URL.createObjectURL(f) : null);
  }

  const vouchers = usableVouchers(me);
  // A voucher saved from an earlier visit may have been spent since, so the
  // one in hand only counts while the server still lists it.
  const voucher = vouchers.find((v) => v.id === voucherId) ?? null;
  const discount = voucher?.discount_satang ?? 0;
  // A discount worth the whole order would leave nothing to transfer and no
  // slip for the shop to check, so it is offered only where it fits.
  const tooSmall = discount > 0 && subtotal() <= discount;
  const due = tooSmall ? subtotal() : subtotal() - discount;

  async function submit() {
    if (!file || !fulfilment) return;
    setSubmitting(true); setErr(null); setNotice(null);
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
          token,
          redemption_id: tooSmall ? null : voucher?.id ?? null,
        }),
      });
      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string; minimum?: number };
        if (body.error === 'discount used') {
          setVoucherId(null);
          await reload();
          setNotice(t.discountUsedAlready);
          setSubmitting(false);
          return;
        }
        if (body.error === 'order too small') {
          setNotice(t.orderTooSmall((body.minimum ?? 0) / 100));
          setSubmitting(false);
          return;
        }
        throw new Error(body.error ?? 'error');
      }
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
        {discount > 0 && !tooSmall && (
          <div className="mt-2 text-sm space-y-0.5">
            <div className="flex justify-between text-ink-2">
              <span>{t.subtotal}</span><span>{baht(subtotal())}</span>
            </div>
            <div className="flex justify-between text-veg">
              <span>{t.discountApplied}</span><span>−{baht(discount)}</span>
            </div>
          </div>
        )}
        <div className="text-ink-3 text-xs mt-2">{t.amountToTransfer}</div>
        <div key={due} className="pop serif text-3xl">{baht(due)}</div>
        <p className="text-ink-3 text-xs mt-1">Burassakorn L. · Ref KPS004KB000002337940</p>
      </section>

      {vouchers.length > 0 && (
        <section className="p-4 border-t border-rule">
          <h2 className="serif text-lg">{t.useDiscount}</h2>
          <p className="text-ink-3 text-xs mt-1">{t.discountReadyNote}</p>
          <ul className="mt-3 space-y-2">
            {vouchers.map((v) => {
              const off = v.discount_satang ?? 0;
              const doesNotFit = subtotal() <= off;
              const picked = v.id === voucherId;
              return (
                <li key={v.id}>
                  <button
                    onClick={() => setVoucherId(picked ? null : v.id)}
                    disabled={doesNotFit && !picked}
                    className={`w-full rounded-xl border p-3 text-left text-sm transition active:scale-[0.99] ${
                      picked ? 'border-accent bg-accent-soft/20' : 'border-rule bg-white'
                    } ${doesNotFit && !picked ? 'opacity-50' : ''}`}
                  >
                    <span className="flex items-center gap-2">
                      <span className={`h-4 w-4 shrink-0 rounded-full border ${
                        picked ? 'border-accent bg-accent' : 'border-rule'
                      }`} />
                      <span className="flex-1 min-w-0">
                        <span className="block">{lang === 'th' ? v.reward_title_th : v.reward_title_en}</span>
                        {doesNotFit && (
                          <span className="block text-ink-3 text-xs mt-0.5">{t.orderTooSmall(off / 100)}</span>
                        )}
                      </span>
                      <span className="text-veg font-medium shrink-0">−{baht(off)}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
          {voucherId && (
            <button onClick={() => setVoucherId(null)} className="text-ink-3 text-xs mt-2 underline">
              {t.noDiscountUsed}
            </button>
          )}
        </section>
      )}

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
        {notice && <div className="text-sm text-accent mb-2">{notice}</div>}
        {err && <div className="text-sm text-accent mb-2">{t.wentWrong}: {err}</div>}
        {!file && <p className="text-ink-3 text-xs mb-2">{t.uploadToFinish}</p>}
        <button onClick={submit} disabled={!file || submitting} className="btn-primary w-full disabled:opacity-50">
          {submitting ? t.sending : t.submitOrder}
        </button>
      </div>
    </>
  );
}
