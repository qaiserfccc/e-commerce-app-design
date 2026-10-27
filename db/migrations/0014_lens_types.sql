CREATE TABLE IF NOT EXISTS public.store_lens_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  source_category_id integer,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_lens_types_lower_name_unique
  ON public.store_lens_types (lower(name));
CREATE UNIQUE INDEX IF NOT EXISTS store_lens_types_source_category_id_unique
  ON public.store_lens_types (source_category_id)
  WHERE source_category_id IS NOT NULL;

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS lens_type_id uuid
    REFERENCES public.store_lens_types(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS store_products_lens_type_id_idx
  ON public.store_products (lens_type_id);
