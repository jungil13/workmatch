-- ==============================================================================
-- WORKMATCH MIGRATION 03: Saved Jobs, Reviews, Resumes & Storage Enhancements
-- ==============================================================================

-- 1. Add saved_at fallback column to saved_jobs for backward compatibility
ALTER TABLE public.saved_jobs 
    ADD COLUMN IF NOT EXISTS saved_at TIMESTAMPTZ DEFAULT NOW();

-- 2. Add helpful_count to company_reviews for backward compatibility
ALTER TABLE public.company_reviews 
    ADD COLUMN IF NOT EXISTS helpful_count INTEGER DEFAULT 0;

-- 3. Add start_year and end_year columns to educations if needed
ALTER TABLE public.educations
    ADD COLUMN IF NOT EXISTS start_year TEXT,
    ADD COLUMN IF NOT EXISTS end_year TEXT;

-- 4. Add recruiter_notes to applications if not present
ALTER TABLE public.applications
    ADD COLUMN IF NOT EXISTS recruiter_notes TEXT;

-- 5. Update Storage Bucket 'documents' to accept all resume formats (PDF, DOC, DOCX, JPEG, JPG, PNG, WEBP)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
    'documents',
    'documents',
    true,
    15728640, -- 15MB limit
    ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/octet-stream'
    ]
)
ON CONFLICT (id) DO UPDATE
SET public = true,
    file_size_limit = 15728640,
    allowed_mime_types = ARRAY[
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'image/jpeg',
        'image/jpg',
        'image/png',
        'image/webp',
        'application/octet-stream'
    ];

-- 6. Update handle_new_user() trigger to save OAuth avatar_url
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    user_role TEXT;
    first_n TEXT;
    last_n TEXT;
    comp_name TEXT;
    new_comp_id UUID;
    comp_slug TEXT;
    user_avatar TEXT;
BEGIN
    user_role := COALESCE(new.raw_user_meta_data->>'role', 'job_seeker');
    first_n := COALESCE(
        new.raw_user_meta_data->>'first_name',
        split_part(new.raw_user_meta_data->>'full_name', ' ', 1),
        split_part(new.raw_user_meta_data->>'name', ' ', 1),
        split_part(new.email, '@', 1)
    );
    last_n := COALESCE(
        new.raw_user_meta_data->>'last_name',
        substr(new.raw_user_meta_data->>'full_name', length(first_n) + 2),
        ''
    );
    user_avatar := COALESCE(
        new.raw_user_meta_data->>'avatar_url',
        new.raw_user_meta_data->>'picture',
        NULL
    );
    comp_name := new.raw_user_meta_data->>'company_name';

    -- 1. Insert or update public.profiles
    BEGIN
        INSERT INTO public.profiles (id, email, first_name, last_name, avatar_url, role, status, created_at, updated_at)
        VALUES (new.id, new.email, first_n, last_n, user_avatar, user_role, 'active', NOW(), NOW())
        ON CONFLICT (id) DO UPDATE
        SET first_name = COALESCE(EXCLUDED.first_name, public.profiles.first_name),
            last_name = COALESCE(EXCLUDED.last_name, public.profiles.last_name),
            avatar_url = COALESCE(EXCLUDED.avatar_url, public.profiles.avatar_url),
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
