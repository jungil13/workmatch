-- ==============================================================================
-- WORKMATCH MIGRATION 08: Verification, matching cache, hiring, RLS, stats
-- Safe additive changes. Does not delete production data.
-- ==============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ── Helper: admin check (used by policies and triggers) ───────────────────────
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
$$;

CREATE OR REPLACE FUNCTION public.current_profile_role()
RETURNS TEXT
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT role FROM public.profiles WHERE id = auth.uid();
$$;

-- ── Companies: verification + official links ──────────────────────────────────
ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS verification_status TEXT NOT NULL DEFAULT 'unverified',
  ADD COLUMN IF NOT EXISTS verification_notes TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS facebook_url TEXT,
  ADD COLUMN IF NOT EXISTS linkedin_url TEXT,
  ADD COLUMN IF NOT EXISTS instagram_url TEXT,
  ADD COLUMN IF NOT EXISTS other_social_url TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'companies_verification_status_check'
  ) THEN
    ALTER TABLE public.companies
      ADD CONSTRAINT companies_verification_status_check
      CHECK (verification_status IN ('unverified', 'pending', 'approved', 'rejected', 'resubmission_required'));
  END IF;
END $$;

UPDATE public.companies
SET verification_status = CASE WHEN verified THEN 'approved' ELSE COALESCE(NULLIF(verification_status, ''), 'unverified') END
WHERE verification_status IS NULL OR (verified = TRUE AND verification_status <> 'approved');

-- ── Company verification submissions ──────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.company_verifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    company_id UUID NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
    submitted_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    business_name TEXT NOT NULL,
    business_address TEXT NOT NULL,
    contact_email TEXT,
    contact_phone TEXT,
    website TEXT,
    facebook_url TEXT,
    linkedin_url TEXT,
    instagram_url TEXT,
    other_social_url TEXT,
    permit_file_path TEXT NOT NULL,
    permit_file_name TEXT NOT NULL,
    permit_mime_type TEXT NOT NULL,
    permit_file_size INTEGER NOT NULL,
    supporting_file_path TEXT,
    supporting_file_name TEXT,
    status TEXT NOT NULL DEFAULT 'pending'
      CHECK (status IN ('pending', 'approved', 'rejected', 'resubmission_required')),
    admin_notes TEXT,
    reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_company_verifications_company ON public.company_verifications(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_company_verifications_status ON public.company_verifications(status);

-- ── Job seeker availability / employment ──────────────────────────────────────
ALTER TABLE public.job_seeker_profiles
  ADD COLUMN IF NOT EXISTS employment_status TEXT NOT NULL DEFAULT 'available',
  ADD COLUMN IF NOT EXISTS hired_application_id UUID REFERENCES public.applications(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS notify_other_employers_on_hire BOOLEAN NOT NULL DEFAULT TRUE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_seeker_profiles_employment_status_check'
  ) THEN
    ALTER TABLE public.job_seeker_profiles
      ADD CONSTRAINT job_seeker_profiles_employment_status_check
      CHECK (employment_status IN ('available', 'not_available', 'hired'));
  END IF;
END $$;

-- ── Applications: expanded lifecycle ──────────────────────────────────────────
ALTER TABLE public.applications
  ADD COLUMN IF NOT EXISTS offer_responded_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS hire_confirmed_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS closed_reason TEXT;

ALTER TABLE public.applications DROP CONSTRAINT IF EXISTS applications_status_check;
ALTER TABLE public.applications
  ADD CONSTRAINT applications_status_check
  CHECK (status IN (
    'applied', 'screening', 'shortlisted', 'interview', 'offer',
    'hired', 'rejected', 'withdrawn', 'closed'
  ));

-- ── Jobs: moderation + expiry support ─────────────────────────────────────────
ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS moderation_status TEXT NOT NULL DEFAULT 'approved';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'jobs_moderation_status_check'
  ) THEN
    ALTER TABLE public.jobs
      ADD CONSTRAINT jobs_moderation_status_check
      CHECK (moderation_status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

-- ── Documents: more types and resubmission ────────────────────────────────────
ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_document_type_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_document_type_check
  CHECK (document_type IN (
    'resume', 'diploma', 'certificate', 'transcript',
    'training_certificate', 'professional_certification', 'other'
  ));

ALTER TABLE public.documents DROP CONSTRAINT IF EXISTS documents_verification_status_check;
ALTER TABLE public.documents
  ADD CONSTRAINT documents_verification_status_check
  CHECK (verification_status IN ('pending', 'verified', 'rejected', 'unverified', 'resubmission_required'));

ALTER TABLE public.documents
  ADD COLUMN IF NOT EXISTS reviewed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL;

-- ── Match result cache ────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.job_match_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    seeker_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
    overall_score NUMERIC NOT NULL,
    tier TEXT NOT NULL,
    factors JSONB NOT NULL DEFAULT '{}'::jsonb,
    why_you_match JSONB NOT NULL DEFAULT '[]'::jsonb,
    growth_areas JSONB NOT NULL DEFAULT '[]'::jsonb,
    matched_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    missing_skills JSONB NOT NULL DEFAULT '[]'::jsonb,
    related_skill_map JSONB NOT NULL DEFAULT '{}'::jsonb,
    profile_hash TEXT,
    job_hash TEXT,
    computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE(seeker_id, job_id)
);

CREATE INDEX IF NOT EXISTS idx_job_match_results_seeker ON public.job_match_results(seeker_id, overall_score DESC);

-- ── Interview practice sessions ───────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.interview_practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    job_id UUID REFERENCES public.jobs(id) ON DELETE SET NULL,
    job_title TEXT NOT NULL,
    job_description TEXT,
    status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'completed', 'abandoned')),
    messages JSONB NOT NULL DEFAULT '[]'::jsonb,
    summary JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_interview_sessions_user ON public.interview_practice_sessions(user_id, created_at DESC);

-- ── AI request log (rate limiting / audit) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.ai_request_log (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    endpoint TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_request_log_user_time ON public.ai_request_log(user_id, created_at DESC);

-- ── Deduped notification helper ───────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.create_notification(
    p_user_id UUID,
    p_type TEXT,
    p_title TEXT,
    p_message TEXT,
    p_link TEXT DEFAULT NULL
) RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    existing_id UUID;
    new_id UUID;
BEGIN
    IF p_user_id IS NULL THEN
        RETURN NULL;
    END IF;

    SELECT id INTO existing_id
    FROM public.notifications
    WHERE user_id = p_user_id
      AND type = p_type
      AND COALESCE(link, '') = COALESCE(p_link, '')
      AND title = p_title
      AND created_at > NOW() - INTERVAL '10 minutes'
    LIMIT 1;

    IF existing_id IS NOT NULL THEN
        RETURN existing_id;
    END IF;

    INSERT INTO public.notifications (user_id, type, title, message, link, is_read, created_at)
    VALUES (p_user_id, p_type, p_title, p_message, p_link, FALSE, NOW())
    RETURNING id INTO new_id;

    RETURN new_id;
END;
$$;

-- ── Protect privileged columns ────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public.protect_privileged_profile_fields()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.role := OLD.role;
        NEW.status := CASE
            WHEN NEW.status IN ('active', 'pending', 'deactivated') AND auth.uid() = NEW.id THEN NEW.status
            ELSE OLD.status
        END;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_privileged_profile_fields ON public.profiles;
CREATE TRIGGER protect_privileged_profile_fields
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.protect_privileged_profile_fields();

CREATE OR REPLACE FUNCTION public.protect_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.verified := OLD.verified;
        NEW.verified_at := OLD.verified_at;
        NEW.verified_by := OLD.verified_by;
        NEW.verification_notes := OLD.verification_notes;
        -- Employers may submit or resubmit for review, never self-approve.
        IF NEW.verification_status IS DISTINCT FROM OLD.verification_status THEN
            IF NOT (
                NEW.verification_status = 'pending'
                AND OLD.verification_status IN ('unverified', 'rejected', 'resubmission_required', 'pending')
            ) THEN
                NEW.verification_status := OLD.verification_status;
            END IF;
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_company_verification ON public.companies;
CREATE TRIGGER protect_company_verification
    BEFORE UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.protect_company_verification();

CREATE OR REPLACE FUNCTION public.protect_document_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF NOT public.is_admin() THEN
        NEW.verification_status := OLD.verification_status;
        NEW.verification_notes := OLD.verification_notes;
        NEW.verified_at := OLD.verified_at;
        NEW.reviewed_by := OLD.reviewed_by;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS protect_document_verification ON public.documents;
CREATE TRIGGER protect_document_verification
    BEFORE UPDATE ON public.documents
    FOR EACH ROW EXECUTE FUNCTION public.protect_document_verification();

-- Sync companies.verified from verification_status when admin updates
CREATE OR REPLACE FUNCTION public.sync_company_verified_flag()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
    NEW.verified := (NEW.verification_status = 'approved');
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS sync_company_verified_flag ON public.companies;
CREATE TRIGGER sync_company_verified_flag
    BEFORE INSERT OR UPDATE OF verification_status ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.sync_company_verified_flag();

-- Notify employer when company verification status changes
CREATE OR REPLACE FUNCTION public.notify_on_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    owner_id UUID;
BEGIN
    IF TG_OP = 'UPDATE' AND OLD.verification_status IS DISTINCT FROM NEW.verification_status THEN
        SELECT user_id INTO owner_id
        FROM public.employer_profiles
        WHERE company_id = NEW.id
        LIMIT 1;

        IF owner_id IS NOT NULL THEN
            PERFORM public.create_notification(
                owner_id,
                'verified',
                CASE NEW.verification_status
                    WHEN 'approved' THEN 'Company verified'
                    WHEN 'rejected' THEN 'Company verification rejected'
                    WHEN 'resubmission_required' THEN 'Company verification needs resubmission'
                    WHEN 'pending' THEN 'Company verification submitted'
                    ELSE 'Company verification update'
                END,
                CASE NEW.verification_status
                    WHEN 'approved' THEN 'An administrator approved your company. The Verified Company badge is now visible on your profile and job postings.'
                    WHEN 'rejected' THEN COALESCE(NEW.verification_notes, 'Your company verification was rejected. You may submit updated documents.')
                    WHEN 'resubmission_required' THEN COALESCE(NEW.verification_notes, 'Please resubmit your business permit and company details.')
                    ELSE 'Your company verification status was updated.'
                END,
                '/employer/profile'
            );
        END IF;
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_company_verification ON public.companies;
CREATE TRIGGER notify_on_company_verification
    AFTER UPDATE ON public.companies
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_company_verification();

-- Notify seeker on application status change
CREATE OR REPLACE FUNCTION public.notify_on_application_status()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    job_title TEXT;
BEGIN
    IF OLD.status IS DISTINCT FROM NEW.status THEN
        SELECT title INTO job_title FROM public.jobs WHERE id = NEW.job_id;
        PERFORM public.create_notification(
            NEW.applicant_id,
            'status_update',
            'Application status updated',
            'Your application for "' || COALESCE(job_title, 'a role') || '" is now: ' || NEW.status || '.',
            '/seeker/applications/' || NEW.id::text
        );

        INSERT INTO public.application_status_history (application_id, from_status, to_status, notes)
        VALUES (NEW.id, OLD.status, NEW.status, NEW.closed_reason);
    END IF;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_on_application_status ON public.applications;
CREATE TRIGGER notify_on_application_status
    AFTER UPDATE OF status ON public.applications
    FOR EACH ROW EXECUTE FUNCTION public.notify_on_application_status();

-- ── Public aggregate stats (exact counts, not page samples) ───────────────────
CREATE OR REPLACE FUNCTION public.get_platform_stats()
RETURNS JSON
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT json_build_object(
    'totalRegisteredUsers', (SELECT COUNT(*) FROM public.profiles),
    'totalJobSeekers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'job_seeker'),
    'totalEmployers', (SELECT COUNT(*) FROM public.profiles WHERE role = 'employer'),
    'activeJobPostings', (
      SELECT COUNT(*) FROM public.jobs
      WHERE status = 'published'
        AND COALESCE(moderation_status, 'approved') = 'approved'
        AND (application_deadline IS NULL OR application_deadline >= CURRENT_DATE)
    ),
    'draftJobs', (SELECT COUNT(*) FROM public.jobs WHERE status = 'draft'),
    'pendingJobs', (SELECT COUNT(*) FROM public.jobs WHERE COALESCE(moderation_status, 'approved') = 'pending'),
    'approvedJobs', (SELECT COUNT(*) FROM public.jobs WHERE COALESCE(moderation_status, 'approved') = 'approved'),
    'rejectedJobs', (SELECT COUNT(*) FROM public.jobs WHERE COALESCE(moderation_status, 'approved') = 'rejected'),
    'closedJobs', (SELECT COUNT(*) FROM public.jobs WHERE status = 'closed'),
    'verifiedCompanies', (SELECT COUNT(*) FROM public.companies WHERE verification_status = 'approved' OR verified = TRUE),
    'pendingCompanyVerifications', (SELECT COUNT(*) FROM public.company_verifications WHERE status = 'pending'),
    'totalCompanies', (SELECT COUNT(*) FROM public.companies),
    'totalApplications', (SELECT COUNT(*) FROM public.applications),
    'successfulMatches', (SELECT COUNT(*) FROM public.applications WHERE status = 'hired'),
    'pendingDocuments', (SELECT COUNT(*) FROM public.documents WHERE verification_status = 'pending'),
    'verifiedDocuments', (SELECT COUNT(*) FROM public.documents WHERE verification_status = 'verified'),
    'pendingReports', (SELECT COUNT(*) FROM public.reports WHERE status = 'pending')
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_platform_stats() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_notification(UUID, TEXT, TEXT, TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

-- ── RLS for new tables ────────────────────────────────────────────────────────
ALTER TABLE public.company_verifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_match_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interview_practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ai_request_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "company_verifications_select" ON public.company_verifications;
CREATE POLICY "company_verifications_select" ON public.company_verifications
  FOR SELECT USING (
    public.is_admin()
    OR submitted_by = auth.uid()
    OR company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "company_verifications_insert" ON public.company_verifications;
CREATE POLICY "company_verifications_insert" ON public.company_verifications
  FOR INSERT WITH CHECK (
    submitted_by = auth.uid()
    AND company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
  );

DROP POLICY IF EXISTS "company_verifications_update" ON public.company_verifications;
CREATE POLICY "company_verifications_update" ON public.company_verifications
  FOR UPDATE USING (public.is_admin() OR submitted_by = auth.uid());

DROP POLICY IF EXISTS "job_match_results_own" ON public.job_match_results;
CREATE POLICY "job_match_results_own" ON public.job_match_results
  FOR ALL USING (seeker_id = auth.uid() OR public.is_admin())
  WITH CHECK (seeker_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "interview_sessions_own" ON public.interview_practice_sessions;
CREATE POLICY "interview_sessions_own" ON public.interview_practice_sessions
  FOR ALL USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "ai_request_log_own" ON public.ai_request_log;
CREATE POLICY "ai_request_log_own" ON public.ai_request_log
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS "ai_request_log_insert" ON public.ai_request_log;
CREATE POLICY "ai_request_log_insert" ON public.ai_request_log
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Tighten notifications: users only see their own
DROP POLICY IF EXISTS "Manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "notifications_select_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_update_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_delete_own" ON public.notifications;
DROP POLICY IF EXISTS "notifications_insert_own" ON public.notifications;

CREATE POLICY "notifications_select_own" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_update_own" ON public.notifications
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_delete_own" ON public.notifications
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY "notifications_insert_own" ON public.notifications
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Documents: owner, admin, or employer reviewing an application that references the document
DROP POLICY IF EXISTS "Manage documents" ON public.documents;
DROP POLICY IF EXISTS "documents_select" ON public.documents;
DROP POLICY IF EXISTS "documents_write_own" ON public.documents;

CREATE POLICY "documents_select" ON public.documents
  FOR SELECT USING (
    user_id = auth.uid()
    OR public.is_admin()
    OR id IN (
      SELECT resume_document_id FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE a.resume_document_id IS NOT NULL
        AND (j.employer_id = auth.uid() OR j.company_id IN (
          SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid()
        ))
    )
    OR user_id IN (
      SELECT applicant_id FROM public.applications a
      JOIN public.jobs j ON j.id = a.job_id
      WHERE j.employer_id = auth.uid()
         OR j.company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "documents_write_own" ON public.documents
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "documents_update_own" ON public.documents;
CREATE POLICY "documents_update_own" ON public.documents
  FOR UPDATE USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "documents_delete_own" ON public.documents;
CREATE POLICY "documents_delete_own" ON public.documents
  FOR DELETE USING (user_id = auth.uid() OR public.is_admin());

-- Applications: applicant, hiring employer, or admin
DROP POLICY IF EXISTS "Public view applications" ON public.applications;
DROP POLICY IF EXISTS "Manage applications" ON public.applications;
DROP POLICY IF EXISTS "applications_select" ON public.applications;
DROP POLICY IF EXISTS "applications_insert" ON public.applications;
DROP POLICY IF EXISTS "applications_update" ON public.applications;
DROP POLICY IF EXISTS "applications_delete" ON public.applications;

CREATE POLICY "applications_select" ON public.applications
  FOR SELECT USING (
    applicant_id = auth.uid()
    OR public.is_admin()
    OR job_id IN (
      SELECT id FROM public.jobs
      WHERE employer_id = auth.uid()
         OR company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "applications_insert" ON public.applications
  FOR INSERT WITH CHECK (applicant_id = auth.uid());

CREATE POLICY "applications_update" ON public.applications
  FOR UPDATE USING (
    applicant_id = auth.uid()
    OR public.is_admin()
    OR job_id IN (
      SELECT id FROM public.jobs
      WHERE employer_id = auth.uid()
         OR company_id IN (SELECT company_id FROM public.employer_profiles WHERE user_id = auth.uid())
    )
  );

CREATE POLICY "applications_delete" ON public.applications
  FOR DELETE USING (applicant_id = auth.uid() OR public.is_admin());

-- Reports: reporter or admin
DROP POLICY IF EXISTS "Manage reports" ON public.reports;
DROP POLICY IF EXISTS "reports_select" ON public.reports;
DROP POLICY IF EXISTS "reports_insert" ON public.reports;
DROP POLICY IF EXISTS "reports_update" ON public.reports;

CREATE POLICY "reports_select" ON public.reports
  FOR SELECT USING (reported_by = auth.uid() OR public.is_admin());
CREATE POLICY "reports_insert" ON public.reports
  FOR INSERT WITH CHECK (reported_by = auth.uid());
CREATE POLICY "reports_update" ON public.reports
  FOR UPDATE USING (public.is_admin());

-- Audit logs: admin read; authenticated insert of own actor id
DROP POLICY IF EXISTS "Manage audit logs" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_select" ON public.audit_logs;
DROP POLICY IF EXISTS "audit_logs_insert" ON public.audit_logs;

CREATE POLICY "audit_logs_select" ON public.audit_logs
  FOR SELECT USING (public.is_admin());
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Private storage bucket for business permits
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'company-documents',
    'company-documents',
    false,
    15728640,
    ARRAY['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET public = false,
    file_size_limit = 15728640;

DROP POLICY IF EXISTS "company_documents_select" ON storage.objects;
DROP POLICY IF EXISTS "company_documents_insert" ON storage.objects;
DROP POLICY IF EXISTS "company_documents_delete" ON storage.objects;

CREATE POLICY "company_documents_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'company-documents'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

CREATE POLICY "company_documents_insert" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'company-documents'
    AND (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "company_documents_delete" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'company-documents'
    AND (
      public.is_admin()
      OR (storage.foldername(name))[1] = auth.uid()::text
    )
  );

-- Keep existing documents bucket usable, but owners/admins can access by folder prefix
DROP POLICY IF EXISTS "Public Access Documents" ON storage.objects;
DROP POLICY IF EXISTS "documents_storage_select" ON storage.objects;
CREATE POLICY "documents_storage_select" ON storage.objects
  FOR SELECT USING (
    bucket_id = 'documents'
    AND (
      public.is_admin()
      OR name LIKE ('%' || auth.uid()::text || '%')
    )
  );

CREATE INDEX IF NOT EXISTS idx_companies_verification_status ON public.companies(verification_status);
CREATE INDEX IF NOT EXISTS idx_jobs_deadline ON public.jobs(application_deadline);
CREATE INDEX IF NOT EXISTS idx_jobs_moderation ON public.jobs(moderation_status);
