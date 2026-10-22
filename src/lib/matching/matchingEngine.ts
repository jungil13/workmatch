import { Job } from '@/types/database';
import { MatchResult, CandidateEvaluationData } from '@/types/matching';
import { calculateHaversineDistance } from './distanceCalculator';
import { EXPERIENCE_YEARS_BY_LEVEL, MATCH_SCORE_CAP, MATCH_SCORE_FLOOR, MATCH_WEIGHTS } from './weights';

function skillName(item: any): string {
  return (item?.name || item?.skill?.name || '').trim().toLowerCase();
}

function skillId(item: any): string {
  return item?.skill_id || item?.skill?.id || item?.id || '';
}

export function hashMatchInputs(job: Job, candidate: CandidateEvaluationData) {
  const profile = candidate.profile || ({} as any);
  const skillKey = (candidate.skills || [])
    .map((s: any) => [
      skillId(s),
      skillName(s),
      s.skill?.description || '',
      s.skill?.category || '',
      Number(s.proficiency) || 0,
      Boolean(s.verified),
    ])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const eduKey = (candidate.educations || [])
    .map((e: any) => [e.degree || '', e.field_of_study || '', Boolean(e.verified)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const certKey = (candidate.certifications || [])
    .map((c: any) => [c.name || '', Boolean(c.verified)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const experienceKey = (candidate.workExperiences || [])
    .map((e: any) => [e.start_date || '', e.end_date || '', Boolean(e.is_current)])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  const jobSkills = ((job.required_skills || (job as any).job_skills || []) as any[])
    .map((s) => [
      skillId(s),
      skillName(s),
      s.skill?.description || s.description || '',
      s.skill?.category || s.category || '',
      s.is_required !== false,
      Number(s.minimum_proficiency) || 3,
    ])
    .sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
  return {
    profileHash: `v2:${JSON.stringify({
      yearsExperience: profile.years_experience || 0,
      city: profile.city || '',
      latitude: profile.latitude ?? null,
      longitude: profile.longitude ?? null,
      skills: skillKey,
      educations: eduKey,
      certifications: certKey,
      workExperiences: experienceKey,
    })}`,
    jobHash: `v2:${JSON.stringify({
      id: job.id,
      title: job.title,
      experienceLevel: job.experience_level,
      city: job.city,
      latitude: job.latitude ?? null,
      longitude: job.longitude ?? null,
      workArrangement: job.work_arrangement,
      qualifications: job.qualifications || '',
      description: job.description || '',
      skills: jobSkills,
    })}`,
  };
}

/**
 * Deterministic compatibility score.
 * relatedSkillMap: jobSkillName -> candidate skill names Gemini judged as related.
 * Gemini never adds skills the candidate did not provide.
 */
export function calculateJobMatch(
  job: Job,
  candidate: CandidateEvaluationData,
  relatedSkillMap: Record<string, string[]> = {}
): MatchResult {
  const whyYouMatch: string[] = [];
  const growthAreas: string[] = [];
  const matchedSkillNames: string[] = [];
  const missingRequired: string[] = [];

  const profile = candidate?.profile || ({} as any);
  const candidateSkills = candidate?.skills || [];
  const candidateEducations = candidate?.educations || [];
  const candidateCerts = candidate?.certifications || [];
  const candidateExp = candidate?.workExperiences || [];

  const jobSkills = (job.required_skills || (job as any).job_skills || []) as any[];
  const requiredSkills = jobSkills.filter((s) => s.is_required !== false);
  const preferredSkills = jobSkills.filter((s) => s.is_required === false);

  const findCandidateSkill = (reqSkill: any) => {
    const reqName = skillName(reqSkill);
    const reqId = skillId(reqSkill);
    const related = (relatedSkillMap[reqName] || relatedSkillMap[reqSkill?.name] || []).map((n) => n.toLowerCase());

    return candidateSkills.find((cs: any) => {
      const candName = skillName(cs);
      const candId = skillId(cs);
      return (
        (reqName && candName && reqName === candName) ||
        (reqId && candId && reqId === candId) ||
        (candName && related.includes(candName))
      );
    });
  };

  const scoreSkillGroup = (skills: any[], required: boolean) => {
    if (!skills.length) return { score: 0, matched: 0, total: 0, used: false };
    let weighted = 0;
    let matched = 0;
    skills.forEach((reqSkill) => {
      const found = findCandidateSkill(reqSkill);
      const displayName = reqSkill?.name || reqSkill?.skill?.name || 'Skill';
      if (found) {
        matched += 1;
        const minProf = reqSkill?.minimum_proficiency || 3;
        const profRatio = Math.min(1, (found.proficiency || 3) / minProf);
        const verifiedBonus = found.verified ? 0.08 : 0;
        weighted += Math.min(1, profRatio * 0.92 + verifiedBonus);
        matchedSkillNames.push(displayName);
      } else if (required) {
        missingRequired.push(displayName);
      }
    });
    return {
      score: Math.round((weighted / skills.length) * 100),
      matched,
      total: skills.length,
      used: true,
    };
  };

  const requiredResult = scoreSkillGroup(requiredSkills.length ? requiredSkills : jobSkills.filter((s) => s.is_required !== false), true);
  const preferredResult = scoreSkillGroup(preferredSkills, false);

  let requiredSkillsScore = requiredResult.used ? requiredResult.score : 40;
  if (!jobSkills.length) {
    requiredSkillsScore = 40;
    growthAreas.push('This job has no structured skill requirements, so the skill score is limited.');
  } else if (requiredResult.matched === requiredResult.total && requiredResult.total > 0) {
    whyYouMatch.push(`Matches ${requiredResult.matched} of ${requiredResult.total} required skills`);
  } else if (requiredResult.matched > 0) {
    whyYouMatch.push(`Matches ${requiredResult.matched} of ${requiredResult.total} required skills`);
  } else if (requiredResult.total > 0) {
    growthAreas.push(`Missing required skills: ${missingRequired.slice(0, 4).join(', ')}`);
  }

  let preferredSkillsScore = preferredResult.used ? preferredResult.score : 50;
  if (preferredResult.matched > 0) {
    whyYouMatch.push(`Also matches ${preferredResult.matched} preferred skill${preferredResult.matched === 1 ? '' : 's'}`);
  }

  const seekerExpYears =
    Number(profile?.years_experience) ||
    candidateExp.reduce((sum: number, exp: any) => {
      if (!exp.start_date) return sum;
      const start = new Date(exp.start_date).getTime();
      const end = exp.is_current || !exp.end_date ? Date.now() : new Date(exp.end_date).getTime();
      return sum + Math.max(0, (end - start) / (1000 * 60 * 60 * 24 * 365));
    }, 0);

  const expLevel = job.experience_level || 'Mid Level';
  const expectedYears = EXPERIENCE_YEARS_BY_LEVEL[expLevel] ?? 3;
  let expScore = 40;
  if (seekerExpYears >= expectedYears) {
    expScore = 95;
    whyYouMatch.push(`${Math.round(seekerExpYears)} years of experience meets ${expLevel} expectations`);
  } else if (expectedYears === 0) {
    expScore = 80;
  } else {
    expScore = Math.max(20, Math.round((seekerExpYears / Math.max(expectedYears, 1)) * 85));
    growthAreas.push(`Role typically expects about ${expectedYears}+ years (${Math.round(seekerExpYears)} on your profile)`);
  }

  const qualifications = `${job.qualifications || ''} ${job.description || ''}`.toLowerCase();
  const wantsDegree = /bachelor|degree|college|graduate|diploma/.test(qualifications);
  const verifiedEdu = candidateEducations.some((e: any) => e.verified);
  const hasDegree = candidateEducations.length > 0;
  let eduScore = 35;
  if (verifiedEdu) {
    eduScore = 92;
    whyYouMatch.push('Has education records marked verified by WorkMatch admin review');
  } else if (hasDegree) {
    eduScore = wantsDegree ? 78 : 70;
    whyYouMatch.push(`Education on file: ${candidateEducations[0].degree || 'credential'} in ${candidateEducations[0].field_of_study || 'a related field'}`);
    growthAreas.push('Education is listed but not admin-verified yet.');
  } else if (wantsDegree) {
    eduScore = 25;
    growthAreas.push('Job qualifications mention a degree or diploma that is not on your profile.');
  }

  const verifiedCerts = candidateCerts.filter((c: any) => c.verified).length;
  let certScore = 40;
  if (candidateCerts.length === 0) {
    certScore = 40;
  } else {
    certScore = Math.min(90, 55 + candidateCerts.length * 8 + verifiedCerts * 6);
    whyYouMatch.push(`${candidateCerts.length} certification${candidateCerts.length === 1 ? '' : 's'} on file${verifiedCerts ? ` (${verifiedCerts} verified)` : ''}`);
  }

  let locScore = 50;
  let distanceKm: number | undefined;
  if (job.work_arrangement === 'Remote') {
    locScore = 90;
    whyYouMatch.push('Remote role — location is not a blocker');
  } else if (profile.latitude != null && profile.longitude != null && job.latitude != null && job.longitude != null) {
    distanceKm = calculateHaversineDistance(
      { latitude: profile.latitude, longitude: profile.longitude },
      { latitude: job.latitude, longitude: job.longitude }
    );
    if (distanceKm <= 10) locScore = 95;
    else if (distanceKm <= 25) locScore = 80;
    else if (distanceKm <= 50) locScore = 60;
    else {
      locScore = 35;
      growthAreas.push(`About ${distanceKm.toFixed(1)} km from the job location`);
    }
  } else if (profile.city && job.city && profile.city.toLowerCase() === job.city.toLowerCase()) {
    locScore = 85;
    whyYouMatch.push(`Same city as the posting (${job.city})`);
  }

  const overallScore = Math.min(
    MATCH_SCORE_CAP,
    Math.max(
      MATCH_SCORE_FLOOR,
      Math.round(
        requiredSkillsScore * MATCH_WEIGHTS.requiredSkills +
          preferredSkillsScore * MATCH_WEIGHTS.preferredSkills +
          expScore * MATCH_WEIGHTS.experience +
          eduScore * MATCH_WEIGHTS.education +
          certScore * MATCH_WEIGHTS.certifications +
          locScore * MATCH_WEIGHTS.location
      )
    )
  );

  let tier: MatchResult['tier'] = 'Good';
  if (overallScore >= 90) tier = 'Exceptional';
  else if (overallScore >= 80) tier = 'Strong';
  else if (overallScore >= 70) tier = 'Good';
  else if (overallScore >= 55) tier = 'Moderate';
  else tier = 'Low';

  if (missingRequired.length) {
    growthAreas.push(`Unverified or missing requirements: ${missingRequired.slice(0, 5).join(', ')}`);
  }

  return {
    overallScore,
    tier,
    isEstimate: true,
    factors: {
      requiredSkills: {
        name: 'Required skills',
        weight: MATCH_WEIGHTS.requiredSkills,
        score: requiredSkillsScore,
        weightedScore: Math.round(requiredSkillsScore * MATCH_WEIGHTS.requiredSkills),
        explanation: jobSkills.length
          ? `${requiredResult.matched} of ${requiredResult.total || jobSkills.length} required skills`
          : 'No structured required skills on this job',
        positive: requiredSkillsScore >= 70,
      },
      preferredSkills: {
        name: 'Preferred skills',
        weight: MATCH_WEIGHTS.preferredSkills,
        score: preferredSkillsScore,
        weightedScore: Math.round(preferredSkillsScore * MATCH_WEIGHTS.preferredSkills),
        explanation: preferredResult.total
          ? `${preferredResult.matched} of ${preferredResult.total} preferred skills`
          : 'No preferred skills listed',
        positive: preferredSkillsScore >= 60,
      },
      experience: {
        name: 'Experience',
        weight: MATCH_WEIGHTS.experience,
        score: expScore,
        weightedScore: Math.round(expScore * MATCH_WEIGHTS.experience),
        explanation: `${Math.round(seekerExpYears)} years vs ${expLevel}`,
        positive: expScore >= 75,
      },
      education: {
        name: 'Education',
        weight: MATCH_WEIGHTS.education,
        score: eduScore,
        weightedScore: Math.round(eduScore * MATCH_WEIGHTS.education),
        explanation: hasDegree
          ? `${candidateEducations[0].degree || 'Credential'} — ${verifiedEdu ? 'admin verified' : 'unverified'}`
          : 'No education records on profile',
        positive: eduScore >= 75,
      },
      certifications: {
        name: 'Certifications',
        weight: MATCH_WEIGHTS.certifications,
        score: certScore,
        weightedScore: Math.round(certScore * MATCH_WEIGHTS.certifications),
        explanation: candidateCerts.length ? `${candidateCerts.length} on file` : 'No certifications listed',
        positive: certScore >= 70,
      },
      location: {
        name: 'Location',
        weight: MATCH_WEIGHTS.location,
        score: locScore,
        weightedScore: Math.round(locScore * MATCH_WEIGHTS.location),
        explanation:
          job.work_arrangement === 'Remote'
            ? 'Remote'
            : distanceKm != null
              ? `${distanceKm.toFixed(1)} km from ${job.city || 'the job'}`
              : job.city || 'Location not fully specified',
        positive: locScore >= 75,
      },
    },
    whyYouMatch: whyYouMatch.length ? whyYouMatch : ['Limited overlap based on the current profile and job requirements.'],
    growthAreas,
    distanceKm,
    matchedSkillsCount: requiredResult.matched + preferredResult.matched,
    totalRequiredSkillsCount: requiredResult.total || jobSkills.length,
    matchedSkillNames: Array.from(new Set(matchedSkillNames)),
    missingRequiredSkillNames: missingRequired,
  };
}
