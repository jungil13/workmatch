import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { createSupabaseAdminClient } from '@/lib/supabase/admin';

export async function requireUser() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  if (error || !user) {
    return { user: null, supabase, profile: null, response: NextResponse.json({ error: 'Sign in required.' }, { status: 401 }) };
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, role, email, first_name, last_name, status')
    .eq('id', user.id)
    .maybeSingle();

  return { user, supabase, profile, response: null as NextResponse | null };
}

export async function requireRole(roles: Array<'admin' | 'employer' | 'job_seeker'>) {
  const ctx = await requireUser();
  if (ctx.response) return ctx;
  if (!ctx.profile || !roles.includes(ctx.profile.role)) {
    return {
      ...ctx,
      response: NextResponse.json({ error: 'You are not authorized to perform this action.' }, { status: 403 }),
    };
  }
  return ctx;
}

export function getAdminClient() {
  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured on the server.');
  }
  return createSupabaseAdminClient();
}
