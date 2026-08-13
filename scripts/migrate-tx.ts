import { getDb } from '../src/lib/db.server.ts';

async function main() {
  try {
    const sql = getDb();
    await sql`ALTER TABLE orders ADD COLUMN IF NOT EXISTS tx_id TEXT`;
    console.log("Migration successful");
    process.exit(0);
  } catch (err) {
    console.error(err);
    process.exit(1);
  }
}
main();
