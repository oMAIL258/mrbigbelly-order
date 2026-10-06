'use client';
import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCart, useCartHydrated } from '@/lib/cart';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { useLang } from '@/lib/i18n';

const AREAS = [
  { slug: 'rwbk' as const, label: 'ซอยราชวินิตบางแก้ว' },
  { slug: 'ntw7' as const, label: 'หมู่บ้านนันทวัน บางนา กม 7' },
];

export default function CheckoutPage() {
  const router = useRouter();
  const { lines, subtotal, setFulfilment } = useCart();
  const hydrated = useCartHydrated();
  const { t } = useLang();
  const [mode, setMode] = useState<'pickup' | 'delivery'>('pickup');
  const [area, setArea] = useState<'rwbk' | 'ntw7'>('rwbk');
  const [address, setAddress] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');

  const digits = phone.replace(/\D/g, '');
  const missing: string[] = [];
  if (mode === 'delivery') {
    if (!address.trim()) missing.push(t.fieldAddress);
    if (!name.trim()) missing.push(t.fieldName);
    if (digits.length < 9) missing.push(t.fieldPhone);
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

  if (!hydrated) return <><Header title={t.checkoutTitle} back="/cart" /><div className="p-6 text-ink-3">{t.loading}</div></>;

  if (lines.length === 0) {
    return (
      <>
        <Header title={t.checkoutTitle} back="/" />
        <div className="p-10 text-center text-ink-3">
          <p>{t.cartEmpty}</p>
          <Link href="/" className="btn-outline mt-4 inline-block">{t.browseMenu}</Link>
        </div>
      </>
    );
  }

  return (
    <>
      <Header title={t.checkoutTitle} back="/cart" />
      <section className="p-4">
        <h2 className="serif text-lg mb-2">{t.howReceive}</h2>
        <div className="grid grid-cols-2 gap-2">
          <button
            onClick={() => setMode('pickup')}
            className={`rounded-xl border p-3 text-sm ${mode === 'pickup' ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'}`}
          >
            <div className="serif text-base">{t.pickup}</div>
            <div className="text-ink-3 text-xs mt-1">{t.pickupSub}</div>
          </button>
          <button
            onClick={() => setMode('delivery')}
            className={`rounded-xl border p-3 text-sm ${mode === 'delivery' ? 'border-accent bg-accent-soft/30' : 'border-rule bg-white'}`}
          >
            <div className="serif text-base">{t.delivery}</div>
            <div className="text-ink-3 text-xs mt-1">{t.deliverySub}</div>
          </button>
        </div>
      </section>

      {mode === 'delivery' && (
        <section className="p-4 border-t border-rule space-y-3">
          <div>
            <label className="text-sm text-ink-2">{t.deliveryArea}</label>
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
            <p className="text-ink-3 text-xs mt-2">{t.areasNote}</p>
          </div>
          <div>
            <label className="text-sm text-ink-2">{t.address}</label>
            <textarea value={address} onChange={(e) => setAddress(e.target.value)} rows={2} className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="text-sm text-ink-2">{t.name}</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </div>
            <div>
              <label className="text-sm text-ink-2">{t.phone}</label>
              <input value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" className="mt-1 w-full rounded-xl border border-rule p-2 text-sm" />
            </div>
          </div>
        </section>
      )}

      <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3">
        <div className="flex justify-between mb-3 text-sm">
          <span className="text-ink-2">{t.total}</span>
          <span className="font-medium">{baht(subtotal())}</span>
        </div>
        {!ready && (
          <p className="text-accent text-xs mb-2">{t.fillToContinue(missing.join(', '))}</p>
        )}
        <button onClick={proceed} disabled={!ready} className="btn-primary w-full disabled:opacity-50">
          {t.continuePayment}
        </button>
      </div>
    </>
  );
}
