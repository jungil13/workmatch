export const APPLICATION_STATUSES = [
  'applied',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
  'rejected',
  'withdrawn',
  'closed',
] as const;

export type AppStatus = (typeof APPLICATION_STATUSES)[number];

export const APPLICATION_STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Under Review',
  shortlisted: 'Shortlisted',
  interview: 'Interview Scheduled',
  offer: 'Offered',
  hired: 'Hired',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  closed: 'Closed',
};

export const APPLICATION_STATUS_COLORS: Record<string, string> = {
  applied: 'bg-amber-50 text-amber-800 border-amber-200',
  screening: 'bg-blue-50 text-blue-800 border-blue-200',
  shortlisted: 'bg-indigo-50 text-indigo-800 border-indigo-200',
  interview: 'bg-violet-50 text-violet-800 border-violet-200',
  offer: 'bg-emerald-50 text-emerald-800 border-emerald-200',
  hired: 'bg-emerald-100 text-emerald-900 border-emerald-300',
  rejected: 'bg-rose-50 text-rose-800 border-rose-200',
  withdrawn: 'bg-slate-50 text-slate-700 border-slate-200',
  closed: 'bg-slate-100 text-slate-700 border-slate-300',
};

export const EMPLOYER_STATUS_OPTIONS = [
  { value: 'applied', label: APPLICATION_STATUS_LABELS.applied },
  { value: 'screening', label: APPLICATION_STATUS_LABELS.screening },
  { value: 'shortlisted', label: APPLICATION_STATUS_LABELS.shortlisted },
  { value: 'interview', label: APPLICATION_STATUS_LABELS.interview },
  { value: 'offer', label: APPLICATION_STATUS_LABELS.offer },
  { value: 'rejected', label: APPLICATION_STATUS_LABELS.rejected },
  { value: 'closed', label: APPLICATION_STATUS_LABELS.closed },
];

export const PIPELINE_STAGES: AppStatus[] = [
  'applied',
  'screening',
  'shortlisted',
  'interview',
  'offer',
  'hired',
];

export function isPendingApplication(status: string) {
  return ['applied', 'screening', 'shortlisted', 'interview', 'offer'].includes(status);
}

export function isCompanyVerified(company?: {
  verification_status?: string | null;
  verified?: boolean | null;
} | null) {
  if (!company) return false;
  if (company.verification_status) return company.verification_status === 'approved';
  return Boolean(company.verified);
}
