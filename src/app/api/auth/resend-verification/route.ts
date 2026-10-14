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

    const forwardedHost = request.headers.get('x-forwarded-host');
    const forwardedProto = request.headers.get('x-forwarded-proto') || 'https';
    const isLocal = process.env.NODE_ENV === 'development';
    const origin = request.nextUrl.origin;
    const baseUrl = !isLocal && forwardedHost ? `${forwardedProto}://${forwardedHost}` : origin;
    const emailRedirectTo = `${baseUrl}/auth/callback?type=signup`;

    // Stateless client — no session persistence, only used to send the OTP
    const serverClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error } = await serverClient.auth.resend({
      type: 'signup',
      email: email.trim(),
      options: { emailRedirectTo },
    });

    if (error) {
      console.error('Resend verification error:', error.message);
      const isRateLimit =
        (error as any).status === 429 ||
        error.message?.toLowerCase().includes('rate') ||
        error.message?.toLowerCase().includes('limit') ||
        error.message?.toLowerCase().includes('security purposes');

      if (isRateLimit) {
        return NextResponse.json(
          { error: error.message || 'Email sending rate limit reached. Supabase default email limits sending to 3 emails per hour. Please wait a bit or configure custom SMTP.' },
          { status: 429 }
        );
      }

      // Don't expose whether an arbitrary email exists
      return NextResponse.json({
        success: true,
        message: 'If this email is registered, a verification link has been sent.',
      });
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
    });
  } catch (error: any) {
    console.error('Resend verification API error:', error);
    return NextResponse.json(
      { error: error?.message || 'Failed to resend verification email.' },
      { status: 500 }
    );
  }
}
