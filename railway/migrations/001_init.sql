CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_type text NOT NULL DEFAULT 'generic_json',
  api_url text NOT NULL,
  purchase_url text,
  api_key text,
  auth_type text NOT NULL DEFAULT 'bearer',
  auth_header text NOT NULL DEFAULT 'Authorization',
  products_path text NOT NULL DEFAULT '',
  field_mapping jsonb NOT NULL DEFAULT '{"id":"id","name":"name","description":"description","price":"price","image":"image"}'::jsonb,
  enabled boolean NOT NULL DEFAULT true,
  last_status text NOT NULL DEFAULT 'pending',
  last_error text,
  last_sync timestamptz,
  product_count integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id) ON DELETE CASCADE,
  external_id text NOT NULL,
  name text NOT NULL,
  description text,
  original_price numeric NOT NULL DEFAULT 0,
  custom_usd_price numeric,
  image_url text,
  last_sync timestamptz DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (store_id, external_id)
);

CREATE TABLE IF NOT EXISTS settings (
  key text PRIMARY KEY,
  value text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO settings (key, value) VALUES ('dollar_rate', '1.0')
ON CONFLICT (key) DO NOTHING;

CREATE INDEX IF NOT EXISTS products_store_id_idx ON products(store_id);
CREATE INDEX IF NOT EXISTS stores_enabled_idx ON stores(enabled);
