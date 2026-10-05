'use client';
import { useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, useCartHydrated } from '@/lib/cart';
import { useLiff } from '@/lib/liff';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

export default function PayPage() {
  const router = useRouter();
  const { lines, fulfilment, subtotal, clear } = useCart();
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);
  const hydrated = useCartHydrated();
  const { ready: liffReady, profile } = useLiff();
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
            item_id: l.item_id, name: l.name, base_price_satang: l.base_price_satang,
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
    return <><Header title="Pay with PromptPay" back="/checkout" /><div className="p-6 text-ink-3">Loading…</div></>;
  }

  if (lines.length === 0 || !fulfilment) {
    return (
      <>
        <Header title="Pay with PromptPay" back="/checkout" />
        <div className="p-10 text-center text-ink-3">
          <p>{lines.length === 0 ? 'Your cart is empty.' : 'Please choose pickup or delivery first.'}</p>
          <Link href={lines.length === 0 ? '/' : '/checkout'} className="btn-outline mt-4 inline-block">
            {lines.length === 0 ? 'Browse menu' : 'Back to checkout'}
          </Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Pay with PromptPay" back="/checkout" />
      <section className="p-4 text-center">
        <p className="text-ink-2 text-sm">Scan this QR with any Thai banking app</p>
        <div className="mt-3 inline-block rounded-2xl bg-white border border-rule p-3">
          <img src="/qr.jpg" alt="PromptPay QR" className="w-56 h-56 object-contain" />
        </div>
        <div className="serif text-2xl mt-2">{baht(subtotal())}</div>
        <p className="text-ink-3 text-xs">Burassakorn L. · Ref KPS004KB000002337940</p>
      </section>

      <section className="p-4 border-t border-rule">
        <h2 className="serif text-lg">Upload your payment slip</h2>
        <p className="text-ink-3 text-xs mt-1">The shop will verify and confirm your order.</p>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0] ?? null)}
        />
        {!preview ? (
          <button onClick={() => fileRef.current?.click()} className="btn-outline mt-3 w-full">
            Choose slip image
          </button>
        ) : (
          <div className="mt-3">
            <img src={preview} alt="slip preview" className="w-full rounded-xl border border-rule" />
            <button onClick={() => pickFile(null)} className="text-ink-3 text-xs mt-2 underline">Choose a different image</button>
          </div>
        )}
      </section>

      <section className="px-4 pb-2">
        {liffReady && (profile ? (
          <p className="text-ink-3 text-xs">
            Signed in as {profile.displayName}. We&rsquo;ll message you on LINE as your order moves along.
          </p>
        ) : (
          <div className="rounded-xl border border-accent bg-accent-soft/20 p-3">
            <div className="text-sm font-medium">We can&rsquo;t message you about this order</div>
            <p className="text-ink-2 text-xs mt-1">
              You&rsquo;re not connected to LINE, so there is nowhere to send updates. Open the shop from the
              Mr. Big Belly menu in LINE if you&rsquo;d like them. Your order will still go through.
            </p>
          </div>
        ))}
      </section>

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3">
        {err && <div className="text-sm text-accent mb-2">Something went wrong: {err}</div>}
        {!file && <p className="text-ink-3 text-xs mb-2">Upload your slip to finish the order.</p>}
        <button onClick={submit} disabled={!file || submitting} className="btn-primary w-full disabled:opacity-50">
          {submitting ? 'Sending…' : 'Submit order'}
        </button>
      </div>
    </>
  );
}
