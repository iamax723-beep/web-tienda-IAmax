import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { getStorefrontData } from "@/lib/products.functions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Settings } from "lucide-react";

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
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <div className="relative overflow-hidden bg-linear-to-br from-primary via-secondary to-background pt-24 pb-32">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
        <div className="container mx-auto px-6 relative z-10">
          <div className="flex justify-between items-center">
            <div className="space-y-6 animate-in fade-in slide-in-from-top duration-1000">
              <div className="inline-block px-4 py-1.5 bg-white/20 backdrop-blur-md rounded-full border border-white/30 mb-4">
                <span className="text-white text-xs font-bold uppercase tracking-[0.3em]">Bienvenido a la Nueva Era</span>
              </div>
              <h1 className="text-7xl font-black text-white tracking-tighter sm:text-9xl drop-shadow-2xl">
                IAmax
              </h1>
              <p className="text-2xl text-white/90 max-w-xl font-semibold leading-relaxed drop-shadow-md">
                Tecnología de vanguardia y precios sincronizados al instante.
              </p>
            </div>
            <Button variant="ghost" size="icon" asChild className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-xl transition-all duration-300 group" title="Administración">
              <a href="/admin">
                <Settings className="w-6 h-6 text-white group-hover:rotate-90 transition-transform duration-500" />
              </a>
            </Button>
          </div>
        </div>
        
        {/* Decorative elements */}
        <div className="absolute -top-24 -right-24 w-[500px] h-[500px] bg-primary/30 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute -bottom-24 -left-24 w-[500px] h-[500px] bg-secondary/30 rounded-full blur-[120px] animate-pulse" />
      </div>

      <div className="container mx-auto px-6 -mt-12 relative z-20 space-y-12 pb-24">
        {/* Exchange Rate Card */}
        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.1)] shadow-primary/10 bg-card/95 backdrop-blur-2xl overflow-hidden group ring-1 ring-primary/5">
          <CardContent className="p-10">
            <div className="flex flex-col md:flex-row items-center justify-between gap-8 text-center md:text-left">
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

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {productsLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="space-y-4 animate-pulse">
                  <div className="aspect-square bg-muted rounded-3xl" />
                  <div className="h-4 bg-muted rounded w-3/4" />
                  <div className="h-6 bg-muted rounded w-1/2" />
                </div>
              ))
            ) : products?.length === 0 ? (
              <div className="col-span-full py-24 text-center space-y-4">
                <div className="w-20 h-20 bg-muted rounded-full mx-auto flex items-center justify-center">
                  <Settings className="w-10 h-10 text-muted-foreground/40" />
                </div>
                <p className="text-muted-foreground font-medium">No hay productos disponibles actualmente.</p>
              </div>
            ) : products?.map((product: any) => (
              <Card key={product.id} className="group border border-primary/5 shadow-xl hover:shadow-[0_30px_60px_-15px_rgba(0,0,0,0.2)] hover:shadow-primary/20 transition-all duration-700 overflow-hidden rounded-[3rem] bg-card flex flex-col hover:-translate-y-2">
                <div className="relative aspect-[4/5] overflow-hidden">
                  {product.custom_image_url || product.image_url ? (
                    <img 
                      src={product.custom_image_url || product.image_url} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full bg-muted flex items-center justify-center">
                      <Settings className="w-16 h-16 text-muted-foreground/10" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-linear-to-t from-black/80 via-transparent to-transparent opacity-60 group-hover:opacity-40 transition-opacity duration-500" />
                  <div className="absolute top-6 left-6 right-6 flex flex-col gap-2 items-start">
                    <div className="flex justify-between items-start w-full">
                      <span className="px-5 py-2 bg-primary/90 backdrop-blur-xl text-white font-black rounded-2xl text-[10px] uppercase tracking-[0.2em] shadow-2xl border border-white/20">
                        {product.stores?.name}
                      </span>
                      {product.stock !== null && product.stock !== undefined && (
                        <span className={`px-4 py-1.5 backdrop-blur-xl font-bold rounded-xl text-[10px] uppercase tracking-wider shadow-lg border ${product.stock > 0 ? 'bg-green-500/80 text-white border-green-400/30' : 'bg-red-500/80 text-white border-red-400/30'}`}>
                          {product.stock > 0 ? `${product.stock} en stock` : 'Agotado'}
                        </span>
                      )}
                    </div>
                    {product.warranty_days ? (
                      <span className="px-3 py-1 bg-yellow-500/90 backdrop-blur-xl text-white font-black rounded-xl text-[9px] uppercase tracking-[0.2em] shadow-xl border border-yellow-300/30 flex items-center gap-1">
                        <Settings className="w-3 h-3" /> Garantía: {product.warranty_days} días
                      </span>
                    ) : null}
                  </div>
                  <div className="absolute bottom-6 left-6 right-6">
                     <h3 className="font-bold text-xl text-white leading-tight line-clamp-2 drop-shadow-md">
                        {product.name}
                      </h3>
                  </div>
                </div>
                <CardContent className="p-8 flex-1 flex flex-col justify-between bg-linear-to-b from-card to-background">
                  <div className="space-y-4">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">Precio Base</span>
                      <span className="text-sm line-through text-muted-foreground/60 font-bold">${product.original_price} USD</span>
                    </div>
                  </div>
                  <div className="mt-8 pt-6 border-t border-primary/10 flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-primary uppercase tracking-[0.2em]">Precio IAmax</span>
                      <span className="text-4xl font-black text-primary tracking-tighter">
                        ${(Number(product.custom_usd_price ?? product.original_price) * currentRate).toFixed(2)}
                      </span>
                    </div>
                    <Button size="icon" className="rounded-full h-14 w-14 bg-linear-to-tr from-primary to-secondary hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-primary/30 transition-all duration-500 group/btn active:scale-95" disabled={product.stock === 0}>
                      <Settings className="w-6 h-6 text-white group-hover/btn:rotate-180 transition-transform duration-700" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
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
    </div>
  );
}
