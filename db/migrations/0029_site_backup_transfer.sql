CREATE TABLE IF NOT EXISTS public.store_site_backup_jobs (
  id uuid PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES public.store_admin_users(id) ON DELETE CASCADE,
  operation text NOT NULL CHECK (operation IN ('export', 'restore')),
  manifest jsonb NOT NULL DEFAULT '[]'::jsonb CHECK (jsonb_typeof(manifest) = 'array'),
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL
);

CREATE INDEX IF NOT EXISTS store_site_backup_jobs_user_expiry_idx
  ON public.store_site_backup_jobs (user_id, expires_at);

CREATE TABLE IF NOT EXISTS public.store_site_backup_rows (
  job_id uuid NOT NULL REFERENCES public.store_site_backup_jobs(id) ON DELETE CASCADE,
  table_name text NOT NULL,
  row_index bigint NOT NULL CHECK (row_index >= 0),
  row_data jsonb NOT NULL CHECK (jsonb_typeof(row_data) = 'object'),
  media_content bytea,
  PRIMARY KEY (job_id, table_name, row_index)
);
