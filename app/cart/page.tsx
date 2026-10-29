'use client';
import Link from 'next/link';
import { useCart } from '@/lib/cart';
import { baht } from '@/lib/money';
import { Header } from '@/components/Header';
import { useLang } from '@/lib/i18n';
import { lineName, optionLabel } from '@/lib/names';
import { clock } from '@/lib/hours';
import { useCartPricing } from '@/lib/use-hours';

export default function CartPage() {
  const { lines, setQty, remove, subtotal } = useCart();
  const { t, lang } = useLang();
  const { deal, promoOff, notYet } = useCartPricing(lines);
  return (
    <>
      <Header title={t.yourCart} back="/" />
      {lines.length === 0 ? (
        <div className="p-10 text-center text-ink-3">
          <p>{t.cartEmpty}</p>
          <Link href="/" className="btn-outline mt-4 inline-block">{t.browseMenu}</Link>
        </div>
      ) : (
        <>
          <ul className="px-4 py-3 space-y-3">
            {lines.map((l) => (
              <li key={l.key} className="card p-3">
                <div className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="serif text-base">{lineName(lang, l)}</div>
                    {l.option_labels.length > 0 && (
                      <ul className="text-ink-3 text-xs mt-1 space-y-0.5">
                        {l.option_labels.map((o, i) => <li key={i}>· {optionLabel(lang, o.label)}</li>)}
                      </ul>
                    )}
                    {l.note && <div className="text-ink-3 text-xs mt-1 italic">“{l.note}”</div>}
                    {notYet.has(l.key) && (
                      <div className="text-accent text-xs mt-1">🕘 {t.notYetLine(clock(notYet.get(l.key)!))}</div>
                    )}
                  </div>
                  <div className="text-right whitespace-nowrap">
                    <div className="font-medium">{baht(l.line_total_satang)}</div>
                    <button onClick={() => remove(l.key)} className="text-ink-3 text-xs mt-2 underline">{t.remove}</button>
                  </div>
                </div>
                <div className="mt-3 flex items-center rounded-full border border-rule bg-white w-fit">
                  <button onClick={() => setQty(l.key, l.qty - 1)} className="px-3 py-1.5">−</button>
                  <span className="w-6 text-center text-sm">{l.qty}</span>
                  <button onClick={() => setQty(l.key, l.qty + 1)} className="px-3 py-1.5">+</button>
                </div>
              </li>
            ))}
          </ul>
          <div className="sticky bottom-0 bg-bg/95 backdrop-blur border-t border-rule px-4 py-3">
            <div className={`flex justify-between text-sm ${deal ? 'mb-1' : 'mb-3'}`}>
              <span className="text-ink-2">{t.subtotal}</span>
              <span className={promoOff > 0 ? 'text-ink-2' : 'font-medium'}>{baht(subtotal())}</span>
            </div>
            {promoOff > 0 && (
              <>
                <div className="flex justify-between text-sm text-veg">
                  <span>{lang === 'th' ? deal!.promo.title_th : deal!.promo.title_en}</span>
                  <span>−{baht(promoOff)}</span>
                </div>
                <div className="flex justify-between mt-1 text-sm font-medium">
                  <span>{t.total}</span>
                  <span>{baht(subtotal() - promoOff)}</span>
                </div>
              </>
            )}
            {deal && deal.short > 0 && deal.eligible > 0 && (
              <p className="text-veg text-xs mt-1">☕ {t.dealAddMore(deal.short)}</p>
            )}
            <div className="mb-3" />
            {notYet.size > 0 ? (
              <>
                <p className="text-accent text-xs mb-2">{t.notYetBlock}</p>
                <button disabled className="btn-primary w-full opacity-50">{t.checkout}</button>
              </>
            ) : (
              <Link href="/checkout" className="btn-primary w-full">{t.checkout}</Link>
            )}
          </div>
        </>
      )}
    </>
  );
}
