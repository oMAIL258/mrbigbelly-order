import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { lineUserFromToken } from '@/lib/line-verify';

export const dynamic = 'force-dynamic';

/** Everything the profile page shows, for the customer LINE says is calling. */
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };

  const sb = supabaseServer();

  // How points are earned belongs to the shop, not to the customer, so it is
  // asked for while LINE is still being asked who this is rather than after.
  const settingsSoon = sb
    .from('loyalty_settings')
    .select('satang_per_point, points_enabled, points_valid_months')
    .limit(1).maybeSingle();

  const who = await lineUserFromToken(token);
  if (!who) {
    void settingsSoon.then(() => {}, () => {});
    return NextResponse.json({ error: 'unverified' }, { status: 401 });
  }

  // Seen before ordering: opening the profile is enough to become a member.
  // The row comes back whole, so there is no second trip to read what was
  // just written.
  const { data: customer } = await sb
    .from('customers')
    .upsert({ line_user_id: who.userId, display_name: who.displayName }, { onConflict: 'line_user_id' })
    .select('id, display_name, phone, points_balance, created_at')
    .single();
  if (!customer) return NextResponse.json({ error: 'no profile' }, { status: 500 });

  let points = customer.points_balance ?? 0;

  // Points run out on a date rather than on an action, so the balance is
  // settled before it is shown. A customer should never read a number here
  // that the shop's screen disagrees with. Nothing can run out of a balance of
  // nothing, which is every customer's first visit.
  if (points > 0) {
    await sb.rpc('expire_points', { p_customer: customer.id });
    const { data: after } = await sb
      .from('customers').select('points_balance').eq('id', customer.id).maybeSingle();
    points = after?.points_balance ?? points;
  }

  const [events, orders, claims, settings, lots] = await Promise.all([
    sb.from('point_events')
      .select('id, delta, kind, note, order_id, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('orders')
      .select('id, short_code, status, subtotal_satang, discount_satang, total_satang, fulfilment_mode, created_at, order_items(name_snapshot, qty)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(25),
    sb.from('redemptions')
      .select('id, code, status, points_cost, discount_satang, reward_title_th, reward_title_en, reject_reason, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(25),
    settingsSoon,
    // Which points run out next, which only means something if there are any.
    points > 0 ? sb.rpc('point_lots', { p_customer: customer.id }) : Promise.resolve({ data: [] }),
  ]);

  // When the next points run out, and how many. Shown on the profile so the
  // date is never a surprise, and so nobody has to ask the shop.
  type Lot = { remaining: number; expires_at: string | null };
  const soonest = ((lots.data ?? []) as Lot[])
    .filter((l) => l.remaining > 0 && l.expires_at)
    .sort((a, b) => (a.expires_at! < b.expires_at! ? -1 : 1))[0];

  return NextResponse.json({
    profile: {
      id: customer.id,
      name: who.displayName ?? customer.display_name,
      picture: who.pictureUrl,
      points,
      since: customer.created_at,
      phone: customer.phone ?? null,
    },
    events: events.data ?? [],
    orders: orders.data ?? [],
    claims: claims.data ?? [],
    satangPerPoint: settings.data?.satang_per_point ?? 10000,
    pointsEnabled: settings.data?.points_enabled ?? true,
    validMonths: settings.data?.points_valid_months ?? 12,
    expiring: soonest ? { points: soonest.remaining, on: soonest.expires_at } : null,
  });
}
