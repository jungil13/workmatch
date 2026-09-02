import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/seeker/dashboard';

  if (code) {
    const cookieStore = await cookies();

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet) {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            );
          },
        },
      }
    );

    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.user) {
      // Ensure the user has a profiles row (for first-time Google sign-in)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', data.user.id)
        .maybeSingle();

      if (!existingProfile) {
        // First-time Google login — create profile row
        const meta = data.user.user_metadata;
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email!,
          first_name: meta?.full_name?.split(' ')[0] || meta?.name?.split(' ')[0] || 'User',
          last_name: meta?.full_name?.split(' ').slice(1).join(' ') || meta?.name?.split(' ').slice(1).join(' ') || '',
          avatar_url: meta?.avatar_url || meta?.picture || null,
          role: 'job_seeker',
          status: 'active',
          updated_at: new Date().toISOString(),
        });

        // Create job_seeker_profiles row
        await supabase.from('job_seeker_profiles').upsert({
          user_id: data.user.id,
          availability: 'Immediate',
          preferred_work_arrangement: 'Hybrid',
          profile_visibility: 'Employers Only',
          updated_at: new Date().toISOString(),
        });

        // Create default user_settings
        await supabase.from('user_settings').upsert({
          user_id: data.user.id,
          email_notifications: true,
          show_skills: true,
          show_education: true,
          show_experience: true,
          show_location: true,
          allow_employer_contact: true,
          preferred_search_radius: 25,
        });
      }

      // Redirect to correct portal based on role
      const role = existingProfile?.role || 'job_seeker';
      if (role === 'admin') return NextResponse.redirect(`${origin}/admin`);
      if (role === 'employer') return NextResponse.redirect(`${origin}/employer/dashboard`);
      return NextResponse.redirect(`${origin}/seeker/dashboard`);
    }
  }

  // OAuth error — redirect back to sign in
  return NextResponse.redirect(`${origin}/auth/seeker/sign-in?error=oauth_error`);
}
