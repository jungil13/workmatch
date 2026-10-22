import { NextRequest, NextResponse } from 'next/server';
import { requireUser } from '@/lib/supabase/requireUser';
import { calculateJobMatch, hashMatchInputs } from '@/lib/matching/matchingEngine';
import { generateGeminiJson, getGeminiApiKey } from '@/lib/ai/gemini';
import { assertAiRateLimit } from '@/lib/ai/rateLimit';

async function relatedSkillMapFromGemini(
  jobSkillNames: string[],
  candidateSkillNames: string[]
): Promise<Record<string, string[]>> {
  if (!getGeminiApiKey() || jobSkillNames.length === 0 || candidateSkillNames.length === 0) {
    return {};
  }

  try {
    const result = await generateGeminiJson<{ mappings: Array<{ jobSkill: string; relatedCandidateSkills: string[] }> }>({
      temperature: 0,
      userPrompt: `Map related skills. Use ONLY candidate skills from the provided list. Do not invent skills.

Job skills: ${JSON.stringify(jobSkillNames)}
Candidate skills (the only skills you may return): ${JSON.stringify(candidateSkillNames)}

Return JSON: {"mappings":[{"jobSkill":"...","relatedCandidateSkills":["..."]}]}
If a job skill has no related candidate skill, use an empty array.`,
    });

    const map: Record<string, string[]> = {};
    const allowed = new Set(candidateSkillNames.map((s) => s.toLowerCase()));
    for (const row of result.mappings || []) {
      map[(row.jobSkill || '').toLowerCase()] = (row.relatedCandidateSkills || []).filter((n) =>
        allowed.has(n.toLowerCase())
      );
    }
    return map;
  } catch {
    return {};
  }
}

export async function POST(request: NextRequest) {
  const ctx = await requireUser();
  if (ctx.response) return ctx.response;

  const body = await request.json().catch(() => ({}));
  const jobId = body.jobId as string | undefined;
  const seekerId = (body.seekerId as string | undefined) || ctx.user!.id;

  if (seekerId !== ctx.user!.id && ctx.profile?.role !== 'admin' && ctx.profile?.role !== 'employer') {
    return NextResponse.json({ error: 'Not allowed.' }, { status: 403 });
  }

  const [profileRes, skillsRes, eduRes, expRes, certRes, jobsRes] = await Promise.all([
    ctx.supabase.from('job_seeker_profiles').select('*').eq('user_id', seekerId).maybeSingle(),
    ctx.supabase.from('job_seeker_skills').select('*, skill:skills(*)').eq('user_id', seekerId),
    ctx.supabase.from('educations').select('*').eq('user_id', seekerId),
    ctx.supabase.from('work_experiences').select('*').eq('user_id', seekerId),
    ctx.supabase.from('certifications').select('*').eq('user_id', seekerId),
    jobId
      ? ctx.supabase
          .from('jobs')
          .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
          .eq('id', jobId)
          .eq('status', 'published')
      : ctx.supabase
          .from('jobs')
          .select('*, company:companies(*), required_skills:job_skills(*, skill:skills(*))')
          .eq('status', 'published')
          .order('created_at', { ascending: false })
          .limit(40),
  ]);

  const candidate = {
    profile: profileRes.data || {},
    skills: skillsRes.data || [],
    educations: eduRes.data || [],
    workExperiences: expRes.data || [],
    certifications: certRes.data || [],
  };

  const jobs = jobId ? (jobsRes.data ? [jobsRes.data] : []) : jobsRes.data || [];
  const candidateSkillNames = (candidate.skills as any[])
    .map((s) => s.skill?.name || s.name)
    .filter(Boolean);

  try {
    await assertAiRateLimit(ctx.user!.id, 'matching');
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 429 });
  }

  const results = [];
  for (const job of jobs as any[]) {
    const jobSkillNames = (job.required_skills || []).map((s: any) => s.skill?.name || s.name).filter(Boolean);
    const hashes = hashMatchInputs(job, candidate as any);

    const { data: cached } = await ctx.supabase
      .from('job_match_results')
      .select('*')
      .eq('seeker_id', seekerId)
      .eq('job_id', job.id)
      .maybeSingle();

    if (cached && cached.profile_hash === hashes.profileHash && cached.job_hash === hashes.jobHash) {
      results.push({
        jobId: job.id,
        job,
        match: {
          overallScore: Number(cached.overall_score),
          tier: cached.tier,
          isEstimate: true,
          factors: cached.factors,
          whyYouMatch: cached.why_you_match,
          growthAreas: cached.growth_areas,
          matchedSkillNames: cached.matched_skills,
          missingRequiredSkillNames: cached.missing_skills,
          matchedSkillsCount: (cached.matched_skills || []).length,
          totalRequiredSkillsCount: jobSkillNames.length,
        },
        cached: true,
      });
      continue;
    }

    const related = await relatedSkillMapFromGemini(jobSkillNames, candidateSkillNames);
    const match = calculateJobMatch(job, candidate as any, related);

    await ctx.supabase.from('job_match_results').upsert(
      {
        seeker_id: seekerId,
        job_id: job.id,
        overall_score: match.overallScore,
        tier: match.tier,
        factors: match.factors,
        why_you_match: match.whyYouMatch,
        growth_areas: match.growthAreas,
        matched_skills: match.matchedSkillNames,
        missing_skills: match.missingRequiredSkillNames,
        related_skill_map: related,
        profile_hash: hashes.profileHash,
        job_hash: hashes.jobHash,
        computed_at: new Date().toISOString(),
      },
      { onConflict: 'seeker_id,job_id' }
    );

    results.push({ jobId: job.id, job, match, cached: false });
  }

  results.sort((a, b) => b.match.overallScore - a.match.overallScore);
  return NextResponse.json({
    disclaimer: 'Percentages are estimated compatibility scores, not a guarantee of hiring success.',
    results,
  });
}
