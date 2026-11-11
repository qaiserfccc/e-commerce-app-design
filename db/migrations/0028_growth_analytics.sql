CREATE TABLE IF NOT EXISTS public.store_growth_events (
  event_id uuid PRIMARY KEY,
  session_id uuid NOT NULL,
  event_name text NOT NULL CHECK (event_name IN ('page_view', 'view_item', 'add_to_cart', 'begin_checkout', 'purchase')),
  page_path text NOT NULL CHECK (length(page_path) BETWEEN 1 AND 300 AND left(page_path, 1) = '/' AND left(page_path, 2) <> '//'),
  product_id uuid,
  value numeric(12, 2) CHECK (value IS NULL OR value >= 0),
  currency text CHECK (currency IS NULL OR currency ~ '^[A-Z]{3}$'),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS store_growth_events_created_at_idx
  ON public.store_growth_events (created_at DESC);
CREATE INDEX IF NOT EXISTS store_growth_events_event_created_idx
  ON public.store_growth_events (event_name, created_at DESC);
CREATE INDEX IF NOT EXISTS store_growth_events_session_created_idx
  ON public.store_growth_events (session_id, created_at DESC);

ALTER TABLE public.store_settings
  DROP CONSTRAINT IF EXISTS store_settings_key_check;

ALTER TABLE public.store_settings
  ADD CONSTRAINT store_settings_key_check
  CHECK (key IN (
    'announcements',
    'contact',
    'headings',
    'seo_sections',
    'footer',
    'product_page',
    'delivery_rules',
    'chatbot',
    'appearance',
    'home_configuration',
    'power_options',
    'free_gift',
    'deals',
    'marketing_integrations',
    'cro_actions'
  ));
