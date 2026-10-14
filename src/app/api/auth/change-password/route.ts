import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { validatePassword } from '@/lib/passwordValidation';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { currentPassword, newPassword } = body;

    // ── Input validation ─────────────────────────────────────────────────────
    if (!currentPassword || typeof currentPassword !== 'string') {
      return NextResponse.json(
        { error: 'Current password is required.' },
        { status: 400 }
      );
    }

    const validation = validatePassword(newPassword || '');
    if (!validation.isValid) {
      return NextResponse.json(
        { error: `New password does not meet requirements: ${validation.errors.join(', ')}.` },
        { status: 400 }
      );
    }

    // ── Get the currently authenticated user from the session cookie ─────────
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

    const { data: { user }, error: userError } = await supabase.auth.getUser();

    if (userError || !user || !user.email) {
      return NextResponse.json(
        { error: 'You must be signed in to change your password.' },
        { status: 401 }
      );
    }

    // ── Verify current password by re-authenticating server-side ─────────────
    // We use a stateless client (no session persistence) purely to verify credentials.
    // This avoids exposing any service-role key — the anon key is sufficient for signInWithPassword.
    const verifyClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const { error: signInError } = await verifyClient.auth.signInWithPassword({
      email: user.email,
      password: currentPassword,
    });

    if (signInError) {
      // Supabase returns "Invalid login credentials" when password is wrong
      return NextResponse.json(
        { error: 'Incorrect current password. Please try again.' },
        { status: 403 }
      );
    }

    // ── Update the password using the authenticated session ──────────────────
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword,
    });

    if (updateError) {
      return NextResponse.json(
        { error: updateError.message || 'Failed to update password.' },
        { status: 400 }
      );
    }

    return NextResponse.json({ success: true, message: 'Password updated successfully.' });
  } catch (error: any) {
    console.error('Change password API error:', error);
    return NextResponse.json(
      { error: error?.message || 'An unexpected error occurred.' },
      { status: 500 }
    );
  }
}
