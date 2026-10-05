'use client';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart, useCartHydrated } from '@/lib/cart';
import { useLiff } from '@/lib/liff';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase';

export default function PayPage() {
  const router = useRouter();
  const { lines, fulfilment, subtotal, clear } = useCart();
  const hydrated = useCartHydrated();
  const { profile } = useLiff();
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!hydrated) return;
    if (lines.length === 0) { router.replace('/'); return; }
    if (!fulfilment) router.replace('/checkout');
  }, [hydrated, lines, fulfilment, router]);

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
      clear();
      router.replace(`/order/${order_id}`);
    } catch (e) {
      setErr((e as Error).message);
      setSubmitting(false);
    }
  }

  if (!hydrated || !fulfilment) {
    return <><Header title="Pay with PromptPay" back="/checkout" /><div className="p-6 text-ink-3">Loading…</div></>;
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
