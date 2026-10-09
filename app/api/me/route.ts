import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { lineUserFromToken } from '@/lib/line-verify';

export const dynamic = 'force-dynamic';

/** Everything the profile page shows, for the customer LINE says is calling. */
export async function POST(req: NextRequest) {
  const { token } = (await req.json()) as { token?: string };
  const who = await lineUserFromToken(token);
  if (!who) return NextResponse.json({ error: 'unverified' }, { status: 401 });

  const sb = supabaseServer();

  // Seen before ordering: opening the profile is enough to become a member.
  const { data: customer } = await sb
    .from('customers')
    .upsert({ line_user_id: who.userId, display_name: who.displayName }, { onConflict: 'line_user_id' })
    .select('id, display_name, points_balance, created_at')
    .single();
  if (!customer) return NextResponse.json({ error: 'no profile' }, { status: 500 });

  const [events, orders, claims, settings] = await Promise.all([
    sb.from('point_events')
      .select('id, delta, kind, note, order_id, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(50),
    sb.from('orders')
      .select('id, short_code, status, total_satang, fulfilment_mode, created_at, order_items(name_snapshot, qty)')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(25),
    sb.from('redemptions')
      .select('id, code, status, points_cost, reward_title_th, reward_title_en, reject_reason, created_at')
      .eq('customer_id', customer.id)
      .order('created_at', { ascending: false })
      .limit(25),
    sb.from('loyalty_settings').select('satang_per_point, points_enabled').limit(1).maybeSingle(),
  ]);

  return NextResponse.json({
    profile: {
      id: customer.id,
      name: who.displayName ?? customer.display_name,
      picture: who.pictureUrl,
      points: customer.points_balance ?? 0,
      since: customer.created_at,
    },
    events: events.data ?? [],
    orders: orders.data ?? [],
    claims: claims.data ?? [],
    satangPerPoint: settings.data?.satang_per_point ?? 10000,
    pointsEnabled: settings.data?.points_enabled ?? true,
  });
}
