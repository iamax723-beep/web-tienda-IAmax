ALTER TABLE public.stores
  ADD COLUMN IF NOT EXISTS purchase_url text,
  ADD COLUMN IF NOT EXISTS auth_type text NOT NULL DEFAULT 'bearer',
  ADD COLUMN IF NOT EXISTS auth_header text NOT NULL DEFAULT 'Authorization',
  ADD COLUMN IF NOT EXISTS products_path text NOT NULL DEFAULT '',
  ADD COLUMN IF NOT EXISTS field_mapping jsonb NOT NULL DEFAULT '{"id":"id","name":"name","description":"description","price":"price","image":"image"}'::jsonb,
  ADD COLUMN IF NOT EXISTS enabled boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS last_status text NOT NULL DEFAULT 'pending',
  ADD COLUMN IF NOT EXISTS last_error text,
  ADD COLUMN IF NOT EXISTS last_sync timestamptz,
  ADD COLUMN IF NOT EXISTS product_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.stores.api_key IS 'Secret credential. Never select this column in browser-side queries.';
COMMENT ON COLUMN public.stores.products_path IS 'Dot path to the products array, e.g. data.products.';
COMMENT ON COLUMN public.stores.field_mapping IS 'External JSON field names mapped to id, name, description, price and image.';
