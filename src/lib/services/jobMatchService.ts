import type { MatchResult } from '@/types/matching';

function isMatchResult(value: unknown): value is MatchResult {
  if (!value || typeof value !== 'object') return false;
  const match = value as Record<string, unknown>;
  return (
    typeof match.overallScore === 'number' &&
    Number.isFinite(match.overallScore) &&
    ['Exceptional', 'Strong', 'Good', 'Moderate', 'Low'].includes(String(match.tier)) &&
    typeof match.isEstimate === 'boolean' &&
    !!match.factors &&
    typeof match.factors === 'object' &&
    Array.isArray(match.whyYouMatch) &&
    Array.isArray(match.growthAreas) &&
    typeof match.matchedSkillsCount === 'number' &&
    typeof match.totalRequiredSkillsCount === 'number' &&
    Array.isArray(match.matchedSkillNames) &&
    Array.isArray(match.missingRequiredSkillNames)
  );
}

export async function fetchBackendJobMatches(jobIds: string[]): Promise<Record<string, MatchResult>> {
  if (jobIds.length === 0) return {};

  const response = await fetch('/api/matching/refresh', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ jobIds }),
  });
  const data: unknown = await response.json().catch(() => null);
  const payload = data && typeof data === 'object' ? data as Record<string, unknown> : {};

  if (!response.ok) {
    throw new Error(
      typeof payload.error === 'string' ? payload.error : 'Could not calculate job matches.'
    );
  }
  if (!Array.isArray(payload.results)) {
    throw new Error('The matching service returned an invalid response.');
  }

  const matches: Record<string, MatchResult> = {};
  for (const result of payload.results) {
    if (!result || typeof result !== 'object') continue;
    const row = result as Record<string, unknown>;
    if (typeof row.jobId === 'string' && isMatchResult(row.match)) {
      matches[row.jobId] = row.match;
    }
  }
  return matches;
}
