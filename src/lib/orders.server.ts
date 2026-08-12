import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export const getPaymentMethods = createServerFn({ method: "GET" }).handler(async () => {
  const { getDb } = await import("@/lib/db.server");
  const sql = getDb();
  return sql`SELECT * FROM payment_methods WHERE enabled = true ORDER BY name ASC`;
});

export const createOrder = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    customer_name: z.string().min(2, "Nombre requerido"),
    customer_email: z.string().email("Correo inválido"),
    customer_phone: z.string().min(6, "Teléfono requerido"),
    payment_method_id: z.string().uuid("Seleccione un método de pago"),
    items: z.array(z.object({
      product_id: z.string().uuid(),
      product_name: z.string(),
      quantity: z.number().int().positive(),
      unit_price_usd: z.number().positive(),
    })).min(1, "El carrito está vacío"),
    total_usd: z.number().positive(),
    total_fiat: z.number().positive(),
  }).parse(data))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();

    // Iniciar transacción
    const result = await sql.begin(async (sql) => {
      // 1. Crear la orden
      const [order] = await sql`
        INSERT INTO orders (
          customer_name, customer_email, customer_phone, 
          total_usd, total_fiat, payment_method_id, status
        ) VALUES (
          ${data.customer_name}, ${data.customer_email}, ${data.customer_phone},
          ${data.total_usd}, ${data.total_fiat}, ${data.payment_method_id}, 'pending'
        ) RETURNING id
      `;

      // 2. Crear los order_items
      const itemsToInsert = data.items.map(item => ({
        order_id: order.id,
        product_id: item.product_id,
        product_name: item.product_name,
        quantity: item.quantity,
        unit_price_usd: item.unit_price_usd
      }));

      await sql`
        INSERT INTO order_items ${sql(itemsToInsert)}
      `;

      return { orderId: order.id };
    });

    return result;
  });

export const getOrder = createServerFn({ method: "GET" })
  .validator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();
    const [order] = await sql`
      SELECT o.*, pm.name as payment_method_name, pm.type as payment_method_type, pm.instructions as payment_instructions
      FROM orders o
      LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id
      WHERE o.id = ${data.orderId}
    `;
    if (!order) throw new Error("Orden no encontrada");

    const items = await sql`SELECT * FROM order_items WHERE order_id = ${data.orderId}`;
    return { order, items };
  });

export const submitPaymentProof = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    orderId: z.string().uuid(),
    proof_url: z.string().url("URL inválida")
  }).parse(data))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();
    
    const [order] = await sql`UPDATE orders SET payment_proof_url = ${data.proof_url}, status = 'processing' WHERE id = ${data.orderId} RETURNING id`;
    if (!order) throw new Error("Orden no encontrada");
    
    return { success: true };
  });
