import postgres from "postgres";
import { fileURLToPath } from "node:url";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) throw new Error("Falta DATABASE_URL");

const migration = fileURLToPath(new URL("../railway/migrations/001_init.sql", import.meta.url));
const wait = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

let lastError;
for (let attempt = 1; attempt <= 6; attempt += 1) {
  const sql = postgres(connectionString, { max: 1, prepare: false, connect_timeout: 8 });
  try {
    await sql.file(migration);
    console.log("Base de datos Railway preparada.");
    lastError = undefined;
    break;
  } catch (error) {
    lastError = error;
    console.error(`PostgreSQL no disponible (intento ${attempt}/6): ${error.message}`);
    if (attempt < 6) await wait(5000);
  } finally {
    await sql.end({ timeout: 1 }).catch(() => undefined);
  }
}

if (lastError) throw lastError;
