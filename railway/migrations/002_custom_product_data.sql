ALTER TABLE products ADD COLUMN IF NOT EXISTS custom_image_url text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS stock integer;
ALTER TABLE products ADD COLUMN IF NOT EXISTS warranty_days integer;
