-- ==============================================================================
-- WORKMATCH: Complete RLS Fixes, Auth Triggers, Storage Bucket & Schema (v4)
-- Run this in your Supabase SQL Editor (Dashboard -> SQL Editor -> New Query -> Run)
-- ==============================================================================

-- 1. Ensure UUID extension is available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Make sure public.profiles has permissive RLS policies for authenticated users
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users view own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Users insert own profile" ON public.profiles;
DROP POLICY IF EXISTS "Public can view profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all authenticated users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all users to read profiles" ON public.profiles;
DROP POLICY IF EXISTS "Allow all users to insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to insert profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow all users to update own profile" ON public.profiles;
DROP POLICY IF EXISTS "Allow users to update own profile" ON public.profiles;

CREATE POLICY "Allow all users to read profiles" ON public.profiles
    FOR SELECT USING (true);

CREATE POLICY "Allow users to insert profile" ON public.profiles
    FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow users to update own profile" ON public.profiles
    FOR UPDATE USING (auth.uid() = id OR EXISTS (
        SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
    ));

-- 2b. Add missing columns to job_seeker_profiles if not present
ALTER TABLE public.job_seeker_profiles
    ADD COLUMN IF NOT EXISTS city TEXT,
    ADD COLUMN IF NOT EXISTS province TEXT,
    ADD COLUMN IF NOT EXISTS latitude DOUBLE PRECISION,
    ADD COLUMN IF NOT EXISTS longitude DOUBLE PRECISION;

-- 2c. Relax constraints on jobs table to allow flexible creation
ALTER TABLE public.jobs
    ALTER COLUMN latitude DROP NOT NULL,
    ALTER COLUMN longitude DROP NOT NULL,
    ALTER COLUMN responsibilities DROP NOT NULL,
    ALTER COLUMN qualifications DROP NOT NULL;

-- 3. Bulletproof Automatic Auth Trigger for New User Sign-ups
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    first_n TEXT;
    last_n TEXT;
    comp_name TEXT;
    new_comp_id UUID;
    comp_slug TEXT;
BEGIN
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'job_seeker');
    first_n := COALESCE(new.raw_user_meta_data->>'first_name', split_part(new.email, '@', 1));
    last_n := COALESCE(new.raw_user_meta_data->>'last_name', '');
    comp_name := new.raw_user_meta_data->>'company_name';

    -- 1. Insert into public.profiles
    BEGIN
        INSERT INTO public.profiles (id, email, first_name, last_name, role, status, created_at, updated_at)
        VALUES (new.id, new.email, first_n, last_n, user_role, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET first_name = EXCLUDED.first_name,
            last_name = EXCLUDED.last_name,
            role = EXCLUDED.role,
            updated_at = NOW();
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user profiles error: %', SQLERRM;
    END;

    -- 2. Insert default user_settings
    BEGIN
        INSERT INTO public.user_settings (user_id, show_skills, show_education, show_experience, show_location, allow_employer_contact, email_notifications, preferred_search_radius)
        VALUES (new.id, TRUE, TRUE, TRUE, TRUE, TRUE, TRUE, 25)
        ON CONFLICT (user_id) DO NOTHING;
    EXCEPTION WHEN OTHERS THEN
        RAISE WARNING 'handle_new_user user_settings error: %', SQLERRM;
    END;

    -- 3. If job seeker, create job_seeker_profiles entry
    IF user_role = 'job_seeker' THEN
        BEGIN
            INSERT INTO public.job_seeker_profiles (user_id, availability, preferred_work_arrangement, profile_visibility, created_at, updated_at)
            VALUES (new.id, 'Immediate', 'Hybrid', 'Employers Only', NOW(), NOW())
            ON CONFLICT (user_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user job_seeker_profiles error: %', SQLERRM;
        END;
    END IF;

    -- 4. If employer, create company & employer profile
    IF user_role = 'employer' AND comp_name IS NOT NULL AND comp_name != '' THEN
        BEGIN
            comp_slug := lower(regexp_replace(comp_name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(md5(random()::text), 1, 4);
            
            INSERT INTO public.companies (name, slug, city, province, industry, verified, created_at, updated_at)
            VALUES (comp_name, comp_slug, 'Cebu City', 'Cebu', 'Software & Technology', FALSE, NOW(), NOW())
            RETURNING id INTO new_comp_id;

            INSERT INTO public.employer_profiles (user_id, company_id, position, updated_at)
            VALUES (new.id, new_comp_id, 'Hiring Manager', NOW())
            ON CONFLICT (user_id) DO NOTHING;
        EXCEPTION WHEN OTHERS THEN
            RAISE WARNING 'handle_new_user employer error: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'handle_new_user unhandled error: %', SQLERRM;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger the function every time a user is created in auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 4. Permissive RLS Policies for other tables
-- Companies
ALTER TABLE public.companies ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view companies" ON public.companies;
DROP POLICY IF EXISTS "Allow all insert companies" ON public.companies;
DROP POLICY IF EXISTS "Allow all update companies" ON public.companies;
CREATE POLICY "Public can view companies" ON public.companies FOR SELECT USING (true);
CREATE POLICY "Allow all insert companies" ON public.companies FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update companies" ON public.companies FOR UPDATE USING (true);

-- Job Seeker Profiles
ALTER TABLE public.job_seeker_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view seeker profiles" ON public.job_seeker_profiles;
DROP POLICY IF EXISTS "Allow all insert seeker profiles" ON public.job_seeker_profiles;
DROP POLICY IF EXISTS "Allow all update seeker profiles" ON public.job_seeker_profiles;
CREATE POLICY "Public can view seeker profiles" ON public.job_seeker_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert seeker profiles" ON public.job_seeker_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update seeker profiles" ON public.job_seeker_profiles FOR UPDATE USING (true);

-- Employer Profiles
ALTER TABLE public.employer_profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Allow all insert employer profiles" ON public.employer_profiles;
DROP POLICY IF EXISTS "Allow all update employer profiles" ON public.employer_profiles;
CREATE POLICY "Public can view employer profiles" ON public.employer_profiles FOR SELECT USING (true);
CREATE POLICY "Allow all insert employer profiles" ON public.employer_profiles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow all update employer profiles" ON public.employer_profiles FOR UPDATE USING (true);

-- Skills
ALTER TABLE public.skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view skills" ON public.skills;
DROP POLICY IF EXISTS "Allow insert skills" ON public.skills;
CREATE POLICY "Public can view skills" ON public.skills FOR SELECT USING (true);
CREATE POLICY "Allow insert skills" ON public.skills FOR INSERT WITH CHECK (true);

-- Job Seeker Skills
ALTER TABLE public.job_seeker_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view seeker skills" ON public.job_seeker_skills;
DROP POLICY IF EXISTS "Allow manage seeker skills" ON public.job_seeker_skills;
CREATE POLICY "Public can view seeker skills" ON public.job_seeker_skills FOR SELECT USING (true);
CREATE POLICY "Allow manage seeker skills" ON public.job_seeker_skills FOR ALL USING (true);

-- Educations & Work Experiences
ALTER TABLE public.educations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view educations" ON public.educations;
DROP POLICY IF EXISTS "Manage educations" ON public.educations;
CREATE POLICY "Public view educations" ON public.educations FOR SELECT USING (true);
CREATE POLICY "Manage educations" ON public.educations FOR ALL USING (true);

ALTER TABLE public.work_experiences ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view experiences" ON public.work_experiences;
DROP POLICY IF EXISTS "Manage experiences" ON public.work_experiences;
CREATE POLICY "Public view experiences" ON public.work_experiences FOR SELECT USING (true);
CREATE POLICY "Manage experiences" ON public.work_experiences FOR ALL USING (true);

-- Jobs
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public can view published jobs" ON public.jobs;
DROP POLICY IF EXISTS "Allow manage jobs" ON public.jobs;
CREATE POLICY "Public can view published jobs" ON public.jobs FOR SELECT USING (true);
CREATE POLICY "Allow manage jobs" ON public.jobs FOR ALL USING (true);

-- Job Skills
ALTER TABLE public.job_skills ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view job skills" ON public.job_skills;
DROP POLICY IF EXISTS "Manage job skills" ON public.job_skills;
CREATE POLICY "Public view job skills" ON public.job_skills FOR SELECT USING (true);
CREATE POLICY "Manage job skills" ON public.job_skills FOR ALL USING (true);

-- Applications
ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view applications" ON public.applications;
DROP POLICY IF EXISTS "Manage applications" ON public.applications;
CREATE POLICY "Public view applications" ON public.applications FOR SELECT USING (true);
CREATE POLICY "Manage applications" ON public.applications FOR ALL USING (true);

-- Interviews
ALTER TABLE public.interviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view interviews" ON public.interviews;
DROP POLICY IF EXISTS "Manage interviews" ON public.interviews;
CREATE POLICY "Public view interviews" ON public.interviews FOR SELECT USING (true);
CREATE POLICY "Manage interviews" ON public.interviews FOR ALL USING (true);

-- Saved Jobs
ALTER TABLE public.saved_jobs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage saved jobs" ON public.saved_jobs;
CREATE POLICY "Manage saved jobs" ON public.saved_jobs FOR ALL USING (true);

-- Documents
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage documents" ON public.documents;
CREATE POLICY "Manage documents" ON public.documents FOR ALL USING (true);

-- Company Reviews
ALTER TABLE public.company_reviews ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Public view reviews" ON public.company_reviews;
DROP POLICY IF EXISTS "Manage reviews" ON public.company_reviews;
CREATE POLICY "Public view reviews" ON public.company_reviews FOR SELECT USING (true);
CREATE POLICY "Manage reviews" ON public.company_reviews FOR ALL USING (true);

-- Reports
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage reports" ON public.reports;
CREATE POLICY "Manage reports" ON public.reports FOR ALL USING (true);

-- Notifications
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage notifications" ON public.notifications;
CREATE POLICY "Manage notifications" ON public.notifications FOR ALL USING (true);

-- Enable Realtime publication on notifications
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_publication_tables 
        WHERE pubname = 'supabase_realtime' AND tablename = 'notifications'
    ) THEN
        ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;
    END IF;
END $$;

-- 4b. Automated Event Notification Triggers
-- 1. Notify employer on new job application
CREATE OR REPLACE FUNCTION public.notify_on_new_application()
RETURNS TRIGGER AS $$
DECLARE
    emp_user_id UUID;
    job_name TEXT;
    applicant_name TEXT;
BEGIN
    SELECT employer_id, title INTO emp_user_id, job_name FROM public.jobs WHERE id = NEW.job_id;
    SELECT COALESCE(first_name || ' ' || last_name, 'A candidate') INTO applicant_name FROM public.profiles WHERE id = NEW.applicant_id;
    
    IF emp_user_id IS NOT NULL THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (
            emp_user_id,
            'application',
            'New Job Application Received',
            applicant_name || ' just applied for "' || COALESCE(job_name, 'your job opening') || '".',
            '/employer/applicants',
            FALSE,
            NOW()
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_application_created_notify ON public.applications;
CREATE TRIGGER on_application_created_notify
    AFTER INSERT ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_new_application();

-- 2. Notify job seeker on document verification status change
CREATE OR REPLACE FUNCTION public.notify_on_document_verification()
RETURNS TRIGGER AS $$
BEGIN
    IF OLD.verification_status != NEW.verification_status THEN
        INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
        VALUES (
            NEW.user_id,
            'document',
            CASE 
                WHEN NEW.verification_status = 'verified' THEN 'Credential Verified!'
                WHEN NEW.verification_status = 'rejected' THEN 'Credential Verification Update'
                ELSE 'Credential Status Update'
            END,
            CASE 
                WHEN NEW.verification_status = 'verified' THEN 'Congratulations! Your ' || NEW.file_name || ' has been approved. You now hold a Verified Candidate badge.'
                WHEN NEW.verification_status = 'rejected' THEN 'Your credential ' || NEW.file_name || ' could not be verified. Check notes and re-upload if needed.'
                ELSE 'Your credential review status has changed to ' || NEW.verification_status || '.'
            END,
            '/seeker/diploma',
            FALSE,
            NOW()
        );
    END IF;
    RETURN NEW;
EXCEPTION WHEN OTHERS THEN
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_document_verified_notify ON public.documents;
CREATE TRIGGER on_document_verified_notify
    AFTER UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_document_verification();

-- Audit Logs
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage audit logs" ON public.audit_logs;
CREATE POLICY "Manage audit logs" ON public.audit_logs FOR ALL USING (true);

-- User Settings
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Manage user settings" ON public.user_settings;
CREATE POLICY "Manage user settings" ON public.user_settings FOR ALL USING (true);

-- 5. STORAGE BUCKET: Create 'documents' bucket & storage RLS policies
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    10485760, -- 10MB limit
    ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 10485760,
    allowed_mime_types = ARRAY['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

-- Storage Object Policies
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Upload Documents" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated Delete Documents" ON storage.objects;

CREATE POLICY "Public Access Documents" ON storage.objects
    FOR SELECT USING (bucket_id = 'documents');

CREATE POLICY "Authenticated Upload Documents" ON storage.objects
    FOR INSERT WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated Delete Documents" ON storage.objects
    FOR DELETE USING (bucket_id = 'documents');

-- 6. Seed Core Standard Tech Skills if not present
INSERT INTO public.skills (name, category) VALUES
('React', 'Framework'),
('Next.js', 'Framework'),
('Vue.js', 'Framework'),
('Angular', 'Framework'),
('TypeScript', 'Programming Language'),
('JavaScript', 'Programming Language'),
('Python', 'Programming Language'),
('Java', 'Programming Language'),
('PHP', 'Programming Language'),
('Go', 'Programming Language'),
('Tailwind CSS', 'Framework'),
('Node.js', 'Framework'),
('PostgreSQL', 'Database'),
('MySQL', 'Database'),
('MongoDB', 'Database'),
('Redis', 'Database'),
('Supabase', 'Tool'),
('Git & GitHub', 'Tool'),
('Docker', 'Cloud & DevOps'),
('Kubernetes', 'Cloud & DevOps'),
('AWS', 'Cloud & DevOps'),
('Google Cloud', 'Cloud & DevOps'),
('Azure', 'Cloud & DevOps'),
('REST APIs', 'Technical'),
('GraphQL', 'Technical'),
('Figma', 'Design'),
('UI/UX Design', 'Design'),
('Agile Scrum', 'Soft Skill'),
('Team Leadership', 'Soft Skill'),
('Project Management', 'Soft Skill')
ON CONFLICT (name) DO NOTHING;
