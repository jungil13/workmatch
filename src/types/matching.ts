import { Job, JobSeekerProfile, JobSeekerSkill, Education, WorkExperience } from './database';

export interface MatchFactorBreakdown {
  name: 'Skills' | 'Experience' | 'Location' | 'Education' | 'Salary' | 'Availability';
  weight: number; // e.g. 0.40
  score: number;  // 0 - 100
  weightedScore: number;
  explanation: string;
  positive: boolean;
}

export interface MatchResult {
  overallScore: number; // 0 - 100
  tier: 'Exceptional' | 'Strong' | 'Good' | 'Moderate' | 'Low';
  factors: {
    skills: MatchFactorBreakdown;
    experience: MatchFactorBreakdown;
    location: MatchFactorBreakdown;
    education: MatchFactorBreakdown;
    salary: MatchFactorBreakdown;
    availability: MatchFactorBreakdown;
  };
  whyYouMatch: string[];
  growthAreas: string[];
  distanceKm?: number;
  matchedSkillsCount: number;
  totalRequiredSkillsCount: number;
}

export interface CandidateEvaluationData {
  profile: JobSeekerProfile;
  skills: JobSeekerSkill[];
  educations: Education[];
  workExperiences: WorkExperience[];
}
