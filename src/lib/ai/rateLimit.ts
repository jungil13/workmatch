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
