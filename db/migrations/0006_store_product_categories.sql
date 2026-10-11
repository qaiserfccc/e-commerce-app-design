CREATE TABLE IF NOT EXISTS public.store_product_categories (
  source_category_id integer PRIMARY KEY CHECK (source_category_id > 0),
  name text NOT NULL CHECK (length(name) BETWEEN 1 AND 100),
  slug text NOT NULL UNIQUE CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  parent_source_category_id integer NOT NULL DEFAULT 0 CHECK (parent_source_category_id >= 0),
  source_product_count integer NOT NULL DEFAULT 0 CHECK (source_product_count >= 0),
  is_active boolean NOT NULL DEFAULT true,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_product_assets_product_pathname_unique
  ON public.store_product_assets (product_id, blob_pathname);

INSERT INTO public.store_product_categories
  (source_category_id, name, slug, parent_source_category_id, source_product_count)
VALUES
  (118, 'All Products', 'all-products', 0, 89),
  (38, 'BELLA DIAMOND', 'bella-diamond', 24, 8),
  (39, 'BELLA DIAMOND ASEEL', 'bella-diamond-aseel', 24, 6),
  (33, 'BELLA ELITE COLLECTION', 'bella-elite-collection', 24, 18),
  (34, 'BELLA GLOW COLLECTION', 'bella-glow-collection', 24, 9),
  (37, 'BELLA HIGHLIGHT', 'bella-highlight-contact-lenses', 24, 5),
  (24, 'BELLA LENSES', 'bella-lenses', 17, 70),
  (36, 'BELLA NATURAL', 'bella-natural-contact-lenses', 24, 7),
  (35, 'BELLA SECRET COLLECTION', 'bella-secret-contact-lenses', 24, 15),
  (40, 'BELLA TRANSPARENT', 'bella-transparent', 24, 2),
  (26, 'Bridal Collection', 'bridal-collection-contact-lenses', 17, 47),
  (25, 'COLOR LENS', 'color-contact-lenses', 17, 50),
  (107, 'Comfort Basic Series', 'basic-series-contact-lenses-in-pakistan', 101, 6),
  (108, 'Comfort Bio Luc Lenses', 'comfort-bio-luc-lenses', 101, 6),
  (104, 'Comfort Flora Lenses', 'comfort-flora-lenses', 101, 4),
  (102, 'Comfort Hidrocor Luxe Series', 'comfort-hidrocor-luxe-series', 101, 6),
  (103, 'Comfort Jewel Series', 'comfort-jewel-series', 101, 5),
  (101, 'Comfort Lenses', 'comfort-contact-lenses-in-pakistan', 0, 38),
  (105, 'Comfort Neko Lenses', 'comfort-neko-lenses', 101, 5),
  (106, 'Comfort Rainbow Series', 'comfort-rainbow-series', 101, 6),
  (17, 'Contact Lenses', 'contact-lenses', 0, 295),
  (20, 'COSMETICS', 'cosmetics', 0, 2),
  (99, 'DAHAB LENSES', 'dahab-lenses', 17, 28),
  (100, 'DEALS', 'deals-contact-lenses-pakistan', 0, 13),
  (98, 'EL DORADO Lenses', 'el-dorado-lenses', 17, 16),
  (30, 'HALLOWEEN LENSES', 'halloween-lenses', 17, 17),
  (27, 'HIDROCOR LENSES', 'hidrocor-lenses', 17, 73),
  (109, 'LIMITED TIME DEALS', 'limited-time-deals-contact-lenses-pakistan', 0, 8),
  (28, 'MEN LENS COLLECTION', 'men-lens-collection', 17, 3),
  (16, 'New Arrival', 'new-arrival-contact-lenses-pakistan', 0, 26),
  (18, 'SOLUTIONS', 'contact-lens-solutions-pakistan', 0, 34),
  (31, 'TRANSPARENT LENS', 'transparent-lens', 17, 5),
  (19, 'TRAVEL KIT', 'contact-lens-travel-kit-in-pakistan', 0, 23)
ON CONFLICT (source_category_id) DO UPDATE SET
  name = EXCLUDED.name,
  slug = EXCLUDED.slug,
  parent_source_category_id = EXCLUDED.parent_source_category_id,
  source_product_count = EXCLUDED.source_product_count,
  is_active = true,
  updated_at = now();
