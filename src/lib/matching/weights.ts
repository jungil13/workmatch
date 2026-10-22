/**
 * WorkMatch compatibility weights — 4-factor model.
 * Required Skills + Experience + Education + Location = 100%
 */
export const MATCH_WEIGHTS = {
  requiredSkills: 0.45,
  experience: 0.25,
  education: 0.20,
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
