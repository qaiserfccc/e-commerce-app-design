ALTER TABLE public.store_categories
  ADD COLUMN IF NOT EXISTS source_category_id integer,
  ADD COLUMN IF NOT EXISTS source_image_url text;
CREATE UNIQUE INDEX IF NOT EXISTS store_categories_source_category_id_unique
  ON public.store_categories (source_category_id);

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS source_product_id integer,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_payload jsonb,
  ADD COLUMN IF NOT EXISTS source_content_hash text,
  ADD COLUMN IF NOT EXISTS source_image_url text;
CREATE UNIQUE INDEX IF NOT EXISTS store_products_source_product_id_unique
  ON public.store_products (source_product_id);

ALTER TABLE public.store_lens_shades
  ADD COLUMN IF NOT EXISTS image_url text
    CHECK (image_url IS NULL OR image_url ~ '^https://[a-zA-Z0-9-]+\.public\.blob\.vercel-storage\.com/'),
  ADD COLUMN IF NOT EXISTS source_image_url text;
