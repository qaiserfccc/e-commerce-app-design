CREATE TABLE IF NOT EXISTS public.store_crm_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text NOT NULL DEFAULT 'manual' CHECK (source IN ('manual', 'meta')),
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'contacted', 'qualified', 'converted', 'lost')),
  full_name text CHECK (full_name IS NULL OR length(full_name) <= 180),
  email text CHECK (email IS NULL OR length(email) <= 254),
  phone text CHECK (phone IS NULL OR length(phone) <= 80),
  notes text CHECK (notes IS NULL OR length(notes) <= 5000),
  follow_up_at timestamptz,
  matched_customer_id uuid REFERENCES public.store_customers(id) ON DELETE SET NULL,
  meta_lead_id text,
  meta_page_id text,
  meta_form_id text,
  meta_ad_id text,
  meta_campaign_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS store_crm_leads_meta_lead_id_unique
  ON public.store_crm_leads (meta_lead_id)
  WHERE meta_lead_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS store_crm_leads_status_created_at_idx
  ON public.store_crm_leads (status, created_at DESC);
CREATE INDEX IF NOT EXISTS store_crm_leads_matched_customer_id_idx
  ON public.store_crm_leads (matched_customer_id);

DROP TRIGGER IF EXISTS store_crm_leads_updated_at ON public.store_crm_leads;
CREATE TRIGGER store_crm_leads_updated_at BEFORE UPDATE ON public.store_crm_leads
  FOR EACH ROW EXECUTE FUNCTION public.set_store_updated_at();
