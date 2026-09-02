import { Job, JobSeekerProfile, JobSeekerSkill, Education, WorkExperience } from '@/types/database';
import { MatchResult, CandidateEvaluationData } from '@/types/matching';
import { calculateHaversineDistance } from './distanceCalculator';

/**
 * Calculates a comprehensive multi-factor match score between a Job and a Candidate.
 * Weights:
 * - Skills: 40%
 * - Experience: 20%
 * - Location: 20%
 * - Education: 10%
 * - Salary: 5%
 * - Availability: 5%
 */
export function calculateJobMatch(
  job: Job,
  candidate: CandidateEvaluationData
): MatchResult {
  const whyYouMatch: string[] = [];
  const growthAreas: string[] = [];

  const profile = candidate?.profile || ({} as any);
  const candidateSkills = candidate?.skills || [];
  const candidateEducations = candidate?.educations || [];

  // --- 1. SKILLS MATCH (40%) ---
  const requiredSkills = job.required_skills || (job as any).job_skills || [];
  
  let skillsScore = 0;
  let matchedSkillsCount = 0;

  if (!requiredSkills || requiredSkills.length === 0) {
    skillsScore = 85;
    whyYouMatch.push('General skills requirements are aligned');
  } else {
    let weightedMatched = 0;
    
    requiredSkills.forEach((reqSkill: any) => {
      const reqName = (reqSkill?.name || reqSkill?.skill?.name || '').trim().toLowerCase();
      const reqId = reqSkill?.skill_id || reqSkill?.id || reqSkill?.skill?.id;
      const minProf = reqSkill?.minimum_proficiency || 3;

      const found = candidateSkills.find((cs: any) => {
        const candName = (cs?.skill?.name || cs?.name || '').trim().toLowerCase();
        const candId = cs?.skill_id || cs?.skill?.id || cs?.id;

        const nameMatches = Boolean(reqName && candName && reqName === candName);
        const idMatches = Boolean(reqId && candId && reqId === candId);

        return nameMatches || idMatches;
      });

      if (found) {
        matchedSkillsCount++;
        // Proficiency match bonus (1-5 scale)
        const profRatio = Math.min(1.2, (found.proficiency || 3) / minProf);
        const verifiedBonus = found.verified ? 1.15 : 1.0;
        weightedMatched += Math.min(1.0, profRatio * 0.9 * verifiedBonus);
      }
    });

    const ratio = matchedSkillsCount / requiredSkills.length;
    skillsScore = Math.min(100, Math.round((weightedMatched / requiredSkills.length) * 100));

    if (matchedSkillsCount >= requiredSkills.length) {
      whyYouMatch.push(`✓ Matches all ${requiredSkills.length} required skill${requiredSkills.length > 1 ? 's' : ''}`);
    } else if (matchedSkillsCount > 0) {
      whyYouMatch.push(`✓ ${matchedSkillsCount} of ${requiredSkills.length} core skills match`);
    } else {
      const sampleNames = requiredSkills
        .slice(0, 3)
        .map((s: any) => s.name || s.skill?.name || 'Skill')
        .filter(Boolean);
      growthAreas.push(`Missing key required skills: ${sampleNames.join(', ')}`);
    }

    const verifiedCount = candidateSkills.filter((s: any) => s.verified).length;
    if (verifiedCount > 0) {
      whyYouMatch.push(`✓ ${verifiedCount} verified skill credential${verifiedCount > 1 ? 's' : ''}`);
    }
  }

  // --- 2. EXPERIENCE MATCH (20%) ---
  let expScore = 70;
  const seekerExpYears = Number(profile?.years_experience) || 0;
  const expLevel = job.experience_level || 'Mid Level';

  let expectedYears = 1;
  if (expLevel === 'Entry Level') expectedYears = 1;
  else if (expLevel === 'Mid Level') expectedYears = 3;
  else if (expLevel === 'Senior Level') expectedYears = 5;
  else if (expLevel === 'Lead / Manager') expectedYears = 8;

  if (seekerExpYears >= expectedYears) {
    expScore = 100;
    whyYouMatch.push(`✓ ${seekerExpYears}+ years experience meets ${expLevel} requirement`);
  } else if (seekerExpYears >= expectedYears - 1) {
    expScore = 80;
    whyYouMatch.push(`✓ Experience level close to required ${expLevel}`);
  } else {
    expScore = Math.max(30, Math.round((seekerExpYears / expectedYears) * 80));
    growthAreas.push(`Role prefers ${expectedYears}+ years of experience (you have ${seekerExpYears})`);
  }

  // --- 3. LOCATION MATCH (20%) ---
  let locScore = 75;
  let distanceKm: number | undefined;

  if (job.work_arrangement === 'Remote') {
    locScore = 100;
    whyYouMatch.push('✓ Fully Remote position — anywhere in the Philippines');
  } else if (
    profile.latitude !== undefined &&
    profile.longitude !== undefined &&
    job.latitude !== undefined &&
    job.longitude !== undefined
  ) {
    distanceKm = calculateHaversineDistance(
      { latitude: profile.latitude, longitude: profile.longitude },
      { latitude: job.latitude, longitude: job.longitude }
    );

    if (distanceKm <= 5) {
      locScore = 100;
      whyYouMatch.push(`✓ Extremely close (${distanceKm.toFixed(1)} km away)`);
    } else if (distanceKm <= 15) {
      locScore = 95;
      whyYouMatch.push(`✓ Within easy commute distance (${distanceKm.toFixed(1)} km)`);
    } else if (distanceKm <= 35) {
      locScore = 80;
      whyYouMatch.push(`✓ Within metropolitan commuting range (${distanceKm.toFixed(1)} km)`);
    } else if (distanceKm <= 60) {
      locScore = 60;
    } else {
      locScore = 40;
      growthAreas.push(`Located ${distanceKm.toFixed(1)} km away (${job.city || 'Philippines'})`);
    }
  } else {
    // City match fallback
    if (profile.city && job.city && profile.city.toLowerCase() === job.city.toLowerCase()) {
      locScore = 95;
      whyYouMatch.push(`✓ Located in same city (${job.city})`);
    } else {
      locScore = 70;
    }
  }

  // --- 4. EDUCATION MATCH (10%) ---
  let eduScore = 70;
  const verifiedEdu = candidateEducations.some((e: any) => e.verified);
  const hasDegree = candidateEducations.length > 0;

  if (verifiedEdu) {
    eduScore = 100;
    whyYouMatch.push('✓ Verified college degree on file');
  } else if (hasDegree) {
    eduScore = 90;
    whyYouMatch.push(`✓ Educational background in ${candidateEducations[0].field_of_study || 'relevant field'}`);
  } else {
    eduScore = 60;
  }

  // --- 5. SALARY ALIGNMENT (5%) ---
  let salaryScore = 80;
  const prefMin = profile.preferred_salary_min ? Number(profile.preferred_salary_min) : undefined;
  const prefMax = profile.preferred_salary_max ? Number(profile.preferred_salary_max) : undefined;

  if (prefMin && prefMax && job.salary_max && job.salary_min) {
    if (job.salary_max >= prefMin && job.salary_min <= prefMax) {
      salaryScore = 100;
      whyYouMatch.push('✓ Salary range matches your preferences');
    } else if (job.salary_max >= prefMin * 0.85) {
      salaryScore = 80;
    } else {
      salaryScore = 50;
      growthAreas.push('Salary offering is below preferred minimum');
    }
  } else {
    salaryScore = 85;
  }

  // --- 6. AVAILABILITY (5%) ---
  let availScore = 80;
  if (profile.availability === 'Immediate') {
    availScore = 100;
    whyYouMatch.push('✓ Available to start immediately');
  } else if (profile.availability === '2 Weeks Notice' || profile.availability === 'Actively Looking') {
    availScore = 90;
  } else {
    availScore = 70;
  }

  // Calculate Weighted Overall Match
  const overallScore = Math.min(
    99,
    Math.max(
      35,
      Math.round(
        skillsScore * 0.40 +
        expScore * 0.20 +
        locScore * 0.20 +
        eduScore * 0.10 +
        salaryScore * 0.05 +
        availScore * 0.05
      )
    )
  );

  let tier: 'Exceptional' | 'Strong' | 'Good' | 'Moderate' | 'Low' = 'Good';
  if (overallScore >= 90) tier = 'Exceptional';
  else if (overallScore >= 80) tier = 'Strong';
  else if (overallScore >= 70) tier = 'Good';
  else if (overallScore >= 55) tier = 'Moderate';
  else tier = 'Low';

  return {
    overallScore,
    tier,
    factors: {
      skills: {
        name: 'Skills',
        weight: 0.40,
        score: skillsScore,
        weightedScore: Math.round(skillsScore * 0.40),
        explanation: `${matchedSkillsCount} of ${requiredSkills.length || 'all'} required skills matching`,
        positive: skillsScore >= 70,
      },
      experience: {
        name: 'Experience',
        weight: 0.20,
        score: expScore,
        weightedScore: Math.round(expScore * 0.20),
        explanation: `${seekerExpYears} years vs ${expLevel} level requirements`,
        positive: expScore >= 75,
      },
      location: {
        name: 'Location',
        weight: 0.20,
        score: locScore,
        weightedScore: Math.round(locScore * 0.20),
        explanation: job.work_arrangement === 'Remote' ? 'Remote location' : distanceKm ? `${distanceKm.toFixed(1)} km away in ${job.city || 'target area'}` : `Located in ${job.city || 'target area'}`,
        positive: locScore >= 75,
      },
      education: {
        name: 'Education',
        weight: 0.10,
        score: eduScore,
        weightedScore: Math.round(eduScore * 0.10),
        explanation: hasDegree ? `${candidateEducations[0].degree || 'Degree'} in ${candidateEducations[0].field_of_study || 'field'}` : 'Degree/Certificates',
        positive: eduScore >= 75,
      },
      salary: {
        name: 'Salary',
        weight: 0.05,
        score: salaryScore,
        weightedScore: Math.round(salaryScore * 0.05),
        explanation: `Budget aligns with expectation`,
        positive: salaryScore >= 75,
      },
      availability: {
        name: 'Availability',
        weight: 0.05,
        score: availScore,
        weightedScore: Math.round(availScore * 0.05),
        explanation: profile.availability || 'Immediate',
        positive: availScore >= 80,
      },
    },
    whyYouMatch,
    growthAreas,
    distanceKm,
    matchedSkillsCount,
    totalRequiredSkillsCount: requiredSkills.length,
  };
}
