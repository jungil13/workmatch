/**
 * Documented WorkMatch compatibility weights.
 * Gemini may map related skill names; these weights always compute the score.
 */
export const MATCH_WEIGHTS = {
  requiredSkills: 0.35,
  preferredSkills: 0.10,
  experience: 0.20,
  education: 0.15,
  certifications: 0.10,
  location: 0.10,
} as const;

export const MATCH_SCORE_CAP = 99;
export const MATCH_SCORE_FLOOR = 5;

export const EXPERIENCE_YEARS_BY_LEVEL: Record<string, number> = {
  'Entry Level': 0,
  'Mid Level': 3,
  'Senior Level': 5,
  'Lead / Manager': 8,
};
