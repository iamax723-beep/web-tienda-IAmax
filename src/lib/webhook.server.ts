import { getDb } from "./db.server";

export async function handleTelegramWebhook(request: Request): Promise<Response> {
  try {
    const data = await request.json();
    
    // If it's a callback query from an inline button
    if (data.callback_query) {
      const query = data.callback_query;
      const callbackData = query.data; // e.g. "approve_ORDERID"
      const chatId = query.message.chat.id;
      const messageId = query.message.message_id;

      if (callbackData && callbackData.startsWith("approve_")) {
        const orderId = callbackData.replace("approve_", "");
        
        try {
          const sql = getDb();
          const [order] = await sql`SELECT * FROM orders WHERE id = ${orderId}`;
          
          if (!order) {
            await sendTelegramMessage(chatId, "⚠️ Orden no encontrada.");
            return new Response("Order not found", { status: 200 });
          }
          if (order.status === 'delivered') {
            await editTelegramMessageText(chatId, messageId, "✅ Esta orden ya fue aprobada y entregada previamente.");
            return new Response("Already delivered", { status: 200 });
          }

          const items = await sql`
            SELECT oi.*, p.store_id, p.external_id as provider_id 
            FROM order_items oi 
            JOIN products p ON oi.product_id = p.id 
            WHERE oi.order_id = ${orderId}
          `;

          let allKeys: string[] = [];
          
          for (const item of items) {
            if (!item.store_id || !item.provider_id) throw new Error(`El producto ${item.product_name} no tiene proveedor.`);
            
            const [store] = await sql`SELECT * FROM stores WHERE id = ${item.store_id}`;
            if (!store || !store.api_key) throw new Error(`Sin API Key para el proveedor.`);

            const purchaseUrl = store.purchase_url || `${store.api_url.split('/v1')[0]}/v1/orders`;
            
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
              throw new Error(result.error?.message || result.error || result.message || "Error en API");
            }

            const keys = result.credentials || result.data?.keys || result.keys || [];
            allKeys.push(...keys.map((k: string) => `${item.product_name}: ${k}`));
          }

          const keysText = allKeys.join("\\n");
          await sql`UPDATE orders SET status = 'delivered', provider_order_id = ${keysText} WHERE id = ${orderId}`;

          const newText = query.message.text + "\\n\\n✅ *¡Aprobado y Entregado Exitosamente!*";
          await editTelegramMessageText(chatId, messageId, newText);
          
        } catch (e: any) {
          console.error("Error approving order from Telegram:", e);
          await sendTelegramMessage(chatId, `❌ *Error al entregar:*\\n${e.message}`);
        }
      }
    }
    
    return new Response("OK", { status: 200 });
  } catch (e) {
    console.error("Webhook Error:", e);
    return new Response("Error", { status: 500 });
  }
}

async function getTelegramToken() {
  const sql = getDb();
  const rows = await sql<{ value: string }[]>`SELECT value FROM settings WHERE key = 'telegram_bot_token'`;
  return rows[0]?.value;
}

async function sendTelegramMessage(chatId: string, text: string) {
  const token = await getTelegramToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' })
  });
}

async function editTelegramMessageText(chatId: string, messageId: number, text: string) {
  const token = await getTelegramToken();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup: { inline_keyboard: [] } })
  });
}
