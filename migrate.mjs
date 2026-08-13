import postgres from 'postgres';
const sql = postgres(process.env.DATABASE_URL);
async function run() {
  try { await sql`ALTER TABLE products ADD COLUMN provider_name TEXT;`; console.log('Added provider_name'); } catch(e) { console.log(e.message); }
  try { await sql`ALTER TABLE products ADD COLUMN provider_product_id TEXT;`; console.log('Added provider_product_id'); } catch(e) { console.log(e.message); }
  try { await sql`ALTER TABLE products ADD COLUMN provider_variant_id TEXT;`; console.log('Added provider_variant_id'); } catch(e) { console.log(e.message); }
  try { await sql`ALTER TABLE orders ADD COLUMN delivered_credentials TEXT;`; console.log('Added delivered_credentials'); } catch(e) { console.log(e.message); }
  process.exit(0);
}
run();
