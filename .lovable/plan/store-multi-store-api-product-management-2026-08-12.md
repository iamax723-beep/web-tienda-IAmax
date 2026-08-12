# Store Multi-Store API & Product Management

Create a platform to manage products from multiple store APIs, allowing custom pricing in USD with a daily exchange rate.

## User Review Required

> [!IMPORTANT]
> - Which store APIs do you want to integrate? (e.g., Shopify, Amazon, WooCommerce, or specific local stores)
> - Do you already have API keys for these stores?
> - Should the app update prices automatically when the store prices change, or only when you manually trigger it?

## Proposed Changes

### Database & Backend (Lovable Cloud)
- Create `stores` table to manage API configurations.
- Create `products` table to store fetched product data, store reference, and custom USD pricing.
- Create `settings` table to store the current daily dollar exchange rate.
- Implement server functions to:
  - Fetch products from store APIs.
  - Calculate prices based on the exchange rate.
  - Update product data periodically.

### Frontend
- **Dashboard**: Overview of total products, current exchange rate, and sync status.
- **Store Management**: Interface to add/edit store APIs (URL, Key, Type).
- **Product Listing**: View products from all stores, with their original price and your custom USD price.
- **Pricing Tool**: Interface to set the daily dollar rate and bulk update custom prices.

## Technical Details

### Schema
```sql
CREATE TABLE stores (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  api_type text NOT NULL, -- e.g., 'shopify', 'generic_json'
  api_url text NOT NULL,
  api_key text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE products (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  store_id uuid REFERENCES stores(id),
  external_id text,
  name text NOT NULL,
  description text,
  original_price numeric,
  custom_usd_price numeric,
  image_url text,
  last_sync timestamptz DEFAULT now()
);

CREATE TABLE settings (
  key text PRIMARY KEY,
  value text NOT NULL
);
-- Initial dollar rate
INSERT INTO settings (key, value) VALUES ('dollar_rate', '1.0');
```

### API Integration
- Use `createServerFn` to handle store-specific API requests safely from the server.
- Implement a generic adapter pattern to support different store types.

### Scheduling
- Use `pg_cron` (if needed for background updates) to trigger the product sync function.
