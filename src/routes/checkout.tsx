import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "@tanstack/react-query";
import { getPaymentMethods, createOrder } from "@/lib/orders.server";
import { getStorefrontData } from "@/lib/products.functions";
import { cartStore } from "@/lib/cartStore";
import { useSyncExternalStore, useState } from "react";
import { ArrowLeft, LoaderCircle, ShieldCheck, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  component: Checkout,
});

function Checkout() {
  const navigate = useNavigate();
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  
  const { data: storeData } = useQuery({ queryKey: ["storefront"], queryFn: () => getStorefrontData() });
  const { data: paymentMethods, isLoading: pmLoading } = useQuery({ queryKey: ["payment-methods"], queryFn: () => getPaymentMethods() });
  
  const currentRate = storeData?.dollarRate ?? 1;
  const totalUsd = cart.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);
  const totalFiat = totalUsd * currentRate;
  
  const requiresVerification = cart.items.some(i => i.provider_name === 'pixverify_verification');

  const [form, setForm] = useState({
    customer_name: "",
    customer_email: "",
    customer_phone: "",
    payment_method_id: "",
    tx_id: "",
    pixverify_email: "",
    pixverify_password: "",
    pixverify_totp: "",
  });

  const orderMutation = useMutation({
    mutationFn: (orderData: any) => createOrder({ data: orderData }),
    onSuccess: (res) => {
      cartStore.clear();
      toast.success("Pedido creado correctamente");
      navigate({ to: `/order/${res.orderId}` });
    },
    onError: (err: any) => {
      toast.error(err.message || "No se pudo crear el pedido");
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.items.length === 0) return toast.error("El carrito está vacío");
    if (!form.payment_method_id) return toast.error("Selecciona un método de pago");
    
    orderMutation.mutate({
      ...form,
      tx_id: form.tx_id || undefined,
      pixverify_email: requiresVerification ? form.pixverify_email : undefined,
      pixverify_password: requiresVerification ? form.pixverify_password : undefined,
      pixverify_totp: requiresVerification ? form.pixverify_totp : undefined,
      total_usd: totalUsd,
      total_fiat: totalFiat,
      items: cart.items.map(i => ({
        product_id: i.product_id,
        product_name: i.name,
        quantity: i.quantity,
        unit_price_usd: i.price_usd
      }))
    });
  };

  if (cart.items.length === 0 && !orderMutation.isSuccess) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center space-y-6">
        <Wallet className="w-20 h-20 text-muted-foreground/30" />
        <h1 className="text-3xl font-black">Tu carrito está vacío</h1>
        <p className="text-muted-foreground max-w-md">No tienes productos en tu carrito. Vuelve a la tienda para añadir los productos que desees comprar.</p>
        <Button asChild className="rounded-full h-12 px-8"><a href="/">Volver a la tienda</a></Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver
          </a>
          <div className="font-black tracking-tight flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-emerald-400" /> Pago Seguro</div>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-8 sm:pt-12 max-w-6xl">
        <h1 className="text-4xl sm:text-5xl font-black tracking-tighter mb-8 sm:mb-12">Checkout</h1>
        
        <div className="grid lg:grid-cols-12 gap-8 lg:gap-16">
          <div className="lg:col-span-7 space-y-8">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-8">
              <section className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">1</span> 
                  Tus Datos
                </h2>
                <div className="grid sm:grid-cols-2 gap-4">
                  <label className="space-y-2 col-span-full">
                    <span className="text-sm font-semibold text-muted-foreground">Nombre completo *</span>
                    <input required className="w-full h-12 bg-muted/50 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.customer_name} onChange={e => setForm({...form, customer_name: e.target.value})} placeholder="Ej. Juan Pérez" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-muted-foreground">Correo electrónico *</span>
                    <input required type="email" className="w-full h-12 bg-muted/50 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.customer_email} onChange={e => setForm({...form, customer_email: e.target.value})} placeholder="tu@correo.com" />
                  </label>
                  <label className="space-y-2">
                    <span className="text-sm font-semibold text-muted-foreground">WhatsApp / Teléfono *</span>
                    <input required type="tel" className="w-full h-12 bg-muted/50 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all" value={form.customer_phone} onChange={e => setForm({...form, customer_phone: e.target.value})} placeholder="+591 71234567" />
                  </label>
                </div>
              </section>

              {requiresVerification && (
                <section className="space-y-6">
                  <h2 className="text-2xl font-bold flex items-center gap-3 text-blue-400">
                    <span className="w-8 h-8 rounded-full bg-blue-500/20 text-blue-400 flex items-center justify-center text-sm"><ShieldCheck size={18}/></span> 
                    Datos de la Cuenta (PixVerify)
                  </h2>
                  <p className="text-sm text-slate-400">El producto que seleccionaste requiere que verifiquemos tu cuenta. Ingresa los datos de acceso para que el sistema procese tu pedido de forma automática.</p>
                  <div className="grid sm:grid-cols-2 gap-4 bg-blue-500/5 p-6 rounded-2xl border border-blue-500/20">
                    <label className="space-y-2 col-span-full">
                      <span className="text-sm font-semibold text-blue-300">Correo de la Cuenta *</span>
                      <input required type="email" className="w-full h-12 bg-black/40 border border-blue-500/30 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white" value={form.pixverify_email} onChange={e => setForm({...form, pixverify_email: e.target.value})} placeholder="correo@ejemplo.com" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-blue-300">Contraseña *</span>
                      <input required type="text" className="w-full h-12 bg-black/40 border border-blue-500/30 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white" value={form.pixverify_password} onChange={e => setForm({...form, pixverify_password: e.target.value})} placeholder="Tu contraseña" />
                    </label>
                    <label className="space-y-2">
                      <span className="text-sm font-semibold text-blue-300">Código TOTP (Autenticador)</span>
                      <input className="w-full h-12 bg-black/40 border border-blue-500/30 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all text-white" value={form.pixverify_totp} onChange={e => setForm({...form, pixverify_totp: e.target.value})} placeholder="Opcional" />
                    </label>
                  </div>
                </section>
              )}

              <section className="space-y-6">
                <h2 className="text-2xl font-bold flex items-center gap-3">
                  <span className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center text-sm">2</span> 
                  Método de Pago
                </h2>
                {pmLoading ? (
                  <div className="h-24 bg-muted/30 animate-pulse rounded-2xl border border-white/5 flex items-center justify-center"><LoaderCircle className="animate-spin text-muted-foreground"/></div>
                ) : (
                  <div className="grid gap-4">
                    {paymentMethods?.map((pm: any) => (
                      <div key={pm.id} className={`relative rounded-2xl border transition-all ${form.payment_method_id === pm.id ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-white/10 bg-muted/20'}`}>
                        <label className="flex cursor-pointer p-4 items-start focus:outline-none">
                          <input type="radio" name="payment_method" value={pm.id} className="sr-only" onChange={() => setForm({...form, payment_method_id: pm.id})} checked={form.payment_method_id === pm.id} />
                          <span className="flex flex-1">
                            <span className="flex flex-col">
                              <span className="block text-sm font-bold text-foreground">{pm.name}</span>
                              <span className="mt-1 flex items-center text-xs text-muted-foreground">{pm.type === 'crypto' ? 'Automático (Criptomonedas)' : 'Verificación Manual'}</span>
                            </span>
                          </span>
                          <CheckIcon className={`h-5 w-5 ${form.payment_method_id === pm.id ? 'text-primary' : 'invisible'}`} />
                        </label>
                        {form.payment_method_id === pm.id && storeData?.binancePayId && (pm.name.toLowerCase().includes('binance') || pm.type === 'crypto') && (
                          <div className="px-4 pb-4 pt-0">
                            <div className="p-4 bg-black/40 border border-white/5 rounded-xl space-y-4">
                              <p className="text-sm text-slate-300">
                                Envía <strong>${totalUsd.toFixed(2)} USDT</strong> mediante Binance Pay a este Pay ID:
                              </p>
                              <div className="flex gap-2">
                                <code className="flex-1 bg-black px-3 py-2 rounded text-emerald-400 font-mono text-lg text-center">{storeData.binancePayId}</code>
                              </div>
                              <div className="space-y-2 pt-2">
                                <span className="text-sm font-semibold text-muted-foreground">ID de Transacción (TX-ID) *</span>
                                <input 
                                  required 
                                  className="w-full h-10 bg-muted/50 border border-white/10 rounded-lg px-3 text-sm focus:ring-1 focus:ring-primary" 
                                  value={form.tx_id} 
                                  onChange={e => setForm({...form, tx_id: e.target.value})} 
                                  placeholder="Pegue aquí el TX-ID que le dio Binance" 
                                />
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </form>
          </div>

          <div className="lg:col-span-5">
            <div className="bg-card rounded-3xl sm:rounded-[3rem] border border-white/5 shadow-2xl p-5 sm:p-8 sticky top-24">
              <h3 className="text-xl font-bold mb-6">Resumen del Pedido</h3>
              <div className="space-y-4 max-h-[40vh] overflow-y-auto pr-2 mb-6">
                {cart.items.map(item => (
                  <div key={item.product_id} className="flex gap-3 sm:gap-4 items-center">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                      {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : null}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-xs sm:text-sm truncate text-foreground">{item.name}</p>
                      <p className="text-[10px] sm:text-xs text-muted-foreground">{item.quantity} x ${(item.price_usd * currentRate).toFixed(2)}</p>
                    </div>
                    <div className="font-bold text-xs sm:text-sm text-right whitespace-nowrap shrink-0">
                      ${(item.price_usd * item.quantity * currentRate).toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="border-t border-white/10 pt-6 space-y-4">
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground font-medium">
                    <span>Subtotal USD</span>
                    <span>${totalUsd.toFixed(2)} USD</span>
                  </div>
                  <div className="flex justify-between text-xs sm:text-sm text-muted-foreground font-medium">
                    <span>Tipo de cambio</span>
                    <span>1 USD = {currentRate}</span>
                  </div>
                  <div className="flex justify-between items-end pt-4 border-t border-white/10">
                    <span className="font-bold text-sm sm:text-base">Total a Pagar</span>
                    <div className="text-right min-w-0 flex-1 pl-4">
                      {currentRate !== 1 ? (
                        <>
                          <span className="block text-2xl sm:text-4xl font-black text-primary truncate">Bs. {totalFiat.toFixed(2)}</span>
                          <span className="text-xs sm:text-sm font-bold text-muted-foreground">${totalUsd.toFixed(2)} USD</span>
                        </>
                      ) : (
                        <span className="block text-2xl sm:text-4xl font-black text-primary truncate">${totalFiat.toFixed(2)} USD</span>
                      )}
                    </div>
                  </div>
                </div>

              <Button form="checkout-form" type="submit" disabled={orderMutation.isPending} className="w-full h-12 sm:h-14 rounded-xl sm:rounded-2xl bg-linear-to-r from-primary to-secondary font-black text-base sm:text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform mt-8">
                {orderMutation.isPending ? <LoaderCircle className="animate-spin" /> : "Confirmar Pedido"}
              </Button>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

function CheckIcon(props: React.ComponentProps<"svg">) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
