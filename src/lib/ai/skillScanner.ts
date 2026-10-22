import { Skill } from '@/types/database';

export interface DetectedSkillItem {
  id?: string;
  name: string;
  category: 'Technical' | 'Framework' | 'Programming Language' | 'Soft Skill' | 'Tool' | 'Database' | 'Cloud & DevOps' | 'Design' | 'Other';
  confidence: number; // 0 - 100
  years_experience: number;
  proficiency: number; // 1 - 5
  evidenceSnippet?: string;
}

// Built-in comprehensive skill ontology
export const STANDARD_SKILLS_ONTOLOGY: Array<{ name: string; category: Skill['category']; keywords: string[] }> = [
  { name: 'React', category: 'Framework', keywords: ['react', 'react.js', 'reactjs', 'jsx', 'tsx', 'react native'] },
  { name: 'Next.js', category: 'Framework', keywords: ['next.js', 'nextjs', 'app router', 'ssr', 'ssg'] },
  { name: 'TypeScript', category: 'Programming Language', keywords: ['typescript', 'ts', 'typed javascript'] },
  { name: 'JavaScript', category: 'Programming Language', keywords: ['javascript', 'js', 'es6', 'ecmascript'] },
  { name: 'Node.js', category: 'Framework', keywords: ['node.js', 'nodejs', 'express', 'nestjs'] },
  { name: 'Python', category: 'Programming Language', keywords: ['python', 'django', 'fastapi', 'flask', 'pandas', 'numpy'] },
  { name: 'PostgreSQL', category: 'Database', keywords: ['postgresql', 'postgres', 'sql', 'psql', 'relational database'] },
  { name: 'Supabase', category: 'Cloud & DevOps', keywords: ['supabase', 'firebase', 'baas', 'rls', 'postgres'] },
  { name: 'Tailwind CSS', category: 'Design', keywords: ['tailwind', 'tailwindcss', 'css3', 'responsive design'] },
  { name: 'Git & GitHub', category: 'Tool', keywords: ['git', 'github', 'gitlab', 'version control', 'bitbucket'] },
  { name: 'Docker', category: 'Cloud & DevOps', keywords: ['docker', 'container', 'kubernetes', 'k8s', 'containerization'] },
  { name: 'AWS', category: 'Cloud & DevOps', keywords: ['aws', 'amazon web services', 's3', 'ec2', 'lambda', 'cloud'] },
  { name: 'GraphQL', category: 'Technical', keywords: ['graphql', 'apollo', 'hasura', 'relay'] },
  { name: 'REST API Design', category: 'Technical', keywords: ['rest', 'restful', 'api', 'openapi', 'swagger', 'http'] },
  { name: 'UI/UX Design', category: 'Design', keywords: ['figma', 'ui/ux', 'user experience', 'wireframing', 'prototyping'] },
  { name: 'Project Management', category: 'Soft Skill', keywords: ['agile', 'scrum', 'jira', 'sprint', 'kanban', 'project management'] },
  { name: 'Communication', category: 'Soft Skill', keywords: ['communication', 'teamwork', 'leadership', 'client management'] },
  { name: 'Problem Solving', category: 'Soft Skill', keywords: ['problem solving', 'analytical', 'troubleshooting', 'debugging'] },
  { name: 'PHP / Laravel', category: 'Framework', keywords: ['php', 'laravel', 'symfony', 'composer'] },
  { name: 'Java / Spring Boot', category: 'Framework', keywords: ['java', 'spring', 'spring boot', 'maven', 'hibernate'] },
  { name: 'C# / .NET', category: 'Framework', keywords: ['c#', '.net', 'asp.net', 'dotnet'] },
  { name: 'MongoDB', category: 'Database', keywords: ['mongodb', 'nosql', 'mongoose', 'document db'] },
  { name: 'Redis', category: 'Database', keywords: ['redis', 'caching', 'in-memory'] },
  { name: 'CI/CD Pipelines', category: 'Cloud & DevOps', keywords: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci'] },
];

/**
 * Scans text extracted from resumes, diplomas, or certificates to discover matching skills with confidence scores.
 */
export function scanTextForSkills(text: string): DetectedSkillItem[] {
  const normalizedText = text.toLowerCase();
  const detected: DetectedSkillItem[] = [];

  for (const item of STANDARD_SKILLS_ONTOLOGY) {
    let matchCount = 0;
    let snippet = '';

    for (const kw of item.keywords) {
      const regex = new RegExp(`\\b${kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi');
      const matches = normalizedText.match(regex);
      if (matches) {
        matchCount += matches.length;
        if (!snippet) {
          const idx = normalizedText.indexOf(kw.toLowerCase());
          const start = Math.max(0, idx - 40);
          const end = Math.min(text.length, idx + kw.length + 40);
          snippet = `"...${text.substring(start, end).trim()}..."`;
        }
      }
    }

    if (matchCount > 0) {
      // Calculate realistic confidence based on occurrences & specificity
      const confidence = Math.min(98, Math.max(72, 70 + matchCount * 8));
      const years = matchCount > 3 ? 3 : matchCount > 1 ? 2 : 1;
      const proficiency = matchCount > 4 ? 5 : matchCount > 2 ? 4 : 3;

      detected.push({
        name: item.name,
        category: item.category,
        confidence,
        years_experience: years,
        proficiency,
        evidenceSnippet: snippet || `Identified from document context`,
      });
    }
  }

  // Sort by highest confidence
  return detected.sort((a, b) => b.confidence - a.confidence);
}

/**
 * Extracts structured educational credentials from diploma/certificate text.
 */
export function extractEducationFromDiploma(text: string): {
  school_name?: string;
  degree?: string;
  field_of_study?: string;
  year?: string;
} {
  const normalized = text.toLowerCase();
  const result: { school_name?: string; degree?: string; field_of_study?: string; year?: string } = {};

  if (normalized.includes('master of science')) result.degree = 'Master of Science';
  else if (normalized.includes('bachelor of science')) result.degree = 'Bachelor of Science';
  else if (normalized.includes('bachelor of arts')) result.degree = 'Bachelor of Arts';
  else if (normalized.includes('associate')) result.degree = 'Associate Degree';

  if (normalized.includes('computer science')) result.field_of_study = 'Computer Science';
  else if (normalized.includes('information systems')) result.field_of_study = 'Information Systems';
  else if (normalized.includes('software engineering')) result.field_of_study = 'Software Engineering';
  else if (normalized.includes('computer engineering')) result.field_of_study = 'Computer Engineering';
  else if (normalized.includes('business administration')) result.field_of_study = 'Business Administration';

  const yearMatch = text.match(/\b(19|20)\d{2}\b/);
  if (yearMatch) result.year = yearMatch[0];

  return result;
}
