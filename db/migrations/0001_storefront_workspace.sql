-- Shared storefront + CRM workspace schema for Neon Postgres.
-- Keep this file append-only; apply each statement through the Neon MCP or your deployment migration runner.

CREATE TABLE IF NOT EXISTS public.store_products (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), name text NOT NULL, slug text NOT NULL UNIQUE, description text, category text NOT NULL, price numeric(12,2) NOT NULL CHECK (price >= 0), currency text NOT NULL DEFAULT 'USD', status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','draft','archived')), stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0), hero_image_url text, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.store_customers (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), email text NOT NULL UNIQUE, first_name text, last_name text, phone text, marketing_opt_in boolean NOT NULL DEFAULT false, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.store_orders (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_number bigint GENERATED ALWAYS AS IDENTITY UNIQUE, customer_id uuid NOT NULL, status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','paid','processing','shipped','delivered','cancelled','refunded')), subtotal numeric(12,2) NOT NULL CHECK (subtotal >= 0), shipping_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (shipping_total >= 0), tax_total numeric(12,2) NOT NULL DEFAULT 0 CHECK (tax_total >= 0), total numeric(12,2) NOT NULL CHECK (total >= 0), currency text NOT NULL DEFAULT 'USD', shipping_address jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now(), updated_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.store_order_items (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), order_id uuid NOT NULL, product_id uuid NOT NULL, product_name text NOT NULL, unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0), quantity integer NOT NULL CHECK (quantity > 0), line_total numeric(12,2) NOT NULL CHECK (line_total >= 0), created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.store_product_assets (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), product_id uuid NOT NULL, blob_pathname text NOT NULL, blob_url text, alt_text text, sort_order integer NOT NULL DEFAULT 0, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE IF NOT EXISTS public.store_activity_events (id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY, entity_type text NOT NULL, entity_id uuid NOT NULL, event_type text NOT NULL, payload jsonb NOT NULL DEFAULT '{}'::jsonb, created_at timestamptz NOT NULL DEFAULT now());

CREATE INDEX IF NOT EXISTS store_products_status_idx ON public.store_products (status);
CREATE INDEX IF NOT EXISTS store_products_category_idx ON public.store_products (category);
CREATE INDEX IF NOT EXISTS store_orders_customer_id_idx ON public.store_orders (customer_id);
CREATE INDEX IF NOT EXISTS store_orders_status_created_at_idx ON public.store_orders (status, created_at DESC);
CREATE INDEX IF NOT EXISTS store_order_items_order_id_idx ON public.store_order_items (order_id);
CREATE INDEX IF NOT EXISTS store_product_assets_product_id_idx ON public.store_product_assets (product_id, sort_order);
CREATE INDEX IF NOT EXISTS store_activity_events_entity_idx ON public.store_activity_events (entity_type, entity_id, id DESC);
CREATE INDEX IF NOT EXISTS store_activity_events_created_at_idx ON public.store_activity_events (created_at DESC);

CREATE OR REPLACE FUNCTION public.set_store_updated_at() RETURNS trigger LANGUAGE plpgsql AS $$ BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
DROP TRIGGER IF EXISTS store_products_updated_at ON public.store_products;
CREATE TRIGGER store_products_updated_at BEFORE UPDATE ON public.store_products FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
DROP TRIGGER IF EXISTS store_customers_updated_at ON public.store_customers;
CREATE TRIGGER store_customers_updated_at BEFORE UPDATE ON public.store_customers FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
DROP TRIGGER IF EXISTS store_orders_updated_at ON public.store_orders;
CREATE TRIGGER store_orders_updated_at BEFORE UPDATE ON public.store_orders FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
