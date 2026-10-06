'use client';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useCart } from '@/lib/cart';
import { useLang } from '@/lib/i18n';

type Live = { id: string; short_code: string | null; status: string; fulfilment_mode: 'pickup' | 'delivery' };

// The customer may close LINE at any point, so the menu offers a way straight
// back to a live order. The id is checked against the database first: a stale
// id from a finished order would otherwise sit on the menu forever.
export function OngoingOrder() {
  const { t } = useLang();
  const activeOrderId = useCart((s) => s.activeOrderId);
  const setActiveOrderId = useCart((s) => s.setActiveOrderId);
  const [order, setOrder] = useState<Live | null>(null);

  useEffect(() => {
    if (!activeOrderId) { setOrder(null); return; }
    let cancelled = false;
    (async () => {
      const { data } = await supabase()
        .from('orders')
        .select('id, short_code, status, fulfilment_mode')
        .eq('id', activeOrderId)
        .maybeSingle();
      if (cancelled) return;
      if (!data) { setActiveOrderId(null); return; }
      const live = data as Live;
      if (live.status === 'done' || live.status === 'rejected') { setActiveOrderId(null); return; }
      setOrder(live);
    })();
    return () => { cancelled = true; };
  }, [activeOrderId, setActiveOrderId]);

  if (!order) return null;

  const tail = order.status === 'ready'
    ? (order.fulfilment_mode === 'pickup' ? t.ongoingReadyPickup : t.ongoingReadyDelivery)
    : order.status === 'new' ? t.ongoingNew
    : order.status === 'confirmed' ? t.ongoingConfirmed
    : t.ongoingOther;

  return (
    <Link
      href={`/order/${order.id}`}
      className="mx-4 mb-2 flex items-center gap-3 rounded-xl border border-accent bg-accent-soft/25 p-3 step-rise"
    >
      <span className="h-2.5 w-2.5 rounded-full bg-accent step-active shrink-0" />
      <span className="flex-1">
        <span className="block text-sm font-medium">
          {t.ongoingTitle}{order.short_code ? ` · ${order.short_code}` : ''}
        </span>
        <span className="block text-ink-2 text-xs mt-0.5">{tail}</span>
      </span>
      <span className="text-accent text-sm">{t.view} →</span>
    </Link>
  );
}
