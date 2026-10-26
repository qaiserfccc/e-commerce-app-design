CREATE TABLE IF NOT EXISTS public.store_brands (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS store_brands_lower_name_unique ON public.store_brands (lower(name));

CREATE TABLE IF NOT EXISTS public.store_lens_shades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 80),
  hex text NOT NULL CHECK (hex ~ '^#[0-9a-fA-F]{6}$'),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS store_lens_shades_lower_name_hex_unique
  ON public.store_lens_shades (lower(name), hex);

ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS brand_id uuid REFERENCES public.store_brands(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS lens_shade_id uuid REFERENCES public.store_lens_shades(id) ON DELETE SET NULL;

INSERT INTO public.store_brands (name, slug)
SELECT DISTINCT trim(brand),
  trim(both '-' FROM regexp_replace(lower(trim(brand)), '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(md5(lower(trim(brand))), 1, 8)
FROM public.store_products
WHERE brand IS NOT NULL
  AND length(trim(brand)) BETWEEN 1 AND 100
ON CONFLICT DO NOTHING;

UPDATE public.store_products AS product
SET brand_id = brand.id
FROM public.store_brands AS brand
WHERE product.brand_id IS NULL AND lower(trim(product.brand)) = lower(brand.name);

INSERT INTO public.store_lens_shades (name, hex)
SELECT DISTINCT
  left(trim(color->>'name'), 80),
  CASE WHEN color->>'hex' ~ '^#[0-9a-fA-F]{6}$' THEN lower(color->>'hex') ELSE '#999999' END
FROM public.store_products AS product
CROSS JOIN LATERAL jsonb_array_elements(
  CASE WHEN jsonb_typeof(product.colors) = 'array' THEN product.colors ELSE '[]'::jsonb END
) AS entries(color)
WHERE length(trim(coalesce(color->>'name', ''))) BETWEEN 1 AND 80
ON CONFLICT DO NOTHING;

WITH ranked_shades AS (
  SELECT product.id AS product_id,
    left(trim(color->>'name'), 80) AS name,
    CASE WHEN color->>'hex' ~ '^#[0-9a-fA-F]{6}$' THEN lower(color->>'hex') ELSE '#999999' END AS hex,
    row_number() OVER (PARTITION BY product.id ORDER BY ordinal) AS position
  FROM public.store_products AS product
  CROSS JOIN LATERAL jsonb_array_elements(
    CASE WHEN jsonb_typeof(product.colors) = 'array' THEN product.colors ELSE '[]'::jsonb END
  ) WITH ORDINALITY AS entries(color, ordinal)
  WHERE length(trim(coalesce(color->>'name', ''))) BETWEEN 1 AND 80
), first_shades AS (
  SELECT product_id, name, hex FROM ranked_shades WHERE position = 1
)
UPDATE public.store_products AS product
SET lens_shade_id = shade.id
FROM first_shades
JOIN public.store_lens_shades AS shade
  ON lower(shade.name) = lower(first_shades.name) AND shade.hex = first_shades.hex
WHERE product.id = first_shades.product_id AND product.lens_shade_id IS NULL;

CREATE TABLE IF NOT EXISTS public.store_product_categories (
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  category_id uuid NOT NULL REFERENCES public.store_categories(id) ON DELETE RESTRICT,
  PRIMARY KEY (product_id, category_id)
);
CREATE INDEX IF NOT EXISTS store_product_categories_category_idx
  ON public.store_product_categories (category_id, product_id);

INSERT INTO public.store_product_categories (product_id, category_id)
SELECT id, category_id FROM public.store_products
ON CONFLICT DO NOTHING;

CREATE TABLE IF NOT EXISTS public.store_error_logs (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  source text NOT NULL CHECK (length(source) <= 120),
  error_name text NOT NULL CHECK (length(error_name) <= 200),
  message text NOT NULL CHECK (length(message) <= 4000),
  stack text CHECK (stack IS NULL OR length(stack) <= 12000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS store_error_logs_created_at_idx ON public.store_error_logs (created_at);
