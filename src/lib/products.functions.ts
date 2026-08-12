import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

const mappingSchema = z.object({
  id: z.string().default("id"),
  name: z.string().default("name"),
  description: z.string().default("description"),
  price: z.string().default("price"),
  image: z.string().default("image"),
});

const connectionSchema = z.object({
  id: z.string().optional(),
  name: z.string().trim().min(2),
  api_url: z.string().url(),
  purchase_url: z.string().url().or(z.literal("")).optional(),
  api_key: z.string().optional(),
  auth_type: z.enum(["none", "bearer", "header", "query"]),
  auth_header: z.string().trim().default("Authorization"),
  products_path: z.string().trim().default(""),
  field_mapping: mappingSchema,
  enabled: z.boolean().default(true),
});

type ConnectionInput = z.infer<typeof connectionSchema>;
type StoreRecord = ConnectionInput & { id: string; api_key?: string | null };

function valueAtPath(source: unknown, path: string): unknown {
  if (!path) return source;
  return path.split(".").filter(Boolean).reduce<unknown>((value, key) => {
    if (value && typeof value === "object") return (value as Record<string, unknown>)[key];
    return undefined;
  }, source);
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
  const response = await fetch(url, { method: "GET", headers, signal: AbortSignal.timeout(15000) });
  if (!response.ok) throw new Error(`La API respondió ${response.status} ${response.statusText}`);
  const json = await response.json();
  const selected = valueAtPath(json, store.products_path || "");
  const candidates = Array.isArray(selected)
    ? selected
    : selected && typeof selected === "object"
      ? ((selected as Record<string, unknown>).products ?? (selected as Record<string, unknown>).data)
      : undefined;
  if (!Array.isArray(candidates)) throw new Error("No se encontró una lista de productos. Revisa la ruta de datos.");

  return candidates.map((item, index) => {
    const record = item as Record<string, unknown>;
    const read = (path: string) => valueAtPath(record, path);
    return {
      id: String(read(store.field_mapping.id) ?? index),
      name: String(read(store.field_mapping.name) ?? "Producto sin nombre"),
      description: String(read(store.field_mapping.description) ?? ""),
      price: Number(read(store.field_mapping.price) ?? 0),
      image: String(read(store.field_mapping.image) ?? ""),
    };
  });
}

export const listApiConnections = createServerFn({ method: "GET" }).handler(async () => {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("stores")
    .select("id,name,api_type,api_url,purchase_url,auth_type,auth_header,products_path,field_mapping,enabled,last_status,last_error,last_sync,product_count,created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
});

export const saveApiConnection = createServerFn({ method: "POST" })
  .inputValidator((data) => connectionSchema.parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const payload = {
      name: data.name,
      api_type: "generic_json",
      api_url: data.api_url,
      purchase_url: data.purchase_url || null,
      auth_type: data.auth_type,
      auth_header: data.auth_header,
      products_path: data.products_path,
      field_mapping: data.field_mapping,
      enabled: data.enabled,
      ...(data.api_key ? { api_key: data.api_key } : {}),
    };
    const query = data.id
      ? supabaseAdmin.from("stores").update(payload).eq("id", data.id)
      : supabaseAdmin.from("stores").insert(payload);
    const { error } = await query;
    if (error) throw error;
    return { success: true };
  });

export const deleteApiConnection = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ id: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("stores").delete().eq("id", data.id);
    if (error) throw error;
    return { success: true };
  });

export const testApiConnection = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ storeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin.from("stores").select("*").eq("id", data.storeId).single();
    if (error || !store) throw new Error("Conexión no encontrada");
    try {
      const products = await fetchExternalProducts(store as StoreRecord);
      await supabaseAdmin.from("stores").update({ last_status: "connected", last_error: null, product_count: products.length }).eq("id", data.storeId);
      return { success: true, count: products.length };
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "No fue posible conectar";
      await supabaseAdmin.from("stores").update({ last_status: "error", last_error: message }).eq("id", data.storeId);
      throw new Error(message);
    }
  });

export const syncStoreProducts = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ storeId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: store, error } = await supabaseAdmin.from("stores").select("*").eq("id", data.storeId).single();
    if (error || !store) throw new Error("Conexión no encontrada");
    const products = await fetchExternalProducts(store as StoreRecord);
    if (products.length) {
      const { error: upsertError } = await supabaseAdmin.from("products").upsert(
        products.map((product) => ({
          store_id: data.storeId,
          external_id: product.id,
          name: product.name,
          description: product.description || null,
          original_price: Number.isFinite(product.price) ? product.price : 0,
          image_url: product.image || null,
          last_sync: new Date().toISOString(),
        })),
        { onConflict: "store_id,external_id" } as never,
      );
      if (upsertError) throw upsertError;
    }
    const syncedAt = new Date().toISOString();
    await supabaseAdmin.from("stores").update({ last_status: "connected", last_error: null, last_sync: syncedAt, product_count: products.length }).eq("id", data.storeId);
    return { success: true, count: products.length };
  });

export const updateDollarRate = createServerFn({ method: "POST" })
  .inputValidator((data) => z.object({ rate: z.number().positive() }).parse(data))
  .handler(async ({ data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("settings").upsert({ key: "dollar_rate", value: data.rate.toString(), updated_at: new Date().toISOString() });
    if (error) throw error;
    return { success: true };
  });
