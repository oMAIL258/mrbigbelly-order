import 'server-only';
import type { SupabaseClient } from '@supabase/supabase-js';
import { alertStaff } from '@/lib/line-server';
import { alertDevices } from '@/lib/push-server';

/**
 * Tells the shop that somebody has joined. An account is created the first
 * time a customer opens their points page, gives a number on the sign-up page
 * or places an order, so this is called from all three.
 *
 * The claim on `announced_at` is what makes it happen once: the update only
 * matches a row that has not been announced, so whichever path gets there
 * first is the one that sends, however many tabs or taps raced. Rows that
 * existed before this column was added were stamped by the migration, so a
 * long-standing member is never announced as new.
 */
export async function announceNewMember(sb: SupabaseClient, customerId: string): Promise<void> {
  try {
    const { data } = await sb
      .from('customers')
      .update({ announced_at: new Date().toISOString() })
      .eq('id', customerId)
      .is('announced_at', null)
      .select('display_name, phone')
      .maybeSingle();
    if (!data) return;

    const row = data as { display_name: string | null; phone: string | null };
    const name = row.display_name?.trim() || null;
    const when = new Date().toLocaleString('en-GB', {
      timeZone: 'Asia/Bangkok', day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit',
    });

    const { data: staff } = await sb.from('staff_alerts').select('line_user_id');
    await alertStaff(
      '🎉 สมาชิกใหม่ / NEW MEMBER\n'
      + (name ? `👤 ${name}\n` : '')
      + (row.phone ? `📞 ${row.phone}\n` : '')
      + `🕒 ${when}\n\n`
      + 'ดูได้ที่หน้าสมาชิกในระบบหลังร้าน\nOpen the Members tab to see them.',
      ((staff ?? []) as { line_user_id: string }[]).map((r) => r.line_user_id),
    );

    await alertDevices(
      'สมาชิกใหม่ / New member',
      [name, row.phone].filter(Boolean).join(' · ') || when,
      '/members',
    );
  } catch { /* never load-bearing */ }
}
