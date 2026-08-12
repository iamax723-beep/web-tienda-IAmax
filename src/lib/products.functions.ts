import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mappingSchema = z.object({
  id: z.string().default("id"), name: z.string().default("name"),
  description: z.string().default("description"), price: z.string().default("price"),
  image: z.string().default("image"),
});
const connectionSchema = z.object({
  id: z.string().uuid().optional(), name: z.string().trim().min(2), api_url: z.string().url(),
  purchase_url: z.string().url().or(z.literal("")).optional(), api_key: z.string().optional(),
  auth_type: z.enum(["none", "bearer", "header", "query"]),
  auth_header: z.string().trim().default("Authorization"), products_path: z.string().trim().default(""),
  field_mapping: mappingSchema, enabled: z.boolean().default(true),
});
type ConnectionInput = z.infer<typeof connectionSchema>;
type StoreRecord = ConnectionInput & { id: string; api_key?: string | null };

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return source;
  return path.split(".").filter(Boolean).reduce<unknown>((value, key) =>
    value && typeof value === "object" ? (value as Record<string, unknown>)[key] : undefined, source);
}

function buildRequest(store: StoreRecord) {
  const headers = new Headers({ Accept: "application/json" });
  const url = new URL(store.api_url);
  const key = store.api_key?.trim();
  if (key && store.auth_type === "bearer") headers.set("Authorization", `Bearer ${key}`);
  if (key && store.auth_type === "header") headers.set(store.auth_header || "X-API-Key", key);
  if (key && store.auth_type === "query") url.searchParams.set(store.auth_header || "api_key", key);
  return { url: url.toString(), headers };
}

async function fetchExternalProducts(store: StoreRecord) {
  const { url, headers } = buildRequest(store);
  const response = await fetch(url, { headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`La API respondió ${response.status} ${response.statusText}`);
  const json = await response.json();
  const selected = valueAtPath(json, store.products_path || "");
  const candidates = Array.isArray(selected) ? selected : selected && typeof selected === "object"
    ? ((selected as Record<string, unknown>).products ?? (selected as Record<string, unknown>).data) : undefined;
  if (!Array.isArray(candidates)) throw new Error("No se encontró una lista de productos. Revisa la ruta de datos.");
  return candidates.map((item, index) => {
    const record = item as Record<string, unknown>;
    const read = (path: string) => valueAtPath(record, path);
    return {
      id: String(read(store.field_mapping.id) ?? index),
      name: String(read(store.field_mapping.name) ?? "Producto sin nombre"),
      description: String(read(store.field_mapping.description) ?? ""),
      price: Number(read(store.field_mapping.price) ?? 0), image: String(read(store.field_mapping.image) ?? ""),
    };
  });
}

async function findStore(id: string): Promise<StoreRecord> {
  const { getDb } = await import("@/lib/db.server");
  const sql = getDb();
  const rows = await sql<StoreRecord[]>`SELECT * FROM stores WHERE id = ${id} LIMIT 1`;
  if (!rows[0]) throw new Error("Conexión no encontrada");
  return rows[0];
}

export const listApiConnections = createServerFn({ method: "GET" }).handler(async () => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server");
  const sql = getDb();
  return sql<Array<Omit<StoreRecord, "api_key"> & { last_status: string; last_error: string | null; last_sync: string | null; product_count: number; created_at: string }>>`
    SELECT id, name, api_type, api_url, purchase_url, auth_type, auth_header, products_path,
           field_mapping, enabled, last_status, last_error, last_sync, product_count, created_at
    FROM stores ORDER BY created_at DESC`;
});

export const getStorefrontData = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("@/lib/db.server");
  const sql = getDb();
  const [products, rateRows] = await Promise.all([
    sql`SELECT p.*, json_build_object('name', s.name) AS stores FROM products p LEFT JOIN stores s ON s.id = p.store_id ORDER BY p.created_at DESC`,
    sql<{ value: string }[]>`SELECT value FROM settings WHERE key = 'dollar_rate' LIMIT 1`,
  ]);
  return { products, dollarRate: Number(rateRows[0]?.value ?? 1) };
});

export const saveApiConnection = createServerFn({ method: "POST" }).validator((data) => connectionSchema.parse(data)).handler(async ({ data }) => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server"); const sql = getDb();
  if (data.id) {
    if (data.api_key) await sql`UPDATE stores SET name=${data.name},api_url=${data.api_url},purchase_url=${data.purchase_url || null},api_key=${data.api_key},auth_type=${data.auth_type},auth_header=${data.auth_header},products_path=${data.products_path},field_mapping=${sql.json(data.field_mapping)},enabled=${data.enabled},updated_at=NOW() WHERE id=${data.id}`;
    else await sql`UPDATE stores SET name=${data.name},api_url=${data.api_url},purchase_url=${data.purchase_url || null},auth_type=${data.auth_type},auth_header=${data.auth_header},products_path=${data.products_path},field_mapping=${sql.json(data.field_mapping)},enabled=${data.enabled},updated_at=NOW() WHERE id=${data.id}`;
  } else {
    await sql`INSERT INTO stores (name,api_type,api_url,purchase_url,api_key,auth_type,auth_header,products_path,field_mapping,enabled) VALUES (${data.name},'generic_json',${data.api_url},${data.purchase_url || null},${data.api_key || null},${data.auth_type},${data.auth_header},${data.products_path},${sql.json(data.field_mapping)},${data.enabled})`;
  }
  return { success: true };
});

export const deleteApiConnection = createServerFn({ method: "POST" }).validator((data) => z.object({ id: z.string().uuid() }).parse(data)).handler(async ({ data }) => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server"); await getDb()`DELETE FROM stores WHERE id=${data.id}`; return { success: true };
});

export const testApiConnection = createServerFn({ method: "POST" }).validator((data) => z.object({ storeId: z.string().uuid() }).parse(data)).handler(async ({ data }) => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server"); const sql = getDb(); const store = await findStore(data.storeId);
  try {
    const products = await fetchExternalProducts(store);
    await sql`UPDATE stores SET last_status='connected',last_error=NULL,product_count=${products.length},updated_at=NOW() WHERE id=${data.storeId}`;
    return { success: true, count: products.length };
  } catch (cause) {
    const message = cause instanceof Error ? cause.message : "No fue posible conectar";
    await sql`UPDATE stores SET last_status='error',last_error=${message},updated_at=NOW() WHERE id=${data.storeId}`;
    throw new Error(message);
  }
});

export const syncStoreProducts = createServerFn({ method: "POST" }).validator((data) => z.object({ storeId: z.string().uuid() }).parse(data)).handler(async ({ data }) => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server"); const sql = getDb(); const store = await findStore(data.storeId);
  const products = await fetchExternalProducts(store);
  await sql.begin(async (tx) => {
    for (const product of products) await tx`
      INSERT INTO products (store_id,external_id,name,description,original_price,image_url,last_sync)
      VALUES (${data.storeId},${product.id},${product.name},${product.description || null},${Number.isFinite(product.price) ? product.price : 0},${product.image || null},NOW())
      ON CONFLICT (store_id,external_id) DO UPDATE SET name=EXCLUDED.name,description=EXCLUDED.description,original_price=EXCLUDED.original_price,image_url=EXCLUDED.image_url,last_sync=NOW()`;
    await tx`UPDATE stores SET last_status='connected',last_error=NULL,last_sync=NOW(),product_count=${products.length},updated_at=NOW() WHERE id=${data.storeId}`;
  });
  return { success: true, count: products.length };
});

export const updateDollarRate = createServerFn({ method: "POST" }).validator((data) => z.object({ rate: z.number().positive() }).parse(data)).handler(async ({ data }) => {
  const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
  const { getDb } = await import("@/lib/db.server");
  await getDb()`INSERT INTO settings (key,value,updated_at) VALUES ('dollar_rate',${data.rate.toString()},NOW()) ON CONFLICT (key) DO UPDATE SET value=EXCLUDED.value,updated_at=NOW()`;
  return { success: true };
});
