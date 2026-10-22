CREATE OR REPLACE FUNCTION public.enforce_verified_company_for_job_publication()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_is_verified BOOLEAN;
BEGIN
  IF NEW.status <> 'published' OR public.is_admin() THEN
    RETURN NEW;
  END IF;

  SELECT (
    c.verification_status = 'approved'
    OR (c.verification_status IS NULL AND c.verified = TRUE)
  )
  INTO company_is_verified
  FROM public.companies AS c
  WHERE c.id = NEW.company_id;

  IF COALESCE(company_is_verified, FALSE) = FALSE THEN
    RAISE EXCEPTION 'An approved business permit is required before publishing jobs.'
      USING ERRCODE = '23514';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS require_verified_company_to_publish_jobs ON public.jobs;
CREATE TRIGGER require_verified_company_to_publish_jobs
  BEFORE INSERT OR UPDATE OF status, company_id ON public.jobs
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_verified_company_for_job_publication();
