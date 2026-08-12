// Start HTTP immediately so Railway can complete its healthcheck. Database
// preparation runs in the background and may retry while PostgreSQL starts.
await import("../.output/server/index.mjs");

import("./migrate.mjs").catch((error) => {
  console.error("La aplicación inició, pero PostgreSQL aún no está disponible:", error.message);
  console.error("Revisa que DATABASE_URL=${{Postgres.DATABASE_URL}} esté configurada en el servicio web.");
});
