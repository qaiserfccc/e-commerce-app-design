-- Nested category tree and a category-bound product catalog. Existing products are removed on purpose.
CREATE TABLE IF NOT EXISTS public.store_categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_id uuid REFERENCES public.store_categories(id) ON DELETE RESTRICT,
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 120),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_url text CHECK (image_url IS NULL OR image_url ~ '^https://'),
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  show_in_menu boolean NOT NULL DEFAULT true,
  seo_title text,
  seo_description text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (parent_id IS NULL OR parent_id <> id)
);
CREATE INDEX IF NOT EXISTS store_categories_parent_idx ON public.store_categories (parent_id, sort_order);

DELETE FROM public.store_product_assets;
DELETE FROM public.store_product_variants;
DELETE FROM public.store_products;
DROP TABLE IF EXISTS public.store_product_import_items;
DROP TABLE IF EXISTS public.store_product_import_runs;
DROP TABLE IF EXISTS public.store_product_categories;

DROP INDEX IF EXISTS public.store_products_source_product_id_unique;
ALTER TABLE public.store_products
  DROP COLUMN IF EXISTS category,
  DROP COLUMN IF EXISTS source_product_id,
  DROP COLUMN IF EXISTS source_url,
  DROP COLUMN IF EXISTS source_image_url,
  DROP COLUMN IF EXISTS source_payload,
  DROP COLUMN IF EXISTS source_content_hash,
  ADD COLUMN IF NOT EXISTS category_id uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE RESTRICT,
  ADD COLUMN IF NOT EXISTS brand text,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS short_description text,
  ADD COLUMN IF NOT EXISTS compare_at_price numeric(12,2) CHECK (compare_at_price IS NULL OR compare_at_price >= 0),
  ADD COLUMN IF NOT EXISTS colors jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS diameter_mm numeric(4,2),
  ADD COLUMN IF NOT EXISTS base_curve numeric(4,2),
  ADD COLUMN IF NOT EXISTS water_content text,
  ADD COLUMN IF NOT EXISTS material text,
  ADD COLUMN IF NOT EXISTS wear_duration text,
  ADD COLUMN IF NOT EXISTS pack_contents text,
  ADD COLUMN IF NOT EXISTS power_type text,
  ADD COLUMN IF NOT EXISTS power_range text,
  ADD COLUMN IF NOT EXISTS uv_protection boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS specs jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS usage_instructions text,
  ADD COLUMN IF NOT EXISTS is_featured boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS seo_title text,
  ADD COLUMN IF NOT EXISTS seo_description text;
CREATE INDEX IF NOT EXISTS store_products_category_idx ON public.store_products (category_id, status);
CREATE UNIQUE INDEX IF NOT EXISTS store_products_sku_unique ON public.store_products (sku) WHERE sku IS NOT NULL;

CREATE TABLE IF NOT EXISTS public.store_product_reviews (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  author text NOT NULL CHECK (length(author) BETWEEN 1 AND 80),
  rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title text CHECK (title IS NULL OR length(title) <= 120),
  body text NOT NULL CHECK (length(body) BETWEEN 1 AND 2000),
  is_approved boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_product_reviews_product_idx ON public.store_product_reviews (product_id, is_approved, created_at DESC);

CREATE TABLE IF NOT EXISTS public.store_product_relations (
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  related_product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  sort_order integer NOT NULL DEFAULT 0,
  PRIMARY KEY (product_id, related_product_id),
  CHECK (product_id <> related_product_id)
);

ALTER TABLE public.store_settings DROP CONSTRAINT IF EXISTS store_settings_key_check;
ALTER TABLE public.store_settings ADD CONSTRAINT store_settings_key_check
  CHECK (key IN ('announcements', 'contact', 'headings', 'seo_sections', 'footer', 'product_page'));
