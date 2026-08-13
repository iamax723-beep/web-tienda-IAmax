import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getStorefrontData } from "@/lib/products.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Settings, ShoppingCart, X } from "lucide-react";
import { cartStore } from "@/lib/cartStore";
import { toast } from "sonner";
import { useSyncExternalStore } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { getFileUrl } from "@/lib/supabase.client";
import { Copy, Plus, Minus, Search, Smartphone, Ticket, Package, MapPin, Zap } from "lucide-react";

const storeColors = [
  { text: 'text-violet-500', bg: 'bg-violet-500', bgLight: 'bg-violet-500/20', hover: 'hover:bg-violet-600', shadow: 'hover:shadow-violet-500/20', border: 'border-violet-500/10' },
  { text: 'text-emerald-500', bg: 'bg-emerald-500', bgLight: 'bg-emerald-500/20', hover: 'hover:bg-emerald-600', shadow: 'hover:shadow-emerald-500/20', border: 'border-emerald-500/10' },
  { text: 'text-blue-500', bg: 'bg-blue-500', bgLight: 'bg-blue-500/20', hover: 'hover:bg-blue-600', shadow: 'hover:shadow-blue-500/20', border: 'border-blue-500/10' },
  { text: 'text-rose-500', bg: 'bg-rose-500', bgLight: 'bg-rose-500/20', hover: 'hover:bg-rose-600', shadow: 'hover:shadow-rose-500/20', border: 'border-rose-500/10' },
  { text: 'text-amber-500', bg: 'bg-amber-500', bgLight: 'bg-amber-500/20', hover: 'hover:bg-amber-600', shadow: 'hover:shadow-amber-500/20', border: 'border-amber-500/10' },
  { text: 'text-cyan-500', bg: 'bg-cyan-500', bgLight: 'bg-cyan-500/20', hover: 'hover:bg-cyan-600', shadow: 'hover:shadow-cyan-500/20', border: 'border-cyan-500/10' },
];

function getStoreColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return storeColors[Math.abs(hash) % storeColors.length];
}

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    title: "IAmax - Storefront",
    meta: [
      { name: "description", content: "Explore products from our partner stores with real-time pricing." },
    ],
  }),
});

function Index() {
  const { data, isLoading: productsLoading } = useQuery({
    queryKey: ["storefront"],
    queryFn: () => getStorefrontData(),
  });
  const products = data?.products ?? [];
  const currentRate = data?.dollarRate ?? 1;

  return (
    <div className="min-h-screen bg-background relative overflow-hidden text-foreground">
      {/* Animated Background Elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-primary/20 blur-[120px] mix-blend-screen animate-pulse" />
        <div className="absolute top-[20%] right-[10%] w-[30%] h-[50%] rounded-full bg-secondary/20 blur-[140px] mix-blend-screen animate-pulse" style={{ animationDelay: '2s', animationDuration: '8s' }} />
        <div className="absolute -bottom-[20%] left-[20%] w-[50%] h-[40%] rounded-full bg-blue-500/10 blur-[130px] mix-blend-screen animate-pulse" style={{ animationDelay: '4s', animationDuration: '10s' }} />
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-[0.03]" />
      </div>

      {/* Hero Section */}
      <div className="relative pt-24 pb-32">
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center">
            <div className="space-y-6 animate-in fade-in slide-in-from-top duration-1000">
              <div className="inline-block px-4 py-1.5 bg-primary/10 backdrop-blur-md rounded-full border border-primary/20 mb-4 shadow-[0_0_15px_rgba(var(--color-primary),0.2)]">
                <span className="text-primary text-xs font-bold uppercase tracking-[0.3em]">Bienvenido a la Nueva Era</span>
              </div>
              <h1 className="text-7xl font-black tracking-tighter sm:text-9xl drop-shadow-2xl bg-clip-text text-transparent bg-linear-to-r from-foreground via-primary to-secondary">
                IAmax
              </h1>
              <p className="text-2xl text-muted-foreground max-w-xl font-medium leading-relaxed drop-shadow-md">
                Tecnología de vanguardia y precios sincronizados al instante.
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-card/40 hover:bg-card/80 border border-white/5 backdrop-blur-xl transition-all duration-300 group hover:scale-110 shadow-lg" title="Administración">
              <a href="/admin">
                <Settings className="w-6 h-6 text-foreground group-hover:rotate-90 transition-transform duration-500" />
              </a>
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 -mt-12 relative z-20 space-y-12 pb-24">
        {/* Exchange Rate Card */}
        <Card className="border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/60 backdrop-blur-3xl overflow-hidden group hover:border-primary/30 transition-all duration-700">
          <CardContent className="p-10 relative">
            <div className="absolute inset-0 bg-linear-to-r from-primary/5 via-transparent to-secondary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-700" />
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left relative z-10">
              <div className="space-y-2">
                <div className="flex items-center gap-2 justify-center md:justify-start">
                  <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
                  <h3 className="text-sm font-black text-primary uppercase tracking-[0.3em]">Tipo de Cambio en Vivo</h3>
                </div>
                <p className="text-muted-foreground font-semibold text-lg">Cotización garantizada para hoy</p>
              </div>
              <div className="flex items-center gap-6 bg-linear-to-r from-primary/10 to-secondary/10 px-12 py-6 rounded-3xl border border-primary/20 shadow-inner group-hover:scale-[1.02] transition-all duration-500">
                <span className="text-3xl font-bold text-primary/70">1 USD =</span>
                <span className="text-6xl font-black text-transparent bg-clip-text bg-linear-to-r from-primary to-secondary tracking-tighter drop-shadow-sm">
                  {currentRate}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Product Section */}
        <div className="space-y-8">
          <div className="flex items-end justify-between border-b pb-6">
            <h2 className="text-3xl font-bold tracking-tight">Catálogo Exclusivo</h2>
            <p className="text-sm text-muted-foreground font-medium bg-muted px-4 py-1.5 rounded-full italic">
              {products?.length || 0} Productos sincronizados
            </p>
          </div>

          <div>
            {productsLoading ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {Array.from({ length: 10 }).map((_, i) => (
                  <div key={i} className="space-y-4 animate-pulse">
                    <div className="aspect-video bg-muted rounded-2xl" />
                    <div className="h-4 bg-muted rounded w-3/4" />
                    <div className="h-6 bg-muted rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products?.length === 0 ? (
              <div className="py-24 text-center space-y-4">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Settings className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No hay productos disponibles actualmente.</p>
              </div>
            ) : (
              Object.entries(
                products?.reduce((acc: any, product: any) => {
                  let storeName = product.stores?.name || 'Otros Productos';
                  if (!acc[storeName]) acc[storeName] = [];
                  acc[storeName].push(product);
                  return acc;
                }, {}) || {}
              ).map(([storeName, storeProducts]: [string, any]) => {
                const storeColor = getStoreColor(storeName);
                return (
                <div key={storeName} className="mb-12">
                  <h3 className="text-2xl font-bold mb-6 flex items-center gap-3">
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center ${storeColor.bgLight} ${storeColor.text}`}><Settings className="w-4 h-4"/></span>
                    {storeName}
                  </h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                    {storeProducts.map((product: any) => (
                      <Card key={product.id} className={`group border shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden rounded-2xl bg-card flex flex-col hover:-translate-y-1 ${storeColor.border} ${storeColor.shadow}`}>
                        <div className="relative aspect-video overflow-hidden">
                          {product.custom_image_url || product.image_url ? (
                            <img 
                              src={product.custom_image_url || product.image_url} 
                              alt={product.name} 
                              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" 
                            />
                          ) : (
                            <div className="w-full h-full bg-muted flex items-center justify-center">
                              <Settings className="w-8 h-8 text-muted-foreground/20" />
                            </div>
                          )}
                          <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent opacity-80" />
                          <div className="absolute top-3 left-3 right-3 flex justify-between items-start">
                            {product.warranty_days ? (
                              <span className="px-2 py-1 bg-yellow-500/90 backdrop-blur-md text-white font-bold rounded-md text-[8px] uppercase tracking-wider shadow-md">
                                {product.warranty_days}D Garantía
                              </span>
                            ) : <div/>}
                            {product.stock !== null && product.stock !== undefined && (
                              <span className={`px-2 py-1 backdrop-blur-md font-bold rounded-md text-[8px] uppercase tracking-wider shadow-sm ${product.stock > 0 ? 'bg-green-500/80 text-white' : 'bg-red-500/80 text-white'}`}>
                                {product.stock > 0 ? `${product.stock} stock` : 'Agotado'}
                              </span>
                            )}
                          </div>
                          <div className="absolute bottom-3 left-3 right-3">
                            <h3 className="font-bold text-sm sm:text-base text-white leading-tight line-clamp-2 drop-shadow-md">
                              {product.name}
                            </h3>
                          </div>
                        </div>
                        <CardContent className="p-4 sm:p-5 flex-1 flex flex-col justify-between bg-card">
                          <div className="flex items-end justify-between gap-2">
                            <div className="flex flex-col min-w-0">
                              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-wider">Precio</span>
                              <div className="flex flex-col truncate">
                                <span className={`text-xl sm:text-2xl font-black tracking-tight truncate ${storeColor.text}`}>
                                  ${Number(product.custom_usd_price ?? (product.original_price * (1 + (data?.profitMargin || 0) / 100))).toFixed(2)}
                                </span>
                                {currentRate !== 1 && (
                                  <span className="text-[10px] sm:text-xs font-bold text-muted-foreground truncate">
                                    ≈ Bs. {(Number(product.custom_usd_price ?? (product.original_price * (1 + (data?.profitMargin || 0) / 100))) * currentRate).toFixed(2)}
                                  </span>
                                )}
                              </div>
                            </div>
                            <Button size="icon" className={`rounded-xl h-10 w-10 sm:h-12 sm:w-12 transition-all active:scale-95 shrink-0 shadow-md ${storeColor.bg} ${storeColor.hover} text-white`} disabled={product.stock === 0} onClick={() => {
                              cartStore.addItem({
                                product_id: product.id,
                                name: product.name,
                                price_usd: Number(product.custom_usd_price ?? (product.original_price * (1 + (data?.profitMargin || 0) / 100))),
                                image_url: product.custom_image_url || product.image_url,
                                store_name: product.stores?.name,
                                warranty_days: product.warranty_days,
                                provider_name: product.provider_name
                              });
                              toast.success("Añadido al carrito");
                            }}>
                              <ShoppingCart className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>
              )})
            )}
          </div>
        </div>
      </div>

      <footer className="bg-muted/30 py-16 border-t border-border mt-24">
        <div className="container mx-auto px-6 flex flex-col items-center space-y-6">
          <div className="text-3xl font-black text-primary/40 tracking-tighter">IAmax</div>
          <p className="text-sm text-muted-foreground font-medium">
            &copy; {new Date().getFullYear()} IAmax. Excelencia en sincronización digital.
          </p>
          <div className="flex gap-8">
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Privacidad</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Términos</a>
            <a href="#" className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-primary transition-colors">Contacto</a>
          </div>
        </div>
      </footer>

      <CartOverlay currentRate={currentRate} />
    </div>
  );
}

function CartOverlay({ currentRate }: { currentRate: number }) {
  const cart = useSyncExternalStore(cartStore.subscribe, cartStore.getSnapshot, cartStore.getServerSnapshot);
  const totalUsd = cart.items.reduce((sum, item) => sum + item.price_usd * item.quantity, 0);
  const itemCount = cart.items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button className="fixed bottom-8 right-8 h-16 w-16 rounded-full shadow-2xl bg-linear-to-br from-primary to-secondary p-0 z-50 hover:scale-105 transition-transform" aria-label="Abrir carrito">
          <div className="relative">
            <ShoppingCart className="w-6 h-6 text-white" />
            {itemCount > 0 && (
              <span className="absolute -top-3 -right-3 bg-red-500 text-white text-xs font-bold w-6 h-6 flex items-center justify-center rounded-full border-2 border-white shadow-md">
                {itemCount}
              </span>
            )}
          </div>
        </Button>
      </SheetTrigger>
      <SheetContent className="w-full sm:max-w-md flex flex-col h-full z-[100] bg-card/95 backdrop-blur-xl border-l-primary/10">
        <SheetHeader>
          <SheetTitle className="text-2xl font-black flex items-center gap-2"><ShoppingCart className="w-6 h-6 text-primary"/> Tu Carrito</SheetTitle>
          <SheetDescription>Revisa los productos antes de pagar</SheetDescription>
        </SheetHeader>
        
        <div className="flex-1 overflow-y-auto py-6 space-y-4 pr-2">
          {cart.items.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center space-y-4 opacity-50">
              <ShoppingCart className="w-16 h-16" />
              <p className="font-semibold">Tu carrito está vacío</p>
            </div>
          ) : (
            cart.items.map(item => (
              <div key={item.product_id} className="flex gap-4 p-4 bg-muted/30 rounded-2xl border border-white/5 relative group">
                <div className="w-20 h-24 rounded-xl overflow-hidden shrink-0 bg-muted">
                  {item.image_url ? <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" /> : <Settings className="w-8 h-8 m-auto mt-8 opacity-20"/>}
                </div>
                <div className="flex-1 flex flex-col justify-between">
                  <div>
                    <h4 className="font-bold text-sm line-clamp-2 leading-tight">{item.name}</h4>
                    <p className="text-xs text-muted-foreground mt-1">{item.store_name}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <div className="flex flex-col">
                      <span className="font-black text-primary">${item.price_usd.toFixed(2)} USD</span>
                      {currentRate !== 1 && <span className="text-[10px] text-muted-foreground font-bold">≈ Bs. {(item.price_usd * currentRate).toFixed(2)}</span>}
                    </div>
                    <div className="flex items-center gap-2 bg-background rounded-full border px-1">
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => cartStore.updateQuantity(item.product_id, item.quantity - 1)}>-</Button>
                      <span className="text-xs font-bold w-4 text-center">{item.quantity}</span>
                      <Button variant="ghost" size="icon" className="h-6 w-6 rounded-full" onClick={() => cartStore.updateQuantity(item.product_id, item.quantity + 1)}>+</Button>
                    </div>
                  </div>
                </div>
                <button className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity text-red-400 hover:text-red-500 bg-background/80 rounded-full p-1" onClick={() => cartStore.removeItem(item.product_id)}><X className="w-4 h-4"/></button>
              </div>
            ))
          )}
        </div>

        {cart.items.length > 0 && (
          <div className="pt-6 border-t border-primary/10 space-y-4">
            <div className="flex justify-between text-lg items-center">
              <span className="font-bold text-muted-foreground">Total:</span>
              <div className="text-right">
                <span className="block font-black text-3xl text-primary">${totalUsd.toFixed(2)} <span className="text-xl">USD</span></span>
                {currentRate !== 1 && <span className="text-sm text-muted-foreground font-bold">≈ Bs. {(totalUsd * currentRate).toFixed(2)}</span>}
              </div>
            </div>
            <Button className="w-full h-14 rounded-2xl bg-linear-to-r from-primary to-secondary font-black text-lg shadow-xl shadow-primary/20 hover:scale-[1.02] transition-transform" asChild>
              <a href="/checkout">Proceder al Pago</a>
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
