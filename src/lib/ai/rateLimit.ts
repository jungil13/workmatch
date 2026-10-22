import { createHmac } from 'node:crypto';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

const WINDOW_MINUTES = 10;
const MAX_REQUESTS = 30;

export async function assertAiRateLimit(userId: string, endpoint: string) {
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count } = await admin
    .from('ai_request_log')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('endpoint', endpoint)
    .gte('created_at', since);

  if ((count ?? 0) >= MAX_REQUESTS) {
    throw new Error('Too many AI requests. Please wait a few minutes and try again.');
  }

  await admin.from('ai_request_log').insert({
    user_id: userId,
    endpoint,
    created_at: new Date().toISOString(),
  });
}

export async function assertGuestAiRateLimit(request: Request, endpoint: string) {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!serviceRoleKey) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }

  const clientIp =
    request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
    request.headers.get('x-real-ip')?.trim() ||
    'unknown';
  const guestEndpoint = `${endpoint}:guest:${createHmac('sha256', serviceRoleKey).update(clientIp).digest('hex')}`;
  const admin = createSupabaseAdminClient();
  const since = new Date(Date.now() - WINDOW_MINUTES * 60 * 1000).toISOString();

  const { count, error: countError } = await admin
    .from('ai_request_log')
    .select('id', { count: 'exact', head: true })
    .is('user_id', null)
    .eq('endpoint', guestEndpoint)
    .gte('created_at', since);

  if (countError) throw countError;
  if ((count ?? 0) >= MAX_REQUESTS) {
    throw new Error('Too many AI requests. Please wait a few minutes and try again.');
  }

  const { error: insertError } = await admin.from('ai_request_log').insert({
    user_id: null,
    endpoint: guestEndpoint,
    created_at: new Date().toISOString(),
  });
  if (insertError) throw insertError;
}
