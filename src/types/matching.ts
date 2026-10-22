import { JobSeekerProfile, JobSeekerSkill, Education, WorkExperience, Certification } from './database';

export interface MatchFactorBreakdown {
  name: string;
  weight: number;
  score: number;
  weightedScore: number;
  explanation: string;
  positive: boolean;
}

export interface MatchResult {
  overallScore: number;
  tier: 'Exceptional' | 'Strong' | 'Good' | 'Moderate' | 'Low';
  isEstimate: boolean;
  factors: {
    requiredSkills: MatchFactorBreakdown;
    preferredSkills: MatchFactorBreakdown;
    experience: MatchFactorBreakdown;
    education: MatchFactorBreakdown;
    certifications: MatchFactorBreakdown;
    location: MatchFactorBreakdown;
  };
  whyYouMatch: string[];
  growthAreas: string[];
  distanceKm?: number;
  matchedSkillsCount: number;
  totalRequiredSkillsCount: number;
  matchedSkillNames: string[];
  missingRequiredSkillNames: string[];
  skillMatchMode?: 'gemini-assisted' | 'exact';
}

export interface CandidateEvaluationData {
  profile: JobSeekerProfile;
  skills: JobSeekerSkill[];
  educations: Education[];
  workExperiences?: WorkExperience[];
  certifications?: Certification[];
}
