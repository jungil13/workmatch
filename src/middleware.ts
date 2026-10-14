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
  if (pathname.startsWith('/auth') && user && !pathname.includes('forgot') && !pathname.includes('reset') && !pathname.includes('callback')) {
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
