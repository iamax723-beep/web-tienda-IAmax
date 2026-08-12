CREATE TABLE public.stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_type text NOT NULL, -- e.g., 'shopify', 'generic_json'
  api_url text NOT NULL,
  api_key text,
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.stores TO authenticated;
GRANT ALL ON public.stores TO service_role;
ALTER TABLE public.stores ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES public.stores(id) ON DELETE CASCADE,
  external_id text,
  name text NOT NULL,
  description text,
  original_price numeric,
  custom_usd_price numeric,
  image_url text,
  last_sync timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products TO authenticated;
GRANT ALL ON public.products TO service_role;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.settings TO authenticated;
GRANT ALL ON public.settings TO service_role;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

-- Initial dollar rate
INSERT INTO public.settings (key, value) VALUES ('dollar_rate', '1.0');

-- Policies for authenticated users
CREATE POLICY "Allow authenticated users to manage stores" ON public.stores
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage products" ON public.products
  FOR ALL TO authenticated USING (true);

CREATE POLICY "Allow authenticated users to manage settings" ON public.settings
  FOR ALL TO authenticated USING (true);
