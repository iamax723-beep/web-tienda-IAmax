import postgres from "postgres";

let client: ReturnType<typeof postgres> | undefined;

export function getDb() {
  if (client) return client;
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("Falta DATABASE_URL. Añádela desde el servicio PostgreSQL de Railway.");

  client = postgres(connectionString, {
    max: 5,
    idle_timeout: 20,
    connect_timeout: 15,
    prepare: false,
  });

  // Ensure columns exist (ignore errors if they already exist)
  client`ALTER TABLE products ADD COLUMN provider_name TEXT`.catch(() => {});
  client`ALTER TABLE products ADD COLUMN provider_product_id TEXT`.catch(() => {});
  client`ALTER TABLE products ADD COLUMN provider_variant_id TEXT`.catch(() => {});
  client`ALTER TABLE orders ADD COLUMN delivered_credentials TEXT`.catch(() => {});
  client`ALTER TABLE orders ADD COLUMN pixverify_email TEXT`.catch(() => {});
  client`ALTER TABLE orders ADD COLUMN pixverify_password TEXT`.catch(() => {});
  client`ALTER TABLE orders ADD COLUMN pixverify_totp TEXT`.catch(() => {});

  return client;
}
