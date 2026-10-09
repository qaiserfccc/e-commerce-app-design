-- ISK Lenses catalog: trace imported products, model contact-lens variants, and support image/video galleries.
ALTER TABLE public.store_products
  ADD COLUMN IF NOT EXISTS source_product_id integer,
  ADD COLUMN IF NOT EXISTS source_url text,
  ADD COLUMN IF NOT EXISTS source_image_url text;
ALTER TABLE public.store_products ALTER COLUMN currency SET DEFAULT 'PKR';

CREATE OR REPLACE FUNCTION public.set_store_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS store_products_updated_at ON public.store_products;
CREATE TRIGGER store_products_updated_at
  BEFORE UPDATE ON public.store_products
  FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
DROP TRIGGER IF EXISTS store_customers_updated_at ON public.store_customers;
CREATE TRIGGER store_customers_updated_at
  BEFORE UPDATE ON public.store_customers
  FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
DROP TRIGGER IF EXISTS store_orders_updated_at ON public.store_orders;
CREATE TRIGGER store_orders_updated_at
  BEFORE UPDATE ON public.store_orders
  FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();

CREATE UNIQUE INDEX IF NOT EXISTS store_products_source_product_id_unique
  ON public.store_products (source_product_id)
  WHERE source_product_id IS NOT NULL;

ALTER TABLE public.store_product_assets
  ADD COLUMN IF NOT EXISTS media_type text NOT NULL DEFAULT 'image';
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_product_assets_media_type_check'
      AND conrelid = 'public.store_product_assets'::regclass
  ) THEN
    ALTER TABLE public.store_product_assets
      ADD CONSTRAINT store_product_assets_media_type_check
      CHECK (media_type IN ('image', 'video'));
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS public.store_product_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id uuid NOT NULL REFERENCES public.store_products(id) ON DELETE CASCADE,
  sku text,
  name text NOT NULL,
  color text,
  power_diopters numeric(6,2),
  base_curve numeric(4,2),
  diameter_mm numeric(4,2),
  pack_size integer,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  currency text NOT NULL DEFAULT 'PKR',
  stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (pack_size IS NULL OR pack_size > 0)
);

CREATE UNIQUE INDEX IF NOT EXISTS store_product_variants_sku_unique
  ON public.store_product_variants (sku)
  WHERE sku IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_product_variants_product_id_idx
  ON public.store_product_variants (product_id, is_active);

DROP TRIGGER IF EXISTS store_product_variants_updated_at ON public.store_product_variants;
CREATE TRIGGER store_product_variants_updated_at
  BEFORE UPDATE ON public.store_product_variants
  FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
