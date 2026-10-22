import { NextRequest, NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase/server';
import { CODING_REQUEST_PATTERN, generateGeminiText, WORKMATCH_SYSTEM_INSTRUCTION } from '@/lib/ai/gemini';
import { assertAiRateLimit, assertGuestAiRateLimit } from '@/lib/ai/rateLimit';
import { isCompanyVerified } from '@/lib/applicationStatus';

export const maxDuration = 60;

export async function POST(request: NextRequest) {
  const supabase = await createSupabaseServerClient();
  const { data: { user } } = await supabase.auth.getUser();
  let userRole = 'visitor';

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .maybeSingle();
    userRole = profile?.role || 'user';
  }

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim().slice(0, 2000);
  const jobId = typeof body?.jobId === 'string' ? body.jobId.slice(0, 64) : undefined;

  if (!message) {
    return NextResponse.json({ error: 'Enter a question.' }, { status: 400 });
  }

  if (CODING_REQUEST_PATTERN.test(message)) {
    return NextResponse.json({
      reply:
        "I'm the WorkMatch AI Assistant. I can help you explore job opportunities, understand your matches, check job posting warning signs, and practice interviews. I can't help write code or modify software.",
    });
  }

  try {
    if (user) {
      await assertAiRateLimit(user.id, 'assistant');
    } else {
      await assertGuestAiRateLimit(request, 'assistant');
    }
  } catch (err: any) {
    const rateLimited = err instanceof Error && err.message.startsWith('Too many AI requests.');
    if (!rateLimited) {
      console.error('Could not apply AI assistant rate limit:', err);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'The assistant is temporarily unavailable.' },
      { status: rateLimited ? 429 : 500 }
    );
  }

  let jobContext = 'No specific job is selected.';
  if (jobId) {
    const { data: job, error: jobError } = await supabase
      .from('jobs')
      .select('id, title, description, qualifications, city, status, company:companies(name, verification_status, verified, website)')
      .eq('id', jobId)
      .eq('status', 'published')
      .maybeSingle();

    if (jobError) {
      console.error('Could not load selected job for AI assistant:', jobError);
      return NextResponse.json({ error: 'Could not load details for this job.' }, { status: 500 });
    }
    if (!job) {
      return NextResponse.json({ error: 'This published job is not available.' }, { status: 404 });
    }

    if (job) {
      const company = (job as any).company || {};
      jobContext = JSON.stringify({
        title: job.title,
        city: job.city,
        status: job.status,
        companyName: company.name,
        companyVerified: isCompanyVerified(company),
        verificationStatus: company.verification_status || (company.verified ? 'approved' : 'unverified'),
        website: company.website || null,
        descriptionExcerpt: String(job.description || '').slice(0, 800),
        qualificationsExcerpt: String(job.qualifications || '').slice(0, 500),
      });
    }
  }

  const userPrompt = `User role: ${userRole}
Selected job/company facts the user is allowed to see: ${jobContext}

User question:
${message}

Rules recap:
- Do not invent verification, application, or hiring facts.
- A business permit upload is not automatic verification.
- For suspicious-job questions, list warning signs and limitations.
- Offer to use WorkMatch's report-a-job feature when relevant.`;

  try {
    const reply = await generateGeminiText({
      systemInstruction: WORKMATCH_SYSTEM_INSTRUCTION,
      userPrompt,
      temperature: 0.35,
      maxOutputTokens: 400,
      timeoutMs: 45_000,
    });
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Assistant is unavailable.' }, { status: 500 });
  }
}
