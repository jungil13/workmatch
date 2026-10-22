import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  const type = searchParams.get('type') as 'recovery' | 'signup' | 'email' | null;
  const next = searchParams.get('next') ?? '/seeker/dashboard';

  const errorParam = searchParams.get('error');
  const errorCode = searchParams.get('error_code');
  const errorDesc = searchParams.get('error_description');

  // Support Vercel reverse proxy headers for accurate production origin
  const forwardedHost = request.headers.get('x-forwarded-host');
  const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
  const isLocalEnv = process.env.NODE_ENV === 'development';
  const baseUrl = !isLocalEnv && forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;

  const cookieStore = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        },
      },
    }
  );

  // ── 1. Check for explicit errors from Supabase Auth ─────────────────────────────
  if (errorParam || errorCode || errorDesc) {
    if (errorCode === 'otp_expired' || errorParam === 'link_expired') {
      return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=link_expired&error_code=otp_expired`);
    }
    // If it's a signup error but the user was already verified, don't show generic oauth_error
    if (type === 'signup' || type === 'email') {
      return NextResponse.redirect(`${baseUrl}/auth/sign-in?verified=1`);
    }
    const cleanError = errorDesc
      ? encodeURIComponent(errorDesc)
      : encodeURIComponent(errorParam || errorCode || 'auth_error');
    return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=${cleanError}`);
  }

  // ── 2. Handle EMAIL VERIFICATION / SIGNUP FLOW ─────────────────────────────────
  // If this was an email verification link (type=signup or type=email or verified=1)
  const isEmailVerification =
    type === 'signup' ||
    type === 'email' ||
    searchParams.get('verified') === '1' ||
    next?.includes('verified=1');

  if (isEmailVerification) {
    if (token_hash) {
      const otpType = type || 'signup';
      const { error: otpErr } = await supabase.auth.verifyOtp({ token_hash, type: otpType });
      if (otpErr) {
        // Retry with 'email' type if 'signup' failed
        await supabase.auth.verifyOtp({ token_hash, type: 'email' });
      }
    } else if (code) {
      // Exchange code if provided (ignoring PKCE verifier mismatch since email was already verified on Supabase backend)
      try {
        await supabase.auth.exchangeCodeForSession(code);
      } catch (_) {}
    }

    // Always sign out any session to ensure clean login state & avoid middleware auto-redirects
    try {
      await supabase.auth.signOut();
    } catch (_) {}

    return NextResponse.redirect(`${baseUrl}/auth/sign-in?verified=1`);
  }

  // ── 3. Handle token_hash for password recovery ─────────────────────────────────
  if (token_hash && type === 'recovery') {
    const { error } = await supabase.auth.verifyOtp({ token_hash, type: 'recovery' });
    if (!error) {
      return NextResponse.redirect(`${baseUrl}/auth/reset-password`);
    }
    console.error('verifyOtp recovery error:', error.message);
    return NextResponse.redirect(`${baseUrl}/auth/sign-in?error=link_expired&error_code=otp_expired`);
  }

  // ── 4. Handle PKCE code flow (Google OAuth / Password Recovery) ─────────────────
  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error('exchangeCodeForSession error:', error.message);
      return NextResponse.redirect(
        `${baseUrl}/auth/sign-in?error=${encodeURIComponent(error.message || 'Authentication error')}`
      );
    }

    if (data?.user) {
      // --- PASSWORD RECOVERY: redirect straight to reset-password ---
      if (
        data.session?.user?.aud === 'authenticated' &&
        (data.session as any)?.amr?.some?.((a: any) => a.method === 'recovery')
      ) {
        return NextResponse.redirect(`${baseUrl}/auth/reset-password`);
      }

      // Explicit ?next= override
      if (next && next !== '/seeker/dashboard') {
        return NextResponse.redirect(`${baseUrl}${next}`);
      }

      // Ensure profile row exists (e.g. for first-time Google sign-in)
      const { data: existingProfile } = await supabase
        .from('profiles')
        .select('id, role')
        .eq('id', data.user.id)
        .maybeSingle();

      const meta = data.user.user_metadata;
      const googleAvatar = meta?.avatar_url || meta?.picture || null;
      const firstName = meta?.first_name || meta?.full_name?.split(' ')[0] || meta?.name?.split(' ')[0] || 'User';
      const lastName = meta?.last_name || meta?.full_name?.split(' ').slice(1).join(' ') || meta?.name?.split(' ').slice(1).join(' ') || '';

      if (!existingProfile) {
        await supabase.from('profiles').upsert({
          id: data.user.id,
          email: data.user.email!,
          first_name: firstName,
          last_name: lastName,
          avatar_url: googleAvatar,
          role: 'job_seeker',
          status: 'active',
          updated_at: new Date().toISOString(),
        });

        await supabase.from('job_seeker_profiles').upsert({
          user_id: data.user.id,
          availability: 'Immediate',
          preferred_work_arrangement: 'Hybrid',
          profile_visibility: 'Employers Only',
          updated_at: new Date().toISOString(),
        });

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
      } else if (googleAvatar) {
        await supabase
          .from('profiles')
          .update({
            avatar_url: googleAvatar,
            updated_at: new Date().toISOString(),
          })
          .eq('id', data.user.id);
      }

      const role = existingProfile?.role || 'job_seeker';
      if (role === 'admin') return NextResponse.redirect(`${baseUrl}/admin`);
      if (role === 'employer') return NextResponse.redirect(`${baseUrl}/employer/dashboard`);
      return NextResponse.redirect(`${baseUrl}/seeker/dashboard`);
    }
  }

  // ── 5. Client-Side Hash Fallback ───────────────────────────────────────────────
  // If no server query params were provided, the browser may have a hash fragment
  // (#access_token=...&type=signup or #type=recovery). Return a client-side redirector.
  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Verifying...</title>
  <script>
    (function() {
      try {
        var hash = window.location.hash || '';
        var search = window.location.search || '';
        if (
          hash.indexOf('type=signup') !== -1 ||
          hash.indexOf('type=email_confirmation') !== -1 ||
          search.indexOf('type=signup') !== -1 ||
          search.indexOf('type=email') !== -1 ||
          search.indexOf('verified=1') !== -1
        ) {
          window.location.replace('${baseUrl}/auth/sign-in?verified=1');
          return;
        }
        if (hash.indexOf('type=recovery') !== -1) {
          window.location.replace('${baseUrl}/auth/reset-password' + hash);
          return;
        }
        if (hash.indexOf('access_token') !== -1) {
          window.location.replace('${baseUrl}/seeker/dashboard');
          return;
        }
      } catch (e) {}
      window.location.replace('${baseUrl}/auth/sign-in');
    })();
  </script>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; display: flex; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #f8fafc; color: #64748b;">
  <p style="font-size: 14px;">Redirecting...</p>
</body>
</html>`;

  return new NextResponse(html, {
    headers: { 'Content-Type': 'text/html' },
  });
}
