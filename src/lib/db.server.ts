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
  return client;
}
