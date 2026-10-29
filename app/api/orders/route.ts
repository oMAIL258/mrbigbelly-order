import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import type { Fulfilment } from '@/lib/types';
import { alertStaff } from '@/lib/line-server';
import { alertDevices } from '@/lib/push-server';
import { lineUserFromToken } from '@/lib/line-verify';
import { normalisePhone } from '@/lib/phone';
import { announceNewMember } from '@/lib/new-member';
import { categoryOpen, clock, shopMinutes } from '@/lib/hours';
import { pickupOnly, priceDeal, promoLive, PROMO_GRACE_MINUTES } from '@/lib/promo';
import type { Category, Promotion } from '@/lib/types';

type OptionLabel = { group: string; label: string; price_delta_satang: number };
type LinePayload = {
  item_id: string;
  name: string;
  base_price_satang: number;
  qty: number;
  options: OptionLabel[];
  option_ids: string[];
  line_total_satang: number;
  note: string | null;
};
type Body = {
  line_user_id: string | null;
  display_name: string | null;
  lines: LinePayload[];
  /** Kept for older pages; the server prices the order from its own lines. */
  total_satang: number;
  fulfilment: Fulfilment;
  slip_path: string;
  /** The LIFF access token, when the order was placed inside LINE. */
  token?: string | null;
  /** An approved reward the customer is spending on this order. */
  redemption_id?: string | null;
  /** The deal the payment screen applied, and what it said came off. */
  promotion_id?: string | null;
  promo_discount_satang?: number | null;
};

export async function POST(req: NextRequest) {
  const body = (await req.json()) as Body;
  if (!body.lines?.length) return NextResponse.json({ error: 'empty' }, { status: 400 });

  const sb = supabaseServer();

  const { data: settings } = await sb.from('store_settings').select('accepting_orders, closed_message').limit(1).maybeSingle();
  if (settings && !settings.accepting_orders) {
    return NextResponse.json(
      { error: settings.closed_message?.trim() || 'The shop is not taking orders right now.' },
      { status: 409 },
    );
  }

  // Some of the kitchen starts later than the shop opens. The menu says so and
  // will not add those dishes, but a cart can be kept from the night before.
  const now = shopMinutes();
  const itemIds = [...new Set(body.lines.map((l) => l.item_id))];
  const { data: rows } = await sb.from('menu_items').select('id, category_id').in('id', itemIds);
  const catIds = [...new Set((rows ?? []).map((r) => r.category_id as string))];
  const { data: catRows } = catIds.length
    ? await sb.from('categories').select('*').in('id', catIds)
    : { data: [] };
  const later = ((catRows ?? []) as Category[]).find((c) => !categoryOpen(c, now));
  if (later) {
    const at = clock(later.available_from!);
    return NextResponse.json(
      { error: `${later.name_th ?? later.name_en} สั่งได้ตั้งแต่ ${at} น. / ${later.name_en} can be ordered from ${at}.` },
      { status: 409 },
    );
  }

  // Who the order belongs to. Inside LINE this comes from LINE rather than
  // from the page, because the points it earns are worth money and a browser
  // could name anybody.
  const verified = await lineUserFromToken(body.token);
  const lineId = verified?.userId ?? body.line_user_id;
  const displayName = verified?.displayName ?? body.display_name;

  // Who to call when the food is ready, asked for on a collection as well as
  // on a delivery. A cart saved by an older version of the page may carry a
  // pickup with neither, so neither is assumed to be there.
  const contactName = body.fulfilment.name?.trim() || null;
  const contactPhone = normalisePhone(body.fulfilment.phone) ?? null;

  let customer_id: string | null = null;
  if (lineId) {
    const upserted = await sb
      .from('customers')
      .upsert({ line_user_id: lineId, display_name: displayName }, { onConflict: 'line_user_id' })
      .select('id, phone')
      .single();
    customer_id = upserted.data?.id ?? null;

    // Giving a number at checkout is how a customer who only ever collects
    // becomes findable at the counter. It is filled in, never overwritten: a
    // customer may be ordering for somebody else, and the number already on
    // the account is the one they chose to register. A number another member
    // holds is refused by the database and left alone — the shop sorts that
    // out face to face, and an order must never fail over it.
    if (customer_id && contactPhone && !upserted.data?.phone) {
      await sb.from('customers').update({ phone: contactPhone }).eq('id', customer_id);
    }
  
    // Their first order is also their first sight of the shop, so the counter
    // hears about the member as well as the order.
    if (customer_id) await announceNewMember(sb, customer_id);
  }

  // The order is priced from its own lines, so what the customer is asked to
  // transfer and what is written down cannot drift apart.
  const subtotal = Math.round(body.lines.reduce((n, l) => n + (l.line_total_satang ?? 0), 0));

  // A deal is worked out again here, and only ever for less than or as much as
  // the customer was shown: what they transferred is what the screen said.
  let promoOff = 0;
  let promotion_id: string | null = null;
  const claimed = Math.max(0, Math.round(body.promo_discount_satang ?? 0));
  if (claimed > 0 && body.promotion_id) {
    const { data: promo } = await sb.from('promotions').select('*').eq('id', body.promotion_id).maybeSingle();
    const forThis = promo && !(body.fulfilment.mode === 'delivery' && pickupOnly(promo as Promotion));
    if (forThis && promoLive(promo as Promotion, now, PROMO_GRACE_MINUTES)) {
      promoOff = Math.min(claimed, priceDeal(promo as Promotion, body.lines).off, subtotal);
      if (promoOff > 0) promotion_id = (promo as Promotion).id;
    }
  }
  const afterDeal = subtotal - promoOff;

  let discount = 0;
  let redemption_id: string | null = null;
  if (body.redemption_id) {
    // Spending a voucher is spending money, so this needs LINE's word on who
    // is asking, not the page's.
    if (!verified || !customer_id) {
      return NextResponse.json({ error: 'unverified' }, { status: 401 });
    }
    const { data: voucher } = await sb
      .from('redemptions')
      .select('id, status, discount_satang, customer_id')
      .eq('id', body.redemption_id)
      .maybeSingle();
    if (!voucher || voucher.customer_id !== customer_id || !voucher.discount_satang) {
      return NextResponse.json({ error: 'no such discount' }, { status: 404 });
    }
    if (voucher.status !== 'approved') {
      return NextResponse.json({ error: 'discount used' }, { status: 409 });
    }
    // A voucher worth more than the order covers the whole bill, and whatever
    // is left over is not kept. The customer is asked to confirm that on the
    // payment screen before it gets here; what is written down is the part
    // that was actually used, so the three columns always add up.
    discount = Math.min(voucher.discount_satang, afterDeal);
    redemption_id = voucher.id;
  }

  // Nothing to transfer, so there is no slip to wait for.
  const nothingToPay = afterDeal - discount === 0;

  const insOrder = await sb.from('orders').insert({
    customer_id,
    status: 'new',
    subtotal_satang: subtotal,
    discount_satang: discount,
    total_satang: afterDeal - discount,
    redemption_id,
    // Written only when a deal applied, so an order still goes through on a
    // database that has not had sql/11 run.
    ...(promoOff > 0 ? { promo_discount_satang: promoOff, promotion_id } : {}),
    fulfilment_mode: body.fulfilment.mode,
    area_slug: body.fulfilment.mode === 'delivery' ? body.fulfilment.area_slug : null,
    contact_name: contactName,
    contact_phone: contactPhone,
  }).select('id').single();
  if (insOrder.error) {
    // A unique index means one voucher reaches one order, whatever two taps on
    // a slow connection try at once. The customer is told to try again without
    // it rather than being charged the discounted amount for nothing.
    const clash = redemption_id && /orders_redemption_once/.test(insOrder.error.message);
    return NextResponse.json(
      { error: clash ? 'discount used' : insOrder.error.message },
      { status: clash ? 409 : 500 },
    );
  }
  const order_id = insOrder.data.id as string;

  if (redemption_id) {
    await sb.from('redemptions')
      .update({ status: 'used', used_at: new Date().toISOString() })
      .eq('id', redemption_id)
      .eq('status', 'approved');
  }

  if (body.fulfilment.mode === 'delivery') {
    await sb.from('delivery_details').insert({
      order_id,
      area_slug: body.fulfilment.area_slug,
      address: body.fulfilment.address,
      contact_name: contactName,
      contact_phone: contactPhone,
    });
  }

  for (const l of body.lines) {
    const insLine = await sb.from('order_items').insert({
      order_id, menu_item_id: l.item_id, name_snapshot: l.name,
      base_price_satang: l.base_price_satang, qty: l.qty,
      line_total_satang: l.line_total_satang, note: l.note,
    }).select('id').single();
    if (insLine.error) continue;
    const oi_id = insLine.data.id as string;
    if (l.options.length) {
      await sb.from('order_item_options').insert(
        l.options.map((o, i) => ({
          order_item_id: oi_id,
          option_id: l.option_ids[i] ?? null,
          group_name: o.group, label: o.label,
          price_delta_satang: o.price_delta_satang,
        })),
      );
    }
  }

  if (body.slip_path) {
    await sb.from('payment_slips').insert({ order_id, storage_path: body.slip_path });
  }

  const { data: order } = await sb.from('orders').select('short_code').eq('id', order_id).maybeSingle();
  const { data: staff } = await sb.from('staff_alerts').select('line_user_id');
  const items = body.lines.map((l) => `• ${l.qty}× ${l.name}`).join('\n');
  const pickup = body.fulfilment.mode === 'pickup';
  const paid = afterDeal - discount;
  const off = promoOff + discount;
  const total = nothingToPay
    ? `฿0 · จ่ายด้วยแต้มทั้งหมด ไม่มีสลิป / paid with points, no slip`
    : off > 0
      ? `฿${(paid / 100).toLocaleString('en-US')} (ลด ฿${(off / 100).toLocaleString('en-US')})`
      : `฿${(paid / 100).toLocaleString('en-US')}`;

  // The shop wants to know who it is before opening the board. The name typed
  // at checkout is the one that matters, at the door or at the counter; their
  // LINE name rides along when it is a different one. An order with no name at
  // all leaves the line out rather than printing it empty.
  const lineName = displayName?.trim() || null;
  const customerName = contactName && lineName && contactName !== lineName
    ? `${contactName} (LINE: ${lineName})`
    : contactName ?? lineName;

  // The counter's own terminal, through Android, so the alert arrives even
  // when the board is behind the till app.
  await alertDevices(
    `ออเดอร์ใหม่ / New order ${order?.short_code ?? ''}`.trim(),
    [customerName, pickup ? 'รับที่ร้าน / Pickup' : 'จัดส่ง / Delivery', total]
      .filter(Boolean).join(' · '),
  );

  await alertStaff(
    `🔔 ออเดอร์ใหม่ / NEW ORDER ${order?.short_code ?? ''}\n`
    + (customerName ? `👤 ${customerName}\n` : '')
    + (contactPhone ? `📞 ${contactPhone}\n` : '')
    + `${pickup ? 'รับที่ร้าน / Pickup' : 'จัดส่ง / Delivery'} · ${total}\n\n`
    + `${items}\n\n`
    + 'เปิดหน้าออเดอร์เพื่อรับออเดอร์\nOpen the order board to accept it.',
    ((staff ?? []) as { line_user_id: string }[]).map((r) => r.line_user_id),
  );

  return NextResponse.json({ order_id });
}
