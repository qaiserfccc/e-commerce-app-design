ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS seo_focus_keywords text[] NOT NULL DEFAULT ARRAY[]::text[];

UPDATE public.store_products AS product
SET seo_focus_keywords = CASE
  WHEN NULLIF(btrim(product.source_payload->'isk_seo'->'fields'->>'focuskw'), '') IS NOT NULL
    THEN ARRAY[btrim(product.source_payload->'isk_seo'->'fields'->>'focuskw')]
  WHEN jsonb_typeof(product.source_payload->'isk_seo'->'fields'->'keywords') = 'array'
    THEN ARRAY(
      SELECT btrim(keyword)
      FROM jsonb_array_elements_text(product.source_payload->'isk_seo'->'fields'->'keywords') AS keyword
      WHERE btrim(keyword) <> ''
      LIMIT 20
    )
  WHEN NULLIF(btrim(product.source_payload->'isk_seo'->'fields'->>'keywords'), '') IS NOT NULL
    THEN ARRAY(
      SELECT btrim(keyword)
      FROM unnest(string_to_array(product.source_payload->'isk_seo'->'fields'->>'keywords', ',')) AS keyword
      WHERE btrim(keyword) <> ''
      LIMIT 20
    )
  ELSE product.seo_focus_keywords
END
WHERE cardinality(product.seo_focus_keywords) = 0
  AND (
    NULLIF(btrim(product.source_payload->'isk_seo'->'fields'->>'focuskw'), '') IS NOT NULL
    OR product.source_payload->'isk_seo'->'fields' ? 'keywords'
  );

UPDATE public.store_products
SET base_curve = 8.66,
    water_content = '55%',
    updated_at = now()
WHERE base_curve IS DISTINCT FROM 8.66
   OR water_content IS DISTINCT FROM '55%';

UPDATE public.store_product_variants
SET base_curve = 8.66,
    updated_at = now()
WHERE base_curve IS DISTINCT FROM 8.66;

ALTER TABLE public.store_products
  ALTER COLUMN base_curve SET DEFAULT 8.66,
  ALTER COLUMN base_curve SET NOT NULL,
  ALTER COLUMN water_content SET DEFAULT '55%',
  ALTER COLUMN water_content SET NOT NULL,
  DROP CONSTRAINT IF EXISTS store_products_base_curve_fixed_check,
  ADD CONSTRAINT store_products_base_curve_fixed_check CHECK (base_curve = 8.66),
  DROP CONSTRAINT IF EXISTS store_products_water_content_allowed_check,
  ADD CONSTRAINT store_products_water_content_allowed_check
    CHECK (water_content IN ('38%', '40%', '45%', '48%', '50%', '55%', '58%', '60%'));

ALTER TABLE public.store_product_variants
  ALTER COLUMN base_curve SET DEFAULT 8.66,
  ALTER COLUMN base_curve SET NOT NULL,
  DROP CONSTRAINT IF EXISTS store_product_variants_base_curve_fixed_check,
  ADD CONSTRAINT store_product_variants_base_curve_fixed_check CHECK (base_curve = 8.66);
