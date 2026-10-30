ALTER TABLE public.store_products
  ALTER COLUMN category_id DROP NOT NULL,
  ADD COLUMN IF NOT EXISTS is_new_arrival boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_on_sale boolean NOT NULL DEFAULT false;

DO $$
DECLARE
  category_fk text;
BEGIN
  SELECT constraint_row.conname INTO category_fk
  FROM pg_constraint AS constraint_row
  JOIN pg_attribute AS column_row
    ON column_row.attrelid = constraint_row.conrelid
    AND column_row.attname = 'category_id'
  WHERE constraint_row.conrelid = 'public.store_products'::regclass
    AND constraint_row.confrelid = 'public.store_categories'::regclass
    AND constraint_row.contype = 'f'
    AND constraint_row.conkey = ARRAY[column_row.attnum]::smallint[];

  IF category_fk IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.store_products DROP CONSTRAINT %I', category_fk);
  END IF;
END $$;

ALTER TABLE public.store_products
  ADD CONSTRAINT store_products_category_id_store_categories_id_fk
  FOREIGN KEY (category_id) REFERENCES public.store_categories(id) ON DELETE SET NULL;

CREATE TEMP TABLE store_category_dedupe_map ON COMMIT DROP AS
WITH category_counts AS (
  SELECT category.id,
    count(DISTINCT product.id)::integer AS product_count
  FROM public.store_categories AS category
  LEFT JOIN public.store_product_categories AS assignment
    ON assignment.category_id = category.id
  LEFT JOIN public.store_products AS product
    ON product.id = assignment.product_id OR product.category_id = category.id
  GROUP BY category.id
), ranked_categories AS (
  SELECT category.id,
    first_value(category.id) OVER (
      PARTITION BY lower(btrim(category.name))
      ORDER BY (category.source_category_id IS NOT NULL) DESC,
        category_counts.product_count DESC,
        category.created_at ASC,
        category.id ASC
    ) AS keeper_id,
    row_number() OVER (
      PARTITION BY lower(btrim(category.name))
      ORDER BY (category.source_category_id IS NOT NULL) DESC,
        category_counts.product_count DESC,
        category.created_at ASC,
        category.id ASC
    ) AS position
  FROM public.store_categories AS category
  JOIN category_counts ON category_counts.id = category.id
)
SELECT id AS duplicate_id, keeper_id
FROM ranked_categories
WHERE position > 1;

UPDATE public.store_categories AS child
SET parent_id = mapping.keeper_id
FROM store_category_dedupe_map AS mapping
WHERE child.parent_id = mapping.duplicate_id;

DELETE FROM public.store_product_categories;
UPDATE public.store_products SET category_id = NULL WHERE category_id IS NOT NULL;
DELETE FROM public.store_categories AS category
USING store_category_dedupe_map AS mapping
WHERE category.id = mapping.duplicate_id;

UPDATE public.store_categories
SET is_active = false,
    show_in_menu = false,
    updated_at = now()
WHERE is_active OR show_in_menu;

CREATE UNIQUE INDEX IF NOT EXISTS store_categories_lower_name_unique
  ON public.store_categories (lower(btrim(name)));
