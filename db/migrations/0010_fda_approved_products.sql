ALTER TABLE store_products
  ADD COLUMN IF NOT EXISTS fda_approved boolean NOT NULL DEFAULT false;
