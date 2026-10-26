ALTER TABLE public.store_brands
  ADD COLUMN IF NOT EXISTS logo_url text
  CHECK (
    logo_url IS NULL
    OR logo_url ~ '^https://[a-zA-Z0-9-]+\.public\.blob\.vercel-storage\.com/'
  );

ALTER TABLE public.store_lens_shades ALTER COLUMN hex DROP NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS store_lens_shades_lower_name_no_hex_unique
  ON public.store_lens_shades (lower(name))
  WHERE hex IS NULL;

INSERT INTO public.store_brands (name, slug)
SELECT DISTINCT trim(product.brand),
  trim(both '-' FROM regexp_replace(lower(trim(product.brand)), '[^a-z0-9]+', '-', 'g'))
    || '-' || substr(md5(lower(trim(product.brand))), 1, 8)
FROM public.store_products AS product
WHERE product.brand IS NOT NULL
  AND length(trim(product.brand)) BETWEEN 1 AND 100
ON CONFLICT DO NOTHING;

UPDATE public.store_products AS product
SET brand_id = brand.id
FROM public.store_brands AS brand
WHERE product.brand_id IS NULL AND lower(trim(product.brand)) = lower(brand.name);

WITH RECURSIVE lens_categories AS (
  SELECT id
  FROM public.store_categories
  WHERE parent_id IS NULL AND lower(name) IN ('contact lenses', 'comfort lenses')
  UNION ALL
  SELECT child.id
  FROM public.store_categories AS child
  INNER JOIN lens_categories AS parent ON child.parent_id = parent.id
), lens_products AS (
  SELECT product.id, product.name, product.brand_id
  FROM public.store_products AS product
  INNER JOIN lens_categories AS category ON category.id = product.category_id
  UNION
  SELECT product.id, product.name, product.brand_id
  FROM public.store_product_categories AS product_category
  INNER JOIN lens_categories AS category ON category.id = product_category.category_id
  INNER JOIN public.store_products AS product ON product.id = product_category.product_id
), shade_candidates AS (
  SELECT trim(product.name) AS name, count(*) AS frequency
  FROM lens_products AS product
  WHERE product.brand_id IS NOT NULL
    AND length(trim(product.name)) BETWEEN 1 AND 80
  GROUP BY lower(trim(product.name)), trim(product.name)
), preferred_shades AS (
  SELECT DISTINCT ON (lower(name)) name
  FROM shade_candidates
  ORDER BY lower(name), frequency DESC, name
)
INSERT INTO public.store_lens_shades (name, hex)
SELECT shade.name, NULL
FROM preferred_shades AS shade
WHERE NOT EXISTS (
  SELECT 1
  FROM public.store_lens_shades AS existing
  WHERE lower(existing.name) = lower(shade.name)
)
ON CONFLICT DO NOTHING;

WITH RECURSIVE lens_categories AS (
  SELECT id
  FROM public.store_categories
  WHERE parent_id IS NULL AND lower(name) IN ('contact lenses', 'comfort lenses')
  UNION ALL
  SELECT child.id
  FROM public.store_categories AS child
  INNER JOIN lens_categories AS parent ON child.parent_id = parent.id
), lens_products AS (
  SELECT product.id, product.name, product.brand_id
  FROM public.store_products AS product
  INNER JOIN lens_categories AS category ON category.id = product.category_id
  UNION
  SELECT product.id, product.name, product.brand_id
  FROM public.store_product_categories AS product_category
  INNER JOIN lens_categories AS category ON category.id = product_category.category_id
  INNER JOIN public.store_products AS product ON product.id = product_category.product_id
), shade_matches AS (
  SELECT DISTINCT ON (product.id) product.id AS product_id, shade.id AS shade_id
  FROM lens_products AS product
  INNER JOIN public.store_lens_shades AS shade
    ON lower(trim(product.name)) = lower(shade.name)
  WHERE product.brand_id IS NOT NULL
  ORDER BY product.id, (shade.hex IS NULL), shade.created_at, shade.id
)
UPDATE public.store_products AS product
SET lens_shade_id = shade_match.shade_id
FROM shade_matches AS shade_match
WHERE product.id = shade_match.product_id AND product.lens_shade_id IS NULL;
