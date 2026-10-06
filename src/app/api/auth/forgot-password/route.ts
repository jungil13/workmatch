import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email } = body;

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json(
        { error: 'Please enter a valid email address.' },
        { status: 400 }
      );
    }

    // Determine accurate base URL for redirection
    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const isLocal = process.env.NODE_ENV === 'development';
    const origin = request.nextUrl.origin;
    const baseUrl = !isLocal && forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
    const redirectTo = `${baseUrl}/auth/callback?next=/auth/reset-password`;

    // Use a proper server-side Supabase client (NOT the browser singleton)
    const serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    // This sends the reset email AND creates the OTP token.
    // Do NOT call generateLink after this — it would invalidate the emailed token.
    const { error: resetError } = await serverClient.auth.resetPasswordForEmail(
      email.trim(),
      { redirectTo }
    );

    if (resetError) {
      console.error('Supabase resetPasswordForEmail error:', resetError.message);
      return NextResponse.json(
        { error: 'Could not send reset email. Please check the address and try again.' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      email: email.trim(),
      message: 'Password reset email dispatched. Check your inbox.',
    });
  } catch (error: any) {
    console.error('Forgot password API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to process password reset request.' },
      { status: 500 }
    );
  }
}

