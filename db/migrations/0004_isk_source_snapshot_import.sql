ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS source_content_hash text;

CREATE TABLE IF NOT EXISTS public.store_product_import_runs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  next_page integer NOT NULL DEFAULT 1 CHECK (next_page > 0),
  imported_count integer NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.store_product_import_items (
  run_id uuid NOT NULL REFERENCES public.store_product_import_runs(id) ON DELETE CASCADE,
  source_product_id integer NOT NULL CHECK (source_product_id > 0),
  slug text NOT NULL,
  payload jsonb NOT NULL,
  PRIMARY KEY (run_id, source_product_id),
  UNIQUE (run_id, slug)
);

CREATE INDEX IF NOT EXISTS store_product_import_runs_updated_at_idx
  ON public.store_product_import_runs (updated_at);
