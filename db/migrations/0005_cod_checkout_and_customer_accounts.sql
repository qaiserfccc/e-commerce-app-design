-- Add shopper accounts and transactional cash-on-delivery checkout.
ALTER TABLE public.store_customers
  ADD COLUMN IF NOT EXISTS password_hash text,
  ADD COLUMN IF NOT EXISTS session_version integer NOT NULL DEFAULT 1;

ALTER TABLE public.store_orders
  ADD COLUMN IF NOT EXISTS payment_method text,
  ADD COLUMN IF NOT EXISTS shipping_fee_confirmed boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS account_id uuid,
  ADD COLUMN IF NOT EXISTS checkout_key uuid;

ALTER TABLE public.store_order_items
  ADD COLUMN IF NOT EXISTS variant_id uuid,
  ADD COLUMN IF NOT EXISTS inventory_reserved boolean NOT NULL DEFAULT false;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_customers_session_version_check'
      AND conrelid = 'public.store_customers'::regclass
  ) THEN
    ALTER TABLE public.store_customers
      ADD CONSTRAINT store_customers_session_version_check CHECK (session_version > 0);
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'store_orders_payment_method_check'
      AND conrelid = 'public.store_orders'::regclass
  ) THEN
    ALTER TABLE public.store_orders
      ADD CONSTRAINT store_orders_payment_method_check
      CHECK (payment_method IS NULL OR payment_method = 'cash_on_delivery');
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS store_customers_lower_email_unique
  ON public.store_customers (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS store_orders_checkout_key_unique
  ON public.store_orders (checkout_key);
CREATE INDEX IF NOT EXISTS store_orders_account_created_at_idx
  ON public.store_orders (account_id, created_at DESC);
