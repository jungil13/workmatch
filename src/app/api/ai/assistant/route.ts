import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/requireUser';
import { CODING_REQUEST_PATTERN, generateGeminiText, WORKMATCH_SYSTEM_INSTRUCTION } from '@/lib/ai/gemini';
import { assertAiRateLimit } from '@/lib/ai/rateLimit';
import { isCompanyVerified } from '@/lib/applicationStatus';

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => null);
  const message = String(body?.message || '').trim().slice(0, 2000);
  const jobId = body?.jobId as string | undefined;

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
    await assertAiRateLimit(ctx.user!.id, 'assistant');
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  let jobContext = 'No specific job is selected.';
  if (jobId) {
    const { data: job } = await ctx.supabase
      .from('jobs')
      .select('id, title, description, qualifications, city, status, company:companies(*)')
      .eq('id', jobId)
      .maybeSingle();

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

  const userPrompt = `User role: ${ctx.profile?.role || 'unknown'}
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
      timeoutMs: 15_000,
    });
    return NextResponse.json({ reply });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Assistant is unavailable.' }, { status: 500 });
  }
}
