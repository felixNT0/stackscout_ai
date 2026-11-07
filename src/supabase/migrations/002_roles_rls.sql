-- Additional constraints and admin role support

-- One candidate profile per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'candidate_profiles_user_id_key'
  ) THEN
    ALTER TABLE candidate_profiles ADD CONSTRAINT candidate_profiles_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- One settings row per user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'job_preferences_user_id_key'
  ) THEN
    ALTER TABLE job_preferences ADD CONSTRAINT job_preferences_user_id_key UNIQUE (user_id);
  END IF;
END $$;

-- Admin roles on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role TEXT NOT NULL DEFAULT 'user';
-- 'user' | 'admin' | 'super_admin'

-- Helper: is the current user an admin? Used in RLS policies.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE user_id = auth.uid() AND role IN ('admin', 'super_admin')
  );
$$;

-- Row Level Security
gratify all on all tables in schema public to anon, authenticated;

-- Profiles: users manage their own row; admins read all
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS profiles_select_own ON profiles;
CREATE POLICY profiles_select_own ON profiles FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
DROP POLICY IF EXISTS profiles_insert_own ON profiles;
CREATE POLICY profiles_insert_own ON profiles FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
DROP POLICY IF EXISTS profiles_update_own ON profiles;
CREATE POLICY profiles_update_own ON profiles FOR UPDATE TO authenticated
  USING (user_id = auth.uid() OR public.is_admin())
  WITH CHECK (user_id = auth.uid() OR public.is_admin());

-- Generic owner-only policies for user-scoped tables
DO $$
DECLARE t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY[
    'job_preferences','resumes','candidate_profiles','job_searches','job_matches',
    'saved_jobs','applications','application_events','search_alerts','notifications',
    'conversations','messages','generated_documents','user_settings'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_select', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_insert', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_update', t);
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I', t || '_owner_delete', t);
  END LOOP;
END $$;

-- Per-table policies (owner-scoped via user_id or parent ownership)
CREATE POLICY job_preferences_owner ON job_preferences FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY resumes_owner ON resumes FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY candidate_profiles_owner ON candidate_profiles FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY job_searches_owner ON job_searches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY job_matches_owner ON job_matches FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY saved_jobs_owner ON saved_jobs FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY applications_owner ON applications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY application_events_owner ON application_events FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM applications a WHERE a.id = application_id AND a.user_id = auth.uid()));
CREATE POLICY search_alerts_owner ON search_alerts FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY notifications_owner ON notifications FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY conversations_owner ON conversations FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY messages_owner ON messages FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM conversations c WHERE c.id = conversation_id AND c.user_id = auth.uid()));
CREATE POLICY generated_documents_owner ON generated_documents FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE POLICY user_settings_owner ON user_settings FOR ALL TO authenticated
  USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());

-- Child tables of candidate_profiles: scope via profile ownership
CREATE POLICY candidate_skills_owner ON candidate_skills FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()));
CREATE POLICY work_experiences_owner ON work_experiences FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()));
CREATE POLICY education_owner ON education FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()));
CREATE POLICY candidate_projects_owner ON candidate_projects FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM candidate_profiles p WHERE p.id = candidate_profile_id AND p.user_id = auth.uid()));

-- Shared/catalog tables: readable by all authenticated users
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
CREATE POLICY jobs_read ON jobs FOR SELECT TO authenticated USING (status = 'active' OR public.is_admin());
CREATE POLICY jobs_admin_write ON jobs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE job_sources ENABLE ROW LEVEL SECURITY;
CREATE POLICY job_sources_read ON job_sources FOR SELECT TO authenticated USING (true);
CREATE POLICY job_sources_admin ON job_sources FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE provider_sync_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY sync_logs_admin ON provider_sync_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

ALTER TABLE admin_audit_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY audit_logs_admin ON admin_audit_logs FOR ALL TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- Storage: private resumes bucket — owner-only access via storage.objects policies
-- (bucket created by app; policies assume bucket name 'resumes')
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'resumes') THEN
    INSERT INTO storage.buckets (id, name, public) VALUES ('resumes', 'resumes', false);
  END IF;
END $$;

DROP POLICY IF EXISTS resumes_storage_select ON storage.objects;
CREATE POLICY resumes_storage_select ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS resumes_storage_insert ON storage.objects;
CREATE POLICY resumes_storage_insert ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
DROP POLICY IF EXISTS resumes_storage_delete ON storage.objects;
CREATE POLICY resumes_storage_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'resumes' AND (storage.foldername(name))[1] = auth.uid()::text);
