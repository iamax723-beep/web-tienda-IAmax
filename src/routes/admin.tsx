import { createFileRoute } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Activity, ArrowLeft, CheckCircle2, CloudCog, Database, Eye, EyeOff,
  KeyRound, LoaderCircle, PackageCheck, Pencil, Plus, RefreshCw, Search,
  ShieldCheck, Store, Trash2, X, Zap, LogOut
} from "lucide-react";
import {
  deleteApiConnection, listApiConnections, saveApiConnection,
  syncStoreProducts, testApiConnection, updateDollarRate,
} from "@/lib/products.functions";

// Verifica autenticación desde el servidor (cookie firmada)
const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdminAuthorized } = await import("@/lib/admin-auth.server");
  return isAdminAuthorized();
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const isAuth = await checkAuth();
    return { isAuth };
  },
  component: Admin,
  head: () => ({
    title: "IAmax Hub — Centro de APIs",
    meta: [{ name: "description", content: "Conecta, prueba y sincroniza todas tus APIs de productos desde un solo lugar." }],
  }),
});

type ApiConnection = Awaited<ReturnType<typeof listApiConnections>>[number];
type AuthType = "none" | "bearer" | "header" | "query";

const emptyForm = {
  id: undefined as string | undefined,
  name: "", api_url: "", purchase_url: "", api_key: "",
  auth_type: "bearer" as AuthType, auth_header: "Authorization", products_path: "",
  field_mapping: { id: "id", name: "name", description: "description", price: "price", image: "image" },
  enabled: true,
};

function Admin() {
  const queryClient = useQueryClient();
  const [form, setForm] = useState(emptyForm);
  const [showForm, setShowForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"connections" | "inventory" | "orders">("connections");
  const [showKey, setShowKey] = useState(false);
  const [search, setSearch] = useState("");
  const [rate, setRate] = useState("");
  const [margin, setMargin] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);
  const { isAuth } = Route.useRouteContext();

  useEffect(() => {
    if (!isAuth) {
      window.location.href = "/login";
    }
  }, [isAuth]);

  const connectionsQuery = useQuery({ 
    queryKey: ["api-connections"], 
    queryFn: () => listApiConnections(),
    enabled: isAuth
  });
  const connections = connectionsQuery.data ?? [];
  const filtered = useMemo(() => connections.filter((item) =>
    item.name.toLowerCase().includes(search.toLowerCase()) || item.api_url.toLowerCase().includes(search.toLowerCase())), [connections, search]);
  const connected = connections.filter((item) => item.last_status === "connected").length;
  const productTotal = connections.reduce((sum, item) => sum + (item.product_count || 0), 0);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["api-connections"] });
  const saveMutation = useMutation({
    mutationFn: () => saveApiConnection({ data: form }),
    onSuccess: async () => { toast.success(form.id ? "Conexión actualizada" : "API añadida correctamente"); setForm(emptyForm); setShowForm(false); await refresh(); },
    onError: (error) => toast.error(error.message || "No se pudo guardar la API"),
  });
  const actionMutation = useMutation({
    mutationFn: async ({ id, action }: { id: string; action: "test" | "sync" | "delete" }) => {
      setBusyId(id);
      if (action === "delete") return deleteApiConnection({ data: { id } });
      if (action === "test") return testApiConnection({ data: { storeId: id } });
      return syncStoreProducts({ data: { storeId: id } });
    },
    onSuccess: (result, vars) => {
      if (vars.action === "delete") toast.success("Conexión eliminada");
      else toast.success(vars.action === "test" ? `Conexión correcta: ${"count" in result ? result.count : 0} productos detectados` : `Sincronización completa`);
      refresh();
    },
    onError: (error) => { toast.error(error.message || "La operación falló"); refresh(); },
    onSettled: () => setBusyId(null),
  });
  const rateMutation = useMutation({
    mutationFn: () => updateDollarRate({ data: { rate: Number(rate) } }),
    onSuccess: () => { toast.success("Tipo de cambio actualizado"); setRate(""); },
    onError: () => toast.error("Ingresa una tasa válida"),
  });

  const marginMutation = useMutation({
    mutationFn: () => import("@/lib/products.functions").then(m => m.updateProfitMargin({ data: { margin: Number(margin) } })),
    onSuccess: () => { toast.success("Margen de ganancia actualizado"); setMargin(""); },
    onError: () => toast.error("Ingresa un porcentaje válido"),
  });

  const binanceMutation = useMutation({
    mutationFn: () => import("@/lib/products.functions").then(m => m.syncBinanceRate()),
    onSuccess: (res) => { 
      toast.success(`Tipo de cambio actualizado a ${res.price} Bs.`);
      setRate(res.price.toString());
    },
    onError: (e: any) => toast.error(e.message || "Error al obtener precio de Binance"),
  });

  const editConnection = (item: ApiConnection) => {
    const map = item.field_mapping as typeof emptyForm.field_mapping | null;
    setForm({
      id: item.id, name: item.name, api_url: item.api_url, purchase_url: item.purchase_url ?? "", api_key: "",
      auth_type: (item.auth_type ?? "bearer") as AuthType, auth_header: item.auth_header ?? "Authorization",
      products_path: item.products_path ?? "", field_mapping: map ?? emptyForm.field_mapping, enabled: item.enabled ?? true,
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className="api-shell min-h-screen">
      <div className="api-glow api-glow-one" /><div className="api-glow api-glow-two" />
      <div className="relative z-10 mx-auto max-w-[1500px] px-4 py-5 sm:px-7 lg:px-10">
        <header className="api-topbar">
          <a href="/" className="flex items-center gap-3" aria-label="Volver a la tienda">
            <span className="brand-mark"><Zap size={20} fill="currentColor" /></span>
            <span><strong className="block text-lg text-white">IAmax Hub</strong><small className="text-slate-400">Commerce control center</small></span>
          </a>
          <div className="flex items-center gap-3">
            <button onClick={async () => { await fetch("/__logout", { method: "POST" }); window.location.href = "/login"; }} className="icon-button" title="Cerrar sesión"><LogOut size={18} /></button>
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 sm:flex"><span className="status-dot" /> Sistema operativo</span>
            <a href="/" className="icon-button" title="Ver tienda"><ArrowLeft size={18} /></a>
          </div>
        </header>

        <section className="mb-7 mt-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="eyebrow">CENTRO DE INTEGRACIONES</p><h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Todas tus APIs.<br/><span className="gradient-text">Un solo lugar.</span></h1><p className="mt-4 max-w-2xl text-slate-400">Conecta proveedores, valida credenciales y sincroniza tu catálogo sin tocar el código.</p></div>
          {activeTab === "connections" && <button className="primary-action" onClick={() => { setForm(emptyForm); setShowForm(!showForm); }}><Plus size={19}/>{showForm ? "Cerrar formulario" : "Conectar nueva API"}</button>}
        </section>

        <section className="stats-grid">
          <Stat icon={<CloudCog/>} label="APIs registradas" value={String(connections.length)} hint="Conexiones totales" tone="violet" />
          <Stat icon={<Activity/>} label="Conectadas" value={String(connected)} hint={`${connections.length - connected} requieren atención`} tone="green" />
          <div className="stat-card rate-card">
            <div>
              <p>Tipo de cambio</p>
              <div className="mt-3 flex gap-2">
                <input className="compact-input w-28" type="number" min="0" step="0.01" placeholder="Bs por USD" value={rate} onChange={(e) => setRate(e.target.value)}/>
                <button className="mini-action" disabled={!Number(rate) || rateMutation.isPending} onClick={() => rateMutation.mutate()}>
                  {rateMutation.isPending ? <LoaderCircle className="animate-spin" size={17}/> : "Guardar"}
                </button>
                <button className="mini-action bg-yellow-500/20 text-yellow-400 hover:bg-yellow-500/30" disabled={binanceMutation.isPending} onClick={() => binanceMutation.mutate()} title="Sincronizar con Binance P2P">
                  {binanceMutation.isPending ? <LoaderCircle className="animate-spin" size={17}/> : "Binance P2P"}
                </button>
              </div>
            </div>
          </div>
          <div className="stat-card rate-card">
            <div>
              <p>Ganancia (%)</p>
              <div className="mt-3 flex gap-2">
                <input className="compact-input w-28" type="number" min="0" step="1" placeholder="Ej. 20" value={margin} onChange={(e) => setMargin(e.target.value)}/>
                <button className="mini-action" disabled={!margin || marginMutation.isPending} onClick={() => marginMutation.mutate()}>
                  {marginMutation.isPending ? <LoaderCircle className="animate-spin" size={17}/> : "Aplicar"}
                </button>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-8 flex gap-8 border-b border-white/10 pb-4 overflow-x-auto">
          <button className={`pb-2 text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === "connections" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("connections")}>Conexiones API</button>
          <button className={`pb-2 text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === "inventory" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("inventory")}>Inventario ({productTotal})</button>
          <button className={`pb-2 text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === "orders" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("orders")}>Pedidos</button>
          <button className={`pb-2 text-lg font-semibold transition-colors whitespace-nowrap ${activeTab === "config" ? "text-emerald-400 border-b-2 border-emerald-400" : "text-slate-400 hover:text-white"}`} onClick={() => setActiveTab("config")}>Configuración</button>
        </div>

        {activeTab === "connections" && (
          <>
            {showForm && <ConnectionForm form={form} setForm={setForm} showKey={showKey} setShowKey={setShowKey} onCancel={() => { setForm(emptyForm); setShowForm(false); }} onSave={() => saveMutation.mutate()} saving={saveMutation.isPending} />}
            <section className="panel mt-7">
              <div className="panel-heading"><div><h2>Conexiones API</h2><p>Credenciales cifradas y solicitudes ejecutadas desde el servidor.</p></div><div className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conexión..." /></div></div>
              {connectionsQuery.isLoading ? <div className="empty-state"><LoaderCircle className="animate-spin"/><p>Cargando tus conexiones...</p></div> : filtered.length === 0 ? <div className="empty-state"><Database size={34}/><h3>No hay APIs todavía</h3><p>Agrega tu primer proveedor para comenzar a importar productos.</p><button className="secondary-action" onClick={() => setShowForm(true)}><Plus size={17}/> Añadir API</button></div> : <div className="connection-grid">{filtered.map((item) => <ConnectionCard key={item.id} item={item} busy={busyId === item.id} onEdit={() => editConnection(item)} onAction={(action) => actionMutation.mutate({ id: item.id, action })}/>)}</div>}
            </section>
          </>
        )}
        {activeTab === "inventory" && <InventoryTab />}
        {activeTab === "orders" && <OrdersTab />}
        {activeTab === "config" && <ConfigTab />}
      </div>
    </main>
  );
}

function InventoryTab() {
  const { data: products, isLoading } = useQuery({ queryKey: ["admin-products"], queryFn: () => import("@/lib/products.functions").then(m => m.listAdminProducts()) });
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({ custom_usd_price: "", custom_image_url: "", warranty_days: "" });
  const queryClient = useQueryClient();

  const updateMutation = useMutation({
    mutationFn: (data: any) => import("@/lib/products.functions").then(m => m.updateProductDetails({ data })),
    onSuccess: () => { toast.success("Producto actualizado"); setEditingId(null); queryClient.invalidateQueries({ queryKey: ["admin-products"] }); },
    onError: () => toast.error("Error al actualizar"),
  });

  if (isLoading) return <div className="empty-state mt-7"><LoaderCircle className="animate-spin"/><p>Cargando inventario...</p></div>;

  return (
    <section className="panel mt-7">
      <div className="panel-heading"><div><h2>Inventario Sincronizado</h2><p>Fija tus propios precios (en USD), URLs de imágenes y garantía.</p></div></div>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm mt-4">
          <thead><tr className="border-b border-white/10 text-slate-400"><th className="p-3">Producto</th><th className="p-3">Proveedor</th><th className="p-3">Stock</th><th className="p-3">Garantía</th><th className="p-3">Precio Base</th><th className="p-3">Tu Precio (USD)</th><th className="p-3">Imagen (URL)</th><th className="p-3">Acciones</th></tr></thead>
          <tbody>
            {products?.map((p: any) => {
              const isEditing = editingId === p.id;
              return (
                <tr key={p.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-3 font-semibold text-white">{p.name}</td>
                  <td className="p-3 text-emerald-400">{p.store_name}</td>
                  <td className="p-3">{p.stock !== null ? p.stock : 'N/A'}</td>
                  <td className="p-3">
                    {isEditing ? <input className="compact-input w-20" type="number" value={editForm.warranty_days} onChange={e => setEditForm(prev => ({...prev, warranty_days: e.target.value}))} placeholder="Días"/> : <span className={p.warranty_days ? "text-yellow-400 font-bold" : "text-slate-400"}>{p.warranty_days ? `${p.warranty_days} días` : "No"}</span>}
                  </td>
                  <td className="p-3">${p.original_price}</td>
                  <td className="p-3">
                    {isEditing ? <input className="compact-input w-24" type="number" step="0.01" value={editForm.custom_usd_price} onChange={e => setEditForm(prev => ({...prev, custom_usd_price: e.target.value}))} placeholder={p.original_price}/> : <span className={p.custom_usd_price ? "text-green-400 font-bold" : "text-slate-400"}>{p.custom_usd_price ? `$${p.custom_usd_price}` : "Sin fijar"}</span>}
                  </td>
                  <td className="p-3">
                    {isEditing ? <input className="compact-input w-48" type="url" value={editForm.custom_image_url} onChange={e => setEditForm(prev => ({...prev, custom_image_url: e.target.value}))} placeholder="https://..."/> : <div className="max-w-[150px] truncate text-slate-400">{p.custom_image_url || "Sin fijar"}</div>}
                  </td>
                  <td className="p-3">
                    {isEditing ? <div className="flex gap-2"><button className="text-green-400 hover:text-green-300" onClick={() => updateMutation.mutate({ id: p.id, custom_usd_price: editForm.custom_usd_price ? Number(editForm.custom_usd_price) : null, custom_image_url: editForm.custom_image_url || null, warranty_days: editForm.warranty_days ? Number(editForm.warranty_days) : null })}><CheckCircle2 size={18}/></button><button className="text-red-400 hover:text-red-300" onClick={() => setEditingId(null)}><X size={18}/></button></div> : <button className="text-slate-400 hover:text-white" onClick={() => { setEditingId(p.id); setEditForm({ custom_usd_price: p.custom_usd_price?.toString() || "", custom_image_url: p.custom_image_url || "", warranty_days: p.warranty_days?.toString() || "" }); }}><Pencil size={18}/></button>}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Stat({ icon, label, value, hint, tone }: { icon: React.ReactNode; label: string; value: string; hint: string; tone: string }) {
  return <div className="stat-card"><span className={`stat-icon ${tone}`}>{icon}</span><div><p>{label}</p><strong>{value}</strong><small>{hint}</small></div></div>;
}

function ConnectionForm({ form, setForm, showKey, setShowKey, onCancel, onSave, saving }: any) {
  const field = (key: string, value: string | boolean) => setForm((current: any) => ({ ...current, [key]: value }));
  const mapField = (key: string, value: string) => setForm((current: any) => ({ ...current, field_mapping: { ...current.field_mapping, [key]: value } }));
  return <section className="panel form-panel mt-7">
    <div className="panel-heading"><div><p className="eyebrow">CONFIGURACIÓN SEGURA</p><h2>{form.id ? "Editar conexión" : "Conectar nueva API"}</h2><p>Los campos de mapeo aceptan rutas como <code>pricing.amount</code>.</p></div><button className="icon-button" onClick={onCancel}><X size={19}/></button></div>
    <div className="form-grid">
      <label>Nombre de la conexión<input value={form.name} onChange={(e) => field("name", e.target.value)} placeholder="Ej. Canboso, Shopify principal" /></label>
      <label>URL para listar productos<input value={form.api_url} onChange={(e) => field("api_url", e.target.value)} placeholder="https://api.proveedor.com/products" /></label>
      <label>URL de compra <span>(opcional)</span><input value={form.purchase_url} onChange={(e) => field("purchase_url", e.target.value)} placeholder="https://api.proveedor.com/purchase" /></label>
      <label>Autenticación<select value={form.auth_type} onChange={(e) => field("auth_type", e.target.value)}><option value="bearer">Bearer token</option><option value="header">Header personalizado</option><option value="query">Parámetro en URL</option><option value="none">Sin autenticación</option></select></label>
      {form.auth_type !== "none" && <><label>{form.auth_type === "header" ? "Nombre del header" : form.auth_type === "query" ? "Nombre del parámetro" : "Header"}<input value={form.auth_header} onChange={(e) => field("auth_header", e.target.value)} placeholder="Authorization" /></label><label>Clave API {form.id && <span>(vacío = conservar actual)</span>}<div className="secret-input"><input type={showKey ? "text" : "password"} value={form.api_key} onChange={(e) => field("api_key", e.target.value)} placeholder="Pega aquí tu clave secreta"/><button onClick={() => setShowKey(!showKey)} type="button">{showKey ? <EyeOff size={18}/> : <Eye size={18}/>}</button></div></label></>}
      <label>Ruta de la lista <span>(vacío si la respuesta ya es un array)</span><input value={form.products_path} onChange={(e) => field("products_path", e.target.value)} placeholder="data.products" /></label>
    </div>
    <div className="mapping-box"><div><h3>Mapeo de campos JSON</h3><p>Indica dónde viene cada dato en la respuesta del proveedor.</p></div><div className="mapping-grid">{Object.entries(form.field_mapping).map(([key, value]) => <label key={key}><span>{key === "name" ? "nombre" : key === "description" ? "descripción" : key === "price" ? "precio" : key === "image" ? "imagen" : "ID"}</span><input value={String(value)} onChange={(e) => mapField(key, e.target.value)} /></label>)}</div></div>
    <div className="form-actions"><button className="ghost-action" onClick={onCancel}>Cancelar</button><button className="primary-action" disabled={!form.name || !form.api_url || saving} onClick={onSave}>{saving ? <LoaderCircle className="animate-spin" size={18}/> : <ShieldCheck size={18}/>} Guardar conexión</button></div>
  </section>;
}

function ConnectionCard({ item, busy, onEdit, onAction }: { item: ApiConnection; busy: boolean; onEdit: () => void; onAction: (action: "test" | "sync" | "delete") => void }) {
  const connected = item.last_status === "connected";
  const failed = item.last_status === "error";
  return <article className="connection-card">
    <div className="flex items-start justify-between gap-3"><span className="provider-icon"><Store size={21}/></span><span className={`connection-status ${connected ? "ok" : failed ? "error" : "pending"}`}>{connected ? <CheckCircle2 size={13}/> : <span className="status-dot"/>}{connected ? "Conectada" : failed ? "Error" : "Pendiente"}</span></div>
    <div><h3>{item.name}</h3><p className="url-line">{item.api_url}</p></div>
    <div className="connection-meta"><span><PackageCheck size={15}/>{item.product_count || 0} productos</span><span><KeyRound size={15}/>{item.auth_type === "none" ? "Pública" : "Protegida"}</span></div>
    {item.last_error && <p className="error-note">{item.last_error}</p>}
    <div className="card-actions"><button disabled={busy} onClick={() => onAction("test")} title="Probar conexión">{busy ? <LoaderCircle className="animate-spin" size={17}/> : <Zap size={17}/>} Probar</button><button disabled={busy} onClick={() => onAction("sync")} title="Sincronizar"><RefreshCw size={17}/> Sincronizar</button><button onClick={onEdit} className="square-action" title="Editar"><Pencil size={17}/></button><button disabled={busy} onClick={() => confirm(`¿Eliminar ${item.name}?`) && onAction("delete")} className="square-action danger" title="Eliminar"><Trash2 size={17}/></button></div>
  </article>;
}

function ConfigTab() {
  const queryClient = useQueryClient();
  const { data: config, isLoading } = useQuery({ 
    queryKey: ["admin-config"], 
    queryFn: () => import("@/lib/products.functions").then(m => m.getAdminConfig()) 
  });

  const [form, setForm] = useState({ telegram_bot_token: "", telegram_chat_id: "" });

  useEffect(() => {
    if (config) {
      setForm({
        telegram_bot_token: config.telegram_bot_token || "",
        telegram_chat_id: config.telegram_chat_id || ""
      });
    }
  }, [config]);

  const updateMutation = useMutation({
    mutationFn: () => import("@/lib/products.functions").then(m => m.updateAdminConfig({ data: form })),
    onSuccess: () => {
      toast.success("Configuración guardada");
      queryClient.invalidateQueries({ queryKey: ["admin-config"] });
    },
    onError: () => toast.error("Error al guardar la configuración")
  });

  if (isLoading) return <div className="empty-state mt-7"><LoaderCircle className="animate-spin"/><p>Cargando configuración...</p></div>;

  return (
    <section className="panel mt-7">
      <div className="panel-heading">
        <div>
          <h2>Configuración del Sistema</h2>
          <p>Ajustes globales y notificaciones automatizadas.</p>
        </div>
      </div>
      
      <div className="mt-6 space-y-8">
        <div className="bg-black/20 p-6 rounded-xl border border-white/5">
          <h3 className="text-lg font-bold text-white mb-2">Notificaciones de Telegram</h3>
          <p className="text-sm text-slate-400 mb-6">Recibe un mensaje en Telegram cada vez que un cliente realice un pedido.</p>
          
          <div className="space-y-4 max-w-xl">
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Telegram Bot Token</label>
              <input 
                type="password" 
                value={form.telegram_bot_token} 
                onChange={e => setForm({...form, telegram_bot_token: e.target.value})} 
                placeholder="123456789:ABCdefGHIjklmNOPqrstUVWxyz" 
                className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-xs text-slate-500 mt-1">Consíguelo hablando con @BotFather en Telegram.</p>
            </div>
            
            <div>
              <label className="block text-sm font-semibold text-slate-300 mb-1">Telegram Chat ID</label>
              <input 
                type="text" 
                value={form.telegram_chat_id} 
                onChange={e => setForm({...form, telegram_chat_id: e.target.value})} 
                placeholder="Ej. 12345678" 
                className="w-full bg-black/40 border border-white/10 rounded px-4 py-2 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <p className="text-xs text-slate-500 mt-1">Tu ID personal de Telegram. Puedes obtenerlo hablando con @userinfobot.</p>
            </div>

            <button 
              onClick={() => updateMutation.mutate()} 
              disabled={updateMutation.isPending}
              className="px-4 py-2 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold transition-colors disabled:opacity-50"
            >
              {updateMutation.isPending ? "Guardando..." : "Guardar Configuración"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}

function OrdersTab() {
  const queryClient = useQueryClient();
  const { data: orders, isLoading } = useQuery({ 
    queryKey: ["admin-orders"], 
    queryFn: () => import("@/lib/orders.server").then(m => m.getAdminOrders()) 
  });

  const approveMutation = useMutation({
    mutationFn: (orderId: string) => import("@/lib/orders.server").then(m => m.approveOrder({ data: { orderId } })),
    onSuccess: () => {
      toast.success("Orden aprobada y entregada correctamente");
      queryClient.invalidateQueries({ queryKey: ["admin-orders"] });
    },
    onError: (err: any) => toast.error(err.message || "Error al aprobar orden")
  });

  if (isLoading) return <div className="empty-state mt-7"><LoaderCircle className="animate-spin"/><p>Cargando pedidos...</p></div>;

  return (
    <section className="panel mt-7">
      <div className="panel-heading">
        <div>
          <h2>Pedidos de Clientes</h2>
          <p>Gestiona los pagos manuales y revisa las compras automáticas.</p>
        </div>
      </div>
      <div className="overflow-x-auto mt-4">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 text-slate-400">
              <th className="p-3">ID / Fecha</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Total (USD)</th>
              <th className="p-3">Método</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Comprobante</th>
              <th className="p-3">Acciones</th>
            </tr>
          </thead>
          <tbody>
            {orders?.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-slate-500">No hay pedidos registrados</td></tr>
            )}
            {orders?.map((order: any) => (
              <tr key={order.id} className="border-b border-white/5 hover:bg-white/5">
                <td className="p-3">
                  <span className="font-mono text-xs block text-slate-300" title={order.id}>{order.id.slice(0, 8)}...</span>
                  <span className="text-slate-500 text-xs">{new Date(order.created_at).toLocaleDateString()}</span>
                </td>
                <td className="p-3">
                  <strong className="block text-white">{order.customer_name}</strong>
                  <span className="text-slate-400 text-xs">{order.customer_phone}</span>
                </td>
                <td className="p-3 font-black text-emerald-400">${order.total_usd}</td>
                <td className="p-3 text-slate-300">{order.payment_method_name}</td>
                <td className="p-3">
                  <span className={`px-2 py-1 rounded text-xs font-bold ${
                    order.status === 'pending' ? 'bg-yellow-500/20 text-yellow-500' :
                    order.status === 'processing' ? 'bg-blue-500/20 text-blue-400' :
                    order.status === 'delivered' ? 'bg-green-500/20 text-green-400' : 'bg-slate-500/20 text-slate-400'
                  }`}>
                    {order.status}
                  </span>
                </td>
                <td className="p-3">
                  {order.payment_proof_url ? (
                    <a href={order.payment_proof_url} target="_blank" rel="noreferrer" className="text-blue-400 hover:underline flex items-center gap-1">
                      <Eye size={14}/> Ver
                    </a>
                  ) : <span className="text-slate-600">-</span>}
                </td>
                <td className="p-3">
                  {(order.status === 'pending' || order.status === 'processing') && (
                    <button 
                      onClick={() => confirm("¿Seguro que deseas descontar saldo y entregar el producto?") && approveMutation.mutate(order.id)}
                      disabled={approveMutation.isPending}
                      className="px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded font-bold text-xs disabled:opacity-50"
                    >
                      {approveMutation.isPending ? "Aprobando..." : "Aprobar y Entregar"}
                    </button>
                  )}
                  {order.status === 'delivered' && (
                    <span className="text-emerald-500 font-bold text-xs flex items-center gap-1">
                      <CheckCircle2 size={14}/> Entregado
                    </span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
