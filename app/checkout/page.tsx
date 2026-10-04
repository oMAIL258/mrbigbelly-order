'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useCart } from '@/lib/cart';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import type { Fulfilment } from '@/lib/types';

const AREAS = [
  { slug: 'rwbk' as const, label: 'ซอยราชวินิตบางแก้ว' },
  { slug: 'ntw7' as const, label: 'หมู่บ้านนันทวัน บางนา กม 7' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal } = useCart();
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');
  const [area, setArea] = useState<'rwbk' | 'ntw7'>('rwbk');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  useEffect(() => { if (lines.length === 0) router.replace('/'); }, [lines, router]);

  function proceed() {
    const f: Fulfilment = mode === 'pickup'
      ? { mode: 'pickup' }
      : { mode: 'delivery', area_slug: area, address, phone, name };
    sessionStorage.setItem('mbb-fulfilment', JSON.stringify(f));
    router.push('/pay');
  }

  const deliveryOk = mode === 'pickup' || (address.trim() && name.trim() && phone.trim().length >= 9);

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
        <button onClick={proceed} disabled={!deliveryOk} className="btn-primary w-full disabled:opacity-50">
          Continue to payment
        </button>
      </div>
    </>
  );
}
