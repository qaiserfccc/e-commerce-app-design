CREATE TABLE IF NOT EXISTS public.store_secrets (
  name text PRIMARY KEY,
  value text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.store_secrets ENABLE ROW LEVEL SECURITY;

-- The signing secret row is created lazily by lib/auth/secret.ts on first use.
