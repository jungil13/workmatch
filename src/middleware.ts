import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  // Refresh session without requiring a user
  const { data: { user } } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Catch Supabase authentication errors that redirect to Site URL (root /)
  const errorParam = request.nextUrl.searchParams.get('error');
  const errorCode = request.nextUrl.searchParams.get('error_code');
  const errorDescription = request.nextUrl.searchParams.get('error_description');
  if (pathname === '/' && (errorParam || errorCode)) {
    const signInUrl = new URL('/auth/sign-in', request.url);
    if (errorParam) signInUrl.searchParams.set('error', errorParam);
    if (errorCode) signInUrl.searchParams.set('error_code', errorCode);
    if (errorDescription) signInUrl.searchParams.set('error_description', errorDescription);
    return NextResponse.redirect(signInUrl);
  }

  // Catch email confirmation code landing on root /
  const authCode = request.nextUrl.searchParams.get('code');
  if (pathname === '/' && authCode) {
    const callbackUrl = new URL('/auth/callback', request.url);
    callbackUrl.searchParams.set('code', authCode);
    callbackUrl.searchParams.set('type', 'signup');
    callbackUrl.searchParams.set('next', '/auth/sign-in?verified=1');
    return NextResponse.redirect(callbackUrl);
  }

  // Catch verified query landing on root /
  const typeParam = request.nextUrl.searchParams.get('type');
  const verifiedParam = request.nextUrl.searchParams.get('verified');
  if (pathname === '/' && (verifiedParam === '1' || typeParam === 'signup')) {
    return NextResponse.redirect(new URL('/auth/sign-in?verified=1', request.url));
  }

  /**
   * Email verification enforcement helper.
   *
   * Google OAuth users are considered verified (email_confirmed_at is always set by Google).
   * Password-based users must have confirmed their email before accessing protected pages.
   *
   * We redirect unverified users to sign-in with a query param so the page can hint
   * them to check their inbox.
   */
  const isEmailVerified = (u: typeof user) => {
    if (!u) return false;
    // OAuth providers (Google) always have email_confirmed_at
    if (u.app_metadata?.provider && u.app_metadata.provider !== 'email') return true;
    return !!u.email_confirmed_at;
  };

  // Protect seeker routes
  if (pathname.startsWith('/seeker')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Enforce email verification
    if (!isEmailVerified(user)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/sign-in?error=email_not_verified', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'employer') {
      return NextResponse.redirect(new URL('/employer/dashboard', request.url));
    }
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
  }

  // Protect employer routes (Strict: Job seekers cannot access employer dashboard or post jobs)
  if (pathname.startsWith('/employer')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Enforce email verification
    if (!isEmailVerified(user)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/sign-in?error=email_not_verified', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'job_seeker' || (!profile?.role && profile?.role !== 'admin' && profile?.role !== 'employer')) {
      return NextResponse.redirect(new URL('/seeker/dashboard', request.url));
    }
  }

  // Protect admin routes
  if (pathname.startsWith('/admin')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
    }

    // Enforce email verification
    if (!isEmailVerified(user)) {
      await supabase.auth.signOut();
      return NextResponse.redirect(new URL('/auth/sign-in?error=email_not_verified', request.url));
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role !== 'admin') {
      if (profile?.role === 'employer') {
        return NextResponse.redirect(new URL('/employer/dashboard', request.url));
      }
      return NextResponse.redirect(new URL('/seeker/dashboard', request.url));
    }
  }

  // If signed-in AND verified user visits auth pages, redirect to their role portal
  // Allow verified=1 banner to show even if user has a session
  const isVerifiedRedirect = pathname === '/auth/sign-in' && request.nextUrl.searchParams.get('verified') === '1';
  if (pathname.startsWith('/auth') && user && !pathname.includes('forgot') && !pathname.includes('reset') && !pathname.includes('callback') && !isVerifiedRedirect) {
    if (!isEmailVerified(user)) {
      // Allow unverified users to stay on the sign-in page so they can resend verification
      return supabaseResponse;
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();

    if (profile?.role === 'employer') {
      return NextResponse.redirect(new URL('/employer/dashboard', request.url));
    }
    if (profile?.role === 'admin') {
      return NextResponse.redirect(new URL('/admin', request.url));
    }
    return NextResponse.redirect(new URL('/seeker/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/',
    '/seeker/:path*',
    '/employer/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
};
