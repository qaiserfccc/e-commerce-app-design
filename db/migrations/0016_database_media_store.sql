CREATE TABLE IF NOT EXISTS public.store_media_objects (
  pathname text PRIMARY KEY
    CHECK (
      length(pathname) BETWEEN 1 AND 1024
      AND pathname !~ '(^/|//|(^|/)\.\.?(/|$)|[^a-zA-Z0-9._/-])'
    ),
  content_type text NOT NULL
    CHECK (content_type ~ '^[A-Za-z0-9.+_-]+/[A-Za-z0-9.+_-]+$'),
  byte_length integer NOT NULL CHECK (byte_length BETWEEN 1 AND 12582912),
  digest bytea NOT NULL CHECK (octet_length(digest) = 32),
  content bytea NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CHECK (octet_length(content) = byte_length)
);

ALTER TABLE public.store_brands
  DROP CONSTRAINT IF EXISTS store_brands_logo_url_check;

ALTER TABLE public.store_brands
  ADD CONSTRAINT store_brands_logo_url_check
  CHECK (logo_url IS NULL OR logo_url ~ '^/api/media/[a-zA-Z0-9._/-]+$');

ALTER TABLE public.store_banners
  DROP CONSTRAINT IF EXISTS store_banners_image_url_check;

ALTER TABLE public.store_banners
  ADD CONSTRAINT store_banners_image_url_check
  CHECK (image_url ~ '^https://' OR image_url ~ '^/api/media/[a-zA-Z0-9._/-]+$');

ALTER TABLE public.store_categories
  DROP CONSTRAINT IF EXISTS store_categories_image_url_check;

ALTER TABLE public.store_categories
  ADD CONSTRAINT store_categories_image_url_check
  CHECK (
    image_url IS NULL
    OR image_url ~ '^https://'
    OR image_url ~ '^/api/media/[a-zA-Z0-9._/-]+$'
  );

ALTER TABLE public.store_lens_shades
  DROP CONSTRAINT IF EXISTS store_lens_shades_image_url_check;

ALTER TABLE public.store_lens_shades
  ADD CONSTRAINT store_lens_shades_image_url_check
  CHECK (
    image_url IS NULL
    OR image_url ~ '^https://'
    OR image_url ~ '^/api/media/[a-zA-Z0-9._/-]+$'
  );
