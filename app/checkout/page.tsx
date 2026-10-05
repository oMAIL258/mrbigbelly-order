'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, useCartHydrated } from '@/lib/cart';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';

const AREAS = [
  { slug: 'rwbk' as const, label: 'ซอยราชวินิตบางแก้ว' },
  { slug: 'ntw7' as const, label: 'หมู่บ้านนันทวัน บางนา กม 7' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, setFulfilment } = useCart();
  const hydrated = useCartHydrated();
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');
  const [area, setArea] = useState<'rwbk' | 'ntw7'>('rwbk');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const digits = phone.replace(/\D/g, '');
  const missing: string[] = [];
  if (mode === 'delivery') {
    if (!address.trim()) missing.push('address');
    if (!name.trim()) missing.push('name');
    if (digits.length < 9) missing.push('phone number');
  }
  const ready = missing.length === 0;

  function proceed() {
    if (!ready) return;
    setFulfilment(
      mode === 'pickup'
        ? { mode: 'pickup' }
        : { mode: 'delivery', area_slug: area, address: address.trim(), phone: phone.trim(), name: name.trim() },
    );
    router.push('/pay');
  }

  if (!hydrated) return <><Header title="Checkout" back="/cart" /><div className="p-6 text-ink-3">Loading…</div></>;

  if (lines.length === 0) {
    return (
      <>
        <Header title="Checkout" back="/" />
        <div className="p-10 text-center text-ink-3">
          <p>Your cart is empty.</p>
          <Link href="/" className="btn-outline mt-4 inline-block">Browse menu</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title="Checkout" back="/cart" />
      <section className="p-4">
        <h2 className="serif text-lg mb-2">How would you like to receive it?</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('pickup')}
            className={`rounded-xl border p-3 text-sm ${mode === 'pickup' ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'}`}
          >
            <div className="serif text-base">Pickup</div>
            <div className="text-ink-3 text-xs mt-1">At the shop</div>
          </button>
          <button
            onClick={() => setMode('delivery')}
            className={`rounded-xl border p-3 text-sm ${mode === 'delivery' ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'}`}
          >
            <div className="serif text-base">Delivery</div>
            <div className="text-ink-3 text-xs mt-1">Free · limited areas</div>
          </button>
        </div>
      </section>

      {mode === 'delivery' && (
        <section className="p-4 border-t border-rule space-y-3">
          <div>
            <label className="text-sm text-ink-2">Delivery area</label>
            <div className="mt-1 grid grid-cols-1 gap-2">
              {AREAS.map((a) => (
                <button
                  key={a.slug}
                  onClick={() => setArea(a.slug)}
                  className={`rounded-xl border p-3 text-sm text-left ${area === a.slug ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'}`}
                >
                  {a.label}
                </button>
              ))}
            </div>
            <p className="text-ink-3 text-xs mt-2">We only deliver to these two areas for now.</p>
          </div>
          <div>
            <label className="text-sm text-ink-2">Address (house no., building)</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-ink-2">Name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-2">Phone</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </div>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3">
        <div className="flex justify-between mb-3 text-sm">
          <span className="text-ink-2">Total</span>
          <span className="font-medium">{baht(subtotal())}</span>
        </div>
        {!ready && (
          <p className="text-accent text-xs mb-2">Please add your {missing.join(', ')} to continue.</p>
        )}
        <button onClick={proceed} disabled={!ready} className="btn-primary w-full disabled:opacity-50">
          Continue to payment
        </button>
      </div>
    </>
  );
}
