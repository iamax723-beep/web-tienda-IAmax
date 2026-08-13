import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getOrder, submitPaymentProof, verifyBinancePayment } from "@/lib/orders.server";
import { useState, useEffect } from "react";
import { ArrowLeft, CheckCircle2, Clock, Copy, LoaderCircle, Upload, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/order/$id")({
  component: OrderPage,
});

function OrderPage() {
  const { id } = Route.useParams();
  const queryClient = useQueryClient();
  const [proofUrl, setProofUrl] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["order", id],
    queryFn: () => getOrder({ data: { orderId: id } }),
    refetchInterval: 10000, // Refetch every 10s to see status changes
  });

  const proofMutation = useMutation({
    mutationFn: () => submitPaymentProof({ data: { orderId: id, proof_url: proofUrl } }),
    onSuccess: () => {
      toast.success("Comprobante enviado. Espera la verificación.");
      setProofUrl("");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (err: any) => toast.error(err.message || "Error al enviar"),
  });

  const verifyMutation = useMutation({
    mutationFn: () => verifyBinancePayment({ data: { orderId: id } }),
    onSuccess: () => {
      toast.success("¡Pago verificado exitosamente!");
      queryClient.invalidateQueries({ queryKey: ["order", id] });
    },
    onError: (err: any) => toast.error(err.message || "No se pudo verificar el pago"),
  });

  // Intentar verificar automáticamente la primera vez si es crypto
  useEffect(() => {
    if (data?.order?.payment_method_type === 'crypto' && data?.order?.status === 'pending' && data?.order?.tx_id) {
      if (!verifyMutation.isPending && !verifyMutation.isSuccess) {
        verifyMutation.mutate();
      }
    }
  }, [data?.order?.status, data?.order?.payment_method_type]);

  if (isLoading) return <div className="min-h-screen flex items-center justify-center"><LoaderCircle className="animate-spin w-12 h-12 text-primary" /></div>;
  if (error || !data) return <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-red-400"><p>Orden no encontrada</p><a href="/" className="underline">Volver a la tienda</a></div>;

  const { order, items } = data;
  const isPending = order.status === "pending";
  const isProcessing = order.status === "processing";
  const isCompleted = order.status === "completed" || order.status === "delivered";

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copiado al portapapeles");
  };

  return (
    <div className="min-h-screen bg-background pb-24">
      <header className="border-b bg-card/50 backdrop-blur-md sticky top-0 z-50">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <a href="/" className="flex items-center gap-2 text-muted-foreground hover:text-white transition-colors font-medium text-sm">
            <ArrowLeft className="w-4 h-4" /> Volver a la tienda
          </a>
        </div>
      </header>

      <main className="container mx-auto px-4 sm:px-6 pt-12 max-w-4xl">
        <div className="text-center space-y-4 mb-12">
          {isPending && <Clock className="w-16 h-16 text-yellow-500 mx-auto" />}
          {isProcessing && <LoaderCircle className="w-16 h-16 text-blue-500 mx-auto animate-spin" />}
          {isCompleted && <CheckCircle2 className="w-16 h-16 text-green-500 mx-auto" />}
          
          <h1 className="text-3xl font-black">
            {isPending ? "Pendiente de Pago" : isProcessing ? "Verificando Pago" : isCompleted ? "¡Pedido Entregado!" : "Estado: " + order.status}
          </h1>
          <p className="text-muted-foreground">ID del Pedido: <span className="font-mono text-white">{order.id}</span></p>
        </div>

        <div className="grid md:grid-cols-2 gap-8">
          <div className="space-y-8">
            <section className="bg-card rounded-[2rem] border border-white/5 p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-6">Detalles del Cliente</h2>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-muted-foreground">Nombre:</span><span className="font-medium text-white">{order.customer_name}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Email:</span><span className="font-medium text-white">{order.customer_email}</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Teléfono:</span><span className="font-medium text-white">{order.customer_phone}</span></div>
              </div>
            </section>

            <section className="bg-card rounded-[2rem] border border-white/5 p-8 shadow-xl">
              <h2 className="text-xl font-bold mb-6">Resumen de Productos</h2>
              <div className="space-y-4">
                {items.map((item: any) => (
                  <div key={item.id} className="flex justify-between items-center pb-4 border-b border-white/5 last:border-0 last:pb-0">
                    <div>
                      <p className="font-semibold text-white">{item.product_name}</p>
                      <p className="text-xs text-muted-foreground">Cantidad: {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex justify-between items-end">
                  <span className="text-muted-foreground font-medium">Total Pagado:</span>
                  <div className="text-right">
                    <span className="block text-3xl font-black text-primary">${order.total_fiat}</span>
                    <span className="text-xs text-muted-foreground font-semibold uppercase tracking-widest">${order.total_usd} USD</span>
                  </div>
                </div>
              </div>
            </section>
          </div>

          <div className="space-y-8">
            <section className="bg-linear-to-br from-primary/10 to-secondary/10 rounded-[2rem] border border-primary/20 p-8 shadow-xl relative overflow-hidden">
              <div className="absolute top-0 right-0 p-4 opacity-10"><Wallet className="w-32 h-32" /></div>
              <h2 className="text-xl font-bold mb-2 relative z-10">Instrucciones de Pago</h2>
              <p className="text-sm font-semibold text-primary relative z-10 mb-6">{order.payment_method_name}</p>
              
              <div className="prose prose-sm prose-invert relative z-10 whitespace-pre-wrap text-muted-foreground">
                {order.payment_instructions || "No hay instrucciones adicionales."}
              </div>
              
              {data.qrImageUrl && order.payment_method_type === 'manual' && isPending && (
                <div className="mt-6 relative z-10 text-center">
                  <p className="text-sm text-slate-300 font-semibold mb-3">Escanea este QR para pagar:</p>
                  <img src={data.qrImageUrl} alt="QR de Pago" className="w-48 h-48 mx-auto rounded-xl border border-white/10 shadow-lg object-contain bg-white" />
                </div>
              )}

              {order.payment_method_type === 'crypto' && (isPending || isProcessing) && (
                <div className="mt-8 relative z-10 p-6 bg-black/40 rounded-xl border border-white/10 text-center space-y-4">
                  <p className="font-bold text-white">Verificación Automática con Binance</p>
                  <p className="text-sm text-muted-foreground">Estamos verificando tu pago con el TX-ID: <strong className="text-white">{order.tx_id}</strong></p>
                  
                  <Button 
                    onClick={() => verifyMutation.mutate()} 
                    disabled={verifyMutation.isPending} 
                    className="h-12 w-full bg-emerald-500 hover:bg-emerald-600 text-white font-bold"
                  >
                    {verifyMutation.isPending ? <LoaderCircle className="animate-spin w-5 h-5 mr-2" /> : null}
                    {verifyMutation.isPending ? "Verificando en Binance..." : "Reintentar Verificación"}
                  </Button>
                </div>
              )}

              {order.payment_method_type === 'manual' && isPending && (
                <div className="mt-8 relative z-10 space-y-4">
                  <h3 className="font-bold text-white">Subir comprobante</h3>
                  <p className="text-sm text-muted-foreground">Sube tu comprobante a un servicio como Imgur o similar y pega la URL aquí para que el administrador verifique tu pago.</p>
                  <div className="flex gap-2">
                    <input type="url" value={proofUrl} onChange={(e) => setProofUrl(e.target.value)} placeholder="https://..." className="flex-1 h-12 bg-black/50 border border-white/10 rounded-xl px-4 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm" />
                    <Button onClick={() => proofMutation.mutate()} disabled={!proofUrl || proofMutation.isPending} className="h-12 bg-primary hover:bg-primary/80">
                      {proofMutation.isPending ? <LoaderCircle className="animate-spin w-4 h-4" /> : <Upload className="w-4 h-4" />}
                    </Button>
                  </div>
                </div>
              )}

              {isProcessing && (
                <div className="mt-8 relative z-10 p-6 bg-blue-500/10 rounded-xl border border-blue-500/20 text-center space-y-2">
                  <p className="font-bold text-blue-400">Comprobante enviado</p>
                  <p className="text-sm text-blue-400/80">El administrador está verificando tu pago. Esta página se actualizará automáticamente.</p>
                  {order.payment_proof_url && (
                    <div className="mt-4 flex justify-center">
                      <img 
                        src={order.payment_proof_url} 
                        alt="Comprobante Subido" 
                        className="max-w-[200px] w-full rounded-xl border border-white/10 shadow-lg object-cover" 
                      />
                    </div>
                  )}
                </div>
              )}

            </section>

            {isCompleted && order.provider_order_id && (
              <section className="bg-emerald-500/10 rounded-[2rem] border border-emerald-500/20 p-8 shadow-xl mt-8">
                <div className="flex items-center gap-3 mb-6">
                  <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                  <h2 className="text-xl font-bold text-emerald-400">Tus Productos / Keys</h2>
                </div>
                <div className="bg-black/40 rounded-xl p-4 border border-emerald-500/10 relative group">
                  <pre className="text-sm font-mono text-emerald-100 whitespace-pre-wrap">{order.provider_order_id}</pre>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-emerald-500/20 text-emerald-300"
                    onClick={() => copyToClipboard(order.provider_order_id)}
                  >
                    <Copy className="w-4 h-4" />
                  </Button>
                </div>
                <p className="text-xs text-emerald-400/60 mt-4 text-center">Guarda esta información en un lugar seguro.</p>
              </section>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
