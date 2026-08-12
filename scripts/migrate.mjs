import postgres from "postgres";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 20 });
const migration = fileURLToPath(new URL("../railway/migrations/001_init.sql", import.meta.url));

try {
  await sql.file(migration);
  console.log("Base de datos Railway preparada.");
} finally {
  await sql.end();
}
