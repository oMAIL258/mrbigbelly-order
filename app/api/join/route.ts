import { NextRequest, NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabase-server';
import { lineUserFromToken } from '@/lib/line-verify';
import { pushLine } from '@/lib/line-server';
import { normalisePhone, looksLikeThaiPhone } from '@/lib/phone';

export const dynamic = 'force-dynamic';

/**
 * Joining the membership from the shop's LINE menu, which is how a customer
 * who ate at a table gets an account. The only thing asked of them is a phone
 * number, because that is what lets the counter find them next time without
 * either side having to open anything.
 */
export async function POST(req: NextRequest) {
  const { token, phone } = (await req.json()) as { token?: string; phone?: string };

  // LINE says who this is. A browser-supplied identity would let anyone put
  // their own phone number on somebody else's points.
  const who = await lineUserFromToken(token);
  if (!who) return NextResponse.json({ error: 'unverified' }, { status: 401 });

  if (!looksLikeThaiPhone(phone)) return NextResponse.json({ error: 'phone' }, { status: 400 });
  const tidy = normalisePhone(phone);

  const sb = supabaseServer();
  const { data: customer, error: upErr } = await sb
    .from('customers')
    .upsert({ line_user_id: who.userId, display_name: who.displayName }, { onConflict: 'line_user_id' })
    .select('id, phone, points_balance')
    .single();
  if (upErr || !customer) return NextResponse.json({ error: 'no profile' }, { status: 500 });

  const isNew = !customer.phone;

  const { error } = await sb.from('customers').update({ phone: tidy }).eq('id', customer.id);
  if (error) {
    // Someone else already registered this number. Two accounts sharing one
    // would leave the counter unable to tell which person it is serving, so
    // the shop sorts it out face to face rather than the site guessing.
    const taken = error.code === '23505' || /customers_phone_unique/.test(error.message);
    return NextResponse.json({ error: taken ? 'taken' : error.message }, { status: taken ? 409 : 500 });
  }

  // Only on the way in. Changing a number later is not worth a message.
  if (isNew) {
    await pushLine(
      who.userId,
      '🎉 ยินดีต้อนรับสู่สมาชิก Mr. Big Belly\n'
      + `เบอร์ที่ลงทะเบียน ${tidy}\n`
      + 'ทานที่ร้านหรือสั่งผ่านเว็บก็ได้แต้มเหมือนกัน แจ้งเบอร์นี้กับพนักงานตอนจ่ายเงินที่ร้าน\n\n'
      + 'Welcome to Mr. Big Belly rewards. Give this number at the counter when you eat in, '
      + 'and you earn points whether you eat in or order online.',
    );
  }

  return NextResponse.json({ ok: true, phone: tidy, joined: isNew });
}
