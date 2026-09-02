export type UserRole = 'job_seeker' | 'employer' | 'admin';
export type UserStatus = 'active' | 'pending' | 'suspended' | 'deactivated';
export type JobStatus = 'draft' | 'published' | 'closed';
export type ApplicationStatus = 'applied' | 'screening' | 'interview' | 'offer' | 'hired' | 'rejected' | 'withdrawn';
export type DocumentType = 'resume' | 'diploma' | 'certificate' | 'other';
export type VerificationStatus = 'pending' | 'verified' | 'rejected';
export type WorkArrangement = 'On-site' | 'Remote' | 'Hybrid';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Freelance' | 'Internship';
export type ExperienceLevel = 'Entry Level' | 'Mid Level' | 'Senior Level' | 'Lead / Manager';

export interface Profile {
  id: string;
  email: string;
  first_name: string;
  last_name: string;
  phone?: string;
  avatar_url?: string;
  role: UserRole;
  status: UserStatus;
  created_at: string;
  updated_at: string;
}

export interface JobSeekerProfile {
  id: string;
  user_id: string;
  professional_title?: string;
  bio?: string;
  years_experience: number;
  availability: 'Immediate' | '2 Weeks Notice' | '1 Month Notice' | 'Actively Looking' | 'Casually Exploring';
  preferred_salary_min?: number;
  preferred_salary_max?: number;
  preferred_job_type?: EmploymentType;
  preferred_work_arrangement?: WorkArrangement | 'Any';
  profile_visibility: 'Public' | 'Employers Only' | 'Private';
  profile_completion: number;
  city?: string;
  province?: string;
  postal_code?: string;
  latitude?: number;
  longitude?: number;
  created_at: string;
  updated_at: string;
}

export interface EmployerProfile {
  id: string;
  user_id: string;
  company_id?: string;
  position: string;
  verified: boolean;
  created_at: string;
  updated_at: string;
}

export interface Company {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  description: string;
  industry: string;
  website?: string;
  email?: string;
  phone?: string;
  address: string;
  city: string;
  province: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  verified: boolean;
  rating_avg?: number;
  review_count?: number;
  created_at: string;
  updated_at: string;
}

export interface Skill {
  id: string;
  name: string;
  category: 'Technical' | 'Framework' | 'Programming Language' | 'Soft Skill' | 'Tool' | 'Database' | 'Cloud & DevOps' | 'Design' | 'Other';
  description?: string;
  created_at: string;
}

export interface JobSeekerSkill {
  id: string;
  user_id: string;
  skill_id: string;
  skill?: Skill;
  proficiency: number; // 1-5
  years_experience: number;
  verified: boolean;
  source: 'Self' | 'AI Extraction' | 'Diploma Verified' | 'Assessment';
  created_at: string;
}

export interface Education {
  id: string;
  user_id: string;
  school_name: string;
  degree: string;
  field_of_study: string;
  start_date?: string;
  end_date?: string;
  verified: boolean;
  created_at: string;
}

export interface WorkExperience {
  id: string;
  user_id: string;
  company_name: string;
  job_title: string;
  description?: string;
  start_date: string;
  end_date?: string;
  is_current: boolean;
  created_at: string;
}

export interface Certification {
  id: string;
  user_id: string;
  name: string;
  issuer: string;
  issue_date?: string;
  expiry_date?: string;
  credential_url?: string;
  verified: boolean;
  created_at: string;
}

export interface Document {
  id: string;
  user_id: string;
  document_type: DocumentType;
  file_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  verification_status: VerificationStatus;
  verification_notes?: string;
  uploaded_at: string;
  verified_at?: string;
}

export interface DocumentExtraction {
  id: string;
  document_id: string;
  extracted_text?: string;
  extracted_data?: Record<string, any>;
  detected_skills: Array<{ name: string; category: string; confidence: number }>;
  confidence: number;
  created_at: string;
}

export interface Job {
  id: string;
  company_id: string;
  employer_id: string;
  company?: Company;
  title: string;
  slug: string;
  description: string;
  responsibilities: string;
  qualifications: string;
  salary_min: number;
  salary_max: number;
  salary_currency: string;
  employment_type: EmploymentType;
  work_arrangement: WorkArrangement;
  experience_level: ExperienceLevel;
  city: string;
  province: string;
  postal_code?: string;
  latitude: number;
  longitude: number;
  status: JobStatus;
  application_deadline?: string;
  views: number;
  applicant_count?: number;
  required_skills?: Array<Skill & { is_required: boolean; minimum_proficiency: number }>;
  created_at: string;
  updated_at: string;
}

export interface JobSkill {
  id: string;
  job_id: string;
  skill_id: string;
  skill?: Skill;
  is_required: boolean;
  minimum_proficiency: number;
  created_at: string;
}

export interface SavedJob {
  id: string;
  user_id: string;
  job_id: string;
  job?: Job;
  created_at: string;
}

export interface Application {
  id: string;
  job_id: string;
  applicant_id: string;
  job?: Job;
  applicant?: Profile & {
    job_seeker_profile?: JobSeekerProfile;
    skills?: JobSeekerSkill[];
    educations?: Education[];
    work_experiences?: WorkExperience[];
    documents?: Document[];
  };
  resume_document_id?: string;
  cover_letter?: string;
  match_score: number;
  status: ApplicationStatus;
  applied_at: string;
  updated_at: string;
  history?: ApplicationStatusHistory[];
  interview?: Interview;
}

export interface ApplicationStatusHistory {
  id: string;
  application_id: string;
  from_status?: ApplicationStatus;
  to_status: ApplicationStatus;
  changed_by?: string;
  notes?: string;
  created_at: string;
}

export interface Interview {
  id: string;
  application_id: string;
  scheduled_at: string;
  duration_minutes: number;
  location?: string;
  meeting_url?: string;
  status: 'scheduled' | 'completed' | 'cancelled' | 'rescheduled';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CompanyReview {
  id: string;
  company_id: string;
  reviewer_id: string;
  company?: Company;
  reviewer?: Profile;
  rating: number; // 1-5
  title: string;
  review: string;
  work_culture_rating?: number;
  management_rating?: number;
  salary_rating?: number;
  work_environment_rating?: number;
  pros?: string;
  cons?: string;
  verified_employee: boolean;
  is_moderated: boolean;
  created_at: string;
  updated_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  type: 'match' | 'application' | 'interview' | 'status_change' | 'system';
  title: string;
  message: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  show_skills: boolean;
  show_education: boolean;
  show_experience: boolean;
  show_location: boolean;
  allow_employer_contact: boolean;
  email_notifications: boolean;
  application_notifications: boolean;
  job_recommendations: boolean;
  preferred_search_radius: number;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  metadata?: Record<string, any>;
  created_at: string;
}

export interface Report {
  id: string;
  reported_by: string;
  reporter?: Profile;
  reported_user_id?: string;
  job_id?: string;
  company_id?: string;
  reason: string;
  description: string;
  status: 'pending' | 'under_review' | 'resolved' | 'dismissed';
  resolved_by?: string;
  resolved_at?: string;
  created_at: string;
}
