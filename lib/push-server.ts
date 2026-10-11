import 'server-only';
import webpush from 'web-push';
import { supabaseServer } from '@/lib/supabase-server';

type Row = { endpoint: string; p256dh: string; auth: string };

function configured(): boolean {
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const priv = process.env.VAPID_PRIVATE_KEY;
  if (!pub || !priv) return false;
  webpush.setVapidDetails(process.env.VAPID_SUBJECT || 'mailto:shop@mrbigbelly.local', pub, priv);
  return true;
}

/**
 * Rings the shop's own devices, whatever they are showing at the time. The
 * board can only chime while it is the page in front; this reaches the
 * terminal through Android itself, so an order lands while the counter is in
 * the till app.
 *
 * Best-effort on the same terms as the LINE alert: a customer's order must
 * never fail because the shop's own alert could not go out. A subscription
 * the push service has retired is deleted, since it will never work again.
 */
export async function alertDevices(title: string, body: string, url = '/orders'): Promise<void> {
  if (!configured()) return;
  try {
    const sb = supabaseServer();
    const { data } = await sb.from('push_subscriptions').select('endpoint, p256dh, auth');
    const rows = (data ?? []) as Row[];
    const payload = JSON.stringify({ title, body, url });
    const dead: string[] = [];
    await Promise.all(rows.map(async (r) => {
      try {
        await webpush.sendNotification(
          { endpoint: r.endpoint, keys: { p256dh: r.p256dh, auth: r.auth } },
          payload,
          { TTL: 600, urgency: 'high' },
        );
      } catch (e) {
        const code = (e as { statusCode?: number }).statusCode;
        if (code === 404 || code === 410) dead.push(r.endpoint);
      }
    }));
    if (dead.length) await sb.from('push_subscriptions').delete().in('endpoint', dead);
  } catch { /* never load-bearing */ }
}
