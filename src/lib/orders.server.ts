import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import crypto from 'node:crypto';

async function executeOrderDelivery(orderId: string, sql: any) {
  // 1. Obtener la orden y verificar que no esté ya entregada
  const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
  if (!order) throw new Error("Orden no encontrada");
  if (order.status === 'delivered') throw new Error("La orden ya fue entregada");

  const items = await sql`
    SELECT oi.*, p.store_id, p.external_id as provider_id 
    FROM order_items oi 
    JOIN products p ON oi.product_id = p.id 
    WHERE oi.order_id = ${orderId}
  `;
  if (items.length === 0) throw new Error("La orden no tiene productos");

  // 2. Por cada item, hacer la compra en la API del proveedor
  let allKeys: string[] = [];
  
  for (const item of items) {
    if (!item.store_id || !item.provider_id) throw new Error(`El producto ${item.product_name} no tiene proveedor o ID configurado`);
    
    const [store] = await sql`SELECT * FROM stores WHERE id = ${item.store_id}`;
    if (!store || !store.api_key) throw new Error(`No se encontró la API Key para el proveedor del producto ${item.product_name}`);

    const purchaseUrl = store.purchase_url || `${store.api_url.split('/v1')[0]}/v1/orders`;
    
    try {
      const response = await fetch(purchaseUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-Key": store.api_key,
          ...(store.auth_header && store.auth_type === 'header' ? { [store.auth_header]: store.api_key } : {})
        },
        body: JSON.stringify({
          product_id: item.provider_id,
          category_id: !isNaN(Number(item.provider_id)) ? Number(item.provider_id) : item.provider_id,
          quantity: item.quantity
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        console.error("Error from API:", result);
        throw new Error(result.error?.message || result.error || result.message || "Error al comprar el producto");
      }

      const keys = result.credentials || result.data?.keys || result.keys || [];
      allKeys.push(...keys.map((k: string) => `${item.product_name}: ${k}`));

    } catch (err: any) {
      throw new Error(`Fallo al comprar ${item.product_name}: ${err.message}`);
    }
  }

  // 3. Guardar las keys en la orden y marcar como entregado
  const keysText = allKeys.join("\\n");
  await sql`UPDATE orders SET status = 'delivered', provider_order_id = ${keysText} WHERE id = ${orderId}`;
}

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
    tx_id: z.string().optional(),
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
          total_usd, total_fiat, payment_method_id, tx_id, status
        ) VALUES (
          ${data.customer_name}, ${data.customer_email}, ${data.customer_phone},
          ${data.total_usd}, ${data.total_fiat}, ${data.payment_method_id}, ${data.tx_id || null}, 'pending'
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

      // 3. Notificar por Telegram (si está configurado)
      try {
        const rows = await sql<{ key: string, value: string }[]>`SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')`;
        const config: Record<string, string> = {};
        for (const row of rows) config[row.key] = row.value;

        if (config.telegram_bot_token && config.telegram_chat_id) {
          const itemsText = data.items.map(i => `${i.quantity}x ${i.product_name} ($${i.unit_price_usd})`).join('\\n');
          const txText = data.tx_id ? `\\n*Binance TX-ID:* \`${data.tx_id}\`\\n` : '';
          const message = `🔔 *Nuevo Pedido Recibido*\\n\\n` +
            `*Cliente:* ${data.customer_name}\\n` +
            `*Teléfono:* ${data.customer_phone}\\n` +
            `*Total:* $${data.total_usd} USD\\n` + txText + `\\n` +
            `*Productos:*\\n${itemsText}\\n\\n` +
            `Revisa el panel de administración o usa el botón de abajo para aprobarlo y entregarlo al instante.`;

          await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendMessage`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              chat_id: config.telegram_chat_id,
              text: message,
              parse_mode: 'Markdown',
              reply_markup: {
                inline_keyboard: [
                  [{ text: "✅ Aprobar y Entregar", callback_data: `approve_${order.id}` }]
                ]
              }
            })
          }).catch(e => console.error("Error enviando telegram:", e));
        }
      } catch (e) {
        console.error("Error al obtener config de telegram:", e);
      }

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
    
    const qrImageRows = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = 'qr_image_url' LIMIT 1`;
    const qrImageUrl = qrImageRows[0]?.value ?? null;

    return { order, items, qrImageUrl };
  });

export const submitPaymentProof = createServerFn({ method: "POST" })
  .validator((data) => z.object({
    orderId: z.string().uuid(),
    proof_url: z.string().url("URL inválida")
  }).parse(data))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();
    
    const [order] = await sql`UPDATE orders SET payment_proof_url = ${data.proof_url}, status = 'processing' WHERE id = ${data.orderId} RETURNING id, customer_name, total_usd`;
    if (!order) throw new Error("Orden no encontrada");

    try {
      const rows = await sql<{ key: string, value: string }[]>`SELECT key, value FROM settings WHERE key IN ('telegram_bot_token', 'telegram_chat_id')`;
      const config: Record<string, string> = {};
      for (const row of rows) config[row.key] = row.value;

      if (config.telegram_bot_token && config.telegram_chat_id) {
        const message = `🧾 *Comprobante Recibido*\\n\\n` +
          `*Cliente:* ${order.customer_name}\\n` +
          `*Total:* $${order.total_usd} USD\\n\\n` +
          `Por favor, verifica el pago en tu panel de administración.`;

        await fetch(`https://api.telegram.org/bot${config.telegram_bot_token}/sendPhoto`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: config.telegram_chat_id,
            photo: data.proof_url,
            caption: message,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [{ text: "✅ Aprobar y Entregar", callback_data: `approve_${order.id}` }]
              ]
            }
          })
        }).catch(e => console.error("Error enviando comprobante a telegram:", e));
      }
    } catch (e) {
      console.error("Error al notificar comprobante:", e);
    }
    
    return { success: true };
  });

export const getAdminOrders = createServerFn({ method: "GET" })
  .handler(async () => {
    const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();
    return sql`
      SELECT o.*, pm.name as payment_method_name 
      FROM orders o 
      LEFT JOIN payment_methods pm ON o.payment_method_id = pm.id 
      ORDER BY o.created_at DESC
    `;
  });

export const approveOrder = createServerFn({ method: "POST" })
  .validator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { requireAdmin } = await import("@/lib/admin-auth.server"); requireAdmin();
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();

    await executeOrderDelivery(data.orderId, sql);
    return { success: true };
  });

export const verifyBinancePayment = createServerFn({ method: "POST" })
  .validator((data) => z.object({ orderId: z.string().uuid() }).parse(data))
  .handler(async ({ data }) => {
    const { getDb } = await import("@/lib/db.server");
    const sql = getDb();
    
    const [order] = await sql`SELECT * FROM orders WHERE id = ${data.orderId}`;
    if (!order) throw new Error("Orden no encontrada");
    if (!order.tx_id) throw new Error("La orden no tiene un TX-ID asociado");
    if (order.status === 'delivered') return { success: true, message: "Ya entregada" };

    const rows = await sql<{ key: string, value: string }[]>`SELECT key, value FROM settings WHERE key IN ('binance_api_key', 'binance_secret_key')`;
    const config: Record<string, string> = {};
    for (const row of rows) config[row.key] = row.value;

    if (!config.binance_api_key || !config.binance_secret_key) {
      throw new Error("Las credenciales de Binance API no están configuradas en el administrador.");
    }

    const timestamp = Date.now();
    const queryString = `timestamp=${timestamp}&limit=100`;
    const signature = crypto.createHmac('sha256', config.binance_secret_key).update(queryString).digest('hex');

    const url = `https://api.binance.com/sapi/v1/pay/transactions?${queryString}&signature=${signature}`;
    
    const res = await fetch(url, {
      headers: {
        'X-MBX-APIKEY': config.binance_api_key
      }
    });

    const json = await res.json();
    if (!res.ok || json.code !== "000000") {
      throw new Error(`Error en API de Binance: ${json.msg || res.statusText}`);
    }

    const transactions = json.data || [];
    
    const tx = transactions.find((t: any) => t.transactionId === order.tx_id || t.orderId === order.tx_id);
    
    if (!tx) {
      throw new Error("No se encontró el pago en tu historial reciente de Binance Pay. Verifica que el TX-ID sea correcto o intenta de nuevo en unos minutos.");
    }
    
    if (tx.currency !== "USDT") {
      throw new Error(`La moneda recibida es ${tx.currency}, se esperaba USDT.`);
    }

    const amountReceived = parseFloat(tx.amount);
    if (amountReceived < order.total_usd) {
      throw new Error(`Monto insuficiente. Se recibió ${amountReceived} USDT, pero el pedido requiere ${order.total_usd} USDT.`);
    }

    // Pago verificado, ejecutamos la entrega
    await executeOrderDelivery(data.orderId, sql);

    return { success: true };
  });
