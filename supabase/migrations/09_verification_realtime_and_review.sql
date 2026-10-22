-- Keep company verification reviews atomic and notify administrators in realtime.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'company_verifications'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.company_verifications;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'companies'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.companies;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'job_seeker_profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.job_seeker_profiles;
  END IF;
END $$;

-- Application mutations must go through the server routes that calculate matches
-- and enforce hire-state rules; the service role remains able to perform them.
DROP POLICY IF EXISTS "applications_insert" ON public.applications;
CREATE POLICY "applications_insert" ON public.applications
  FOR INSERT WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "applications_update" ON public.applications;
CREATE POLICY "applications_update" ON public.applications
  FOR UPDATE USING (public.is_admin())
  WITH CHECK (public.is_admin());

CREATE OR REPLACE FUNCTION public.accept_job_offer(p_application_id UUID)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  applicant_id UUID := auth.uid();
  application_owner UUID;
  application_status TEXT;
  existing_hire UUID;
  employment_state TEXT;
  now_at TIMESTAMPTZ := NOW();
BEGIN
  IF applicant_id IS NULL THEN
    RAISE EXCEPTION 'Sign in required.';
  END IF;

  SELECT a.applicant_id, a.status
  INTO application_owner, application_status
  FROM public.applications AS a
  WHERE a.id = p_application_id
  FOR UPDATE;

  IF application_owner IS DISTINCT FROM applicant_id THEN
    RAISE EXCEPTION 'Offer not found.';
  END IF;
  IF application_status <> 'offer' THEN
    RAISE EXCEPTION 'This application does not have an offer to accept.';
  END IF;

  SELECT jsp.hired_application_id, jsp.employment_status
  INTO existing_hire, employment_state
  FROM public.job_seeker_profiles AS jsp
  WHERE jsp.user_id = applicant_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Candidate profile is missing.';
  END IF;

  IF (employment_state = 'hired' AND existing_hire IS DISTINCT FROM p_application_id)
     OR EXISTS (
       SELECT 1
       FROM public.applications AS other_application
       WHERE other_application.applicant_id = applicant_id
         AND other_application.status = 'hired'
         AND other_application.id <> p_application_id
     ) THEN
    RAISE EXCEPTION 'You already have a confirmed hire on WorkMatch.';
  END IF;

  UPDATE public.applications
  SET status = 'hired',
      offer_responded_at = now_at,
      hire_confirmed_at = now_at,
      updated_at = now_at
  WHERE id = p_application_id;

  UPDATE public.job_seeker_profiles
  SET employment_status = 'hired',
      hired_application_id = p_application_id,
      availability = '1 Month Notice',
      updated_at = now_at
  WHERE user_id = applicant_id;

  RETURN p_application_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.accept_job_offer(UUID) TO authenticated;

CREATE OR REPLACE FUNCTION public.review_company_verification(
  p_verification_id UUID,
  p_expected_company_id UUID,
  p_status TEXT,
  p_notes TEXT
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  reviewer_id UUID := auth.uid();
  target_company_id UUID;
  now_at TIMESTAMPTZ := NOW();
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Administrator access is required.';
  END IF;

  IF p_status NOT IN ('approved', 'rejected', 'resubmission_required') THEN
    RAISE EXCEPTION 'Invalid company verification status.';
  END IF;

  SELECT company_id
  INTO target_company_id
  FROM public.company_verifications
  WHERE id = p_verification_id
  FOR UPDATE;

  IF target_company_id IS NULL THEN
    RAISE EXCEPTION 'Company verification submission not found.';
  END IF;

  IF target_company_id <> p_expected_company_id THEN
    RAISE EXCEPTION 'Submission does not belong to the specified company.';
  END IF;

  UPDATE public.company_verifications
  SET status = p_status,
      admin_notes = NULLIF(p_notes, ''),
      reviewed_by = reviewer_id,
      reviewed_at = now_at,
      updated_at = now_at
  WHERE id = p_verification_id;

  UPDATE public.companies
  SET verification_status = p_status,
      verification_notes = NULLIF(p_notes, ''),
      verified = (p_status = 'approved'),
      verified_at = CASE WHEN p_status = 'approved' THEN now_at ELSE NULL END,
      verified_by = reviewer_id,
      updated_at = now_at
  WHERE id = target_company_id;

  INSERT INTO public.audit_logs (user_id, action, entity_type, entity_id, metadata, created_at)
  VALUES (
    reviewer_id,
    'Company verification ' || p_status,
    'company',
    target_company_id,
    jsonb_build_object('verificationId', p_verification_id, 'notes', p_notes, 'status', p_status),
    now_at
  );

  RETURN target_company_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.review_company_verification(UUID, UUID, TEXT, TEXT) TO authenticated;

CREATE OR REPLACE FUNCTION public.notify_admins_new_company_verification()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  admin_user RECORD;
BEGIN
  FOR admin_user IN
    SELECT id
    FROM public.profiles
    WHERE role = 'admin' AND status = 'active'
  LOOP
    PERFORM public.create_notification(
      admin_user.id,
      'company_verification',
      'Business permit awaiting review',
      NEW.business_name || ' submitted a business permit for administrator approval.',
      '/admin/companies'
    );
  END LOOP;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS notify_admins_new_company_verification ON public.company_verifications;
CREATE TRIGGER notify_admins_new_company_verification
  AFTER INSERT ON public.company_verifications
  FOR EACH ROW
  WHEN (NEW.status = 'pending')
  EXECUTE FUNCTION public.notify_admins_new_company_verification();
