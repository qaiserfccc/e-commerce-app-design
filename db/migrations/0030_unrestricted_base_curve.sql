ALTER TABLE public.store_products
  ALTER COLUMN base_curve TYPE numeric USING base_curve::numeric,
  ALTER COLUMN base_curve SET DEFAULT 8.66,
  DROP CONSTRAINT IF EXISTS store_products_base_curve_fixed_check;

ALTER TABLE public.store_product_variants
  ALTER COLUMN base_curve TYPE numeric USING base_curve::numeric,
  ALTER COLUMN base_curve SET DEFAULT 8.66,
  DROP CONSTRAINT IF EXISTS store_product_variants_base_curve_fixed_check;
