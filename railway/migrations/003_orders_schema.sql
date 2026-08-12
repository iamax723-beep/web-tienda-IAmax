CREATE TABLE IF NOT EXISTS payment_methods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- 'crypto', 'manual'
  instructions TEXT,
  enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  customer_name TEXT,
  customer_email TEXT,
  customer_phone TEXT,
  total_usd DECIMAL(12,2) NOT NULL,
  total_fiat DECIMAL(12,2), -- en la moneda local (BOB)
  status TEXT NOT NULL DEFAULT 'pending', -- pending, paid, processing, completed, failed, cancelled
  payment_method_id UUID REFERENCES payment_methods(id),
  payment_proof_url TEXT, -- para subir comprobantes (manual)
  provider_order_id TEXT, -- ID del pedido en el proveedor (ProdSeller)
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID REFERENCES orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES products(id),
  product_name TEXT NOT NULL, -- snapshot del nombre por si cambia
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price_usd DECIMAL(12,2) NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insertar métodos de pago por defecto si no existen
INSERT INTO payment_methods (name, type, instructions)
SELECT 'Binance Pay', 'crypto', 'Pago automático con Binance Pay'
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Binance Pay');

INSERT INTO payment_methods (name, type, instructions)
SELECT 'Transferencia / QR (Manual)', 'manual', 'Envía el comprobante de pago al WhatsApp del administrador'
WHERE NOT EXISTS (SELECT 1 FROM payment_methods WHERE name = 'Transferencia / QR (Manual)');
