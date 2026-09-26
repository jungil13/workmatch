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

  // Protect seeker routes
  if (pathname.startsWith('/seeker')) {
    if (!user) {
      return NextResponse.redirect(new URL('/auth/sign-in', request.url));
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

  // If signed-in user visits auth pages, redirect to their role portal
  if (pathname.startsWith('/auth') && user && !pathname.includes('forgot') && !pathname.includes('reset') && !pathname.includes('callback')) {
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
    '/seeker/:path*',
    '/employer/:path*',
    '/admin/:path*',
    '/auth/:path*',
  ],
};
