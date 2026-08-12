import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
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

const checkAuth = createServerFn({ method: "GET" }).handler(async () => {
  const { isAdminAuthorized } = await import("@/lib/admin-auth.server");
  return isAdminAuthorized();
});

export const Route = createFileRoute("/admin")({
  beforeLoad: async () => {
    const isAuth = await checkAuth();
    if (!isAuth) throw redirect({ to: "/login" });
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
  const [showKey, setShowKey] = useState(false);
  const [search, setSearch] = useState("");
  const [rate, setRate] = useState("");
  const [busyId, setBusyId] = useState<string | null>(null);

  const connectionsQuery = useQuery({ queryKey: ["api-connections"], queryFn: () => listApiConnections() });
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
            <button onClick={async () => { await fetch("/api/logout", { method: "POST" }); window.location.href = "/login"; }} className="icon-button" title="Cerrar sesión"><LogOut size={18} /></button>
            <span className="hidden items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-300 sm:flex"><span className="status-dot" /> Sistema operativo</span>
            <a href="/" className="icon-button" title="Ver tienda"><ArrowLeft size={18} /></a>
          </div>
        </header>

        <section className="mb-7 mt-8 flex flex-col justify-between gap-5 lg:flex-row lg:items-end">
          <div><p className="eyebrow">CENTRO DE INTEGRACIONES</p><h1 className="mt-2 text-4xl font-black tracking-tight text-white sm:text-5xl">Todas tus APIs.<br/><span className="gradient-text">Un solo lugar.</span></h1><p className="mt-4 max-w-2xl text-slate-400">Conecta proveedores, valida credenciales y sincroniza tu catálogo sin tocar el código.</p></div>
          <button className="primary-action" onClick={() => { setForm(emptyForm); setShowForm(!showForm); }}><Plus size={19}/>{showForm ? "Cerrar formulario" : "Conectar nueva API"}</button>
        </section>

        <section className="stats-grid">
          <Stat icon={<CloudCog/>} label="APIs registradas" value={String(connections.length)} hint="Conexiones totales" tone="violet" />
          <Stat icon={<Activity/>} label="Conectadas" value={String(connected)} hint={`${connections.length - connected} requieren atención`} tone="green" />
          <Stat icon={<PackageCheck/>} label="Productos" value={productTotal.toLocaleString("es-BO")} hint="Último inventario detectado" tone="blue" />
          <div className="stat-card rate-card"><div><p>Tipo de cambio</p><div className="mt-3 flex gap-2"><input className="compact-input" type="number" min="0" step="0.01" placeholder="Bs por USD" value={rate} onChange={(e) => setRate(e.target.value)}/><button className="mini-action" disabled={!Number(rate) || rateMutation.isPending} onClick={() => rateMutation.mutate()}>{rateMutation.isPending ? <LoaderCircle className="animate-spin" size={17}/> : "Guardar"}</button></div></div></div>
        </section>

        {showForm && <ConnectionForm form={form} setForm={setForm} showKey={showKey} setShowKey={setShowKey} onCancel={() => { setForm(emptyForm); setShowForm(false); }} onSave={() => saveMutation.mutate()} saving={saveMutation.isPending} />}

        <section className="panel mt-7">
          <div className="panel-heading"><div><h2>Conexiones API</h2><p>Credenciales cifradas y solicitudes ejecutadas desde el servidor.</p></div><div className="search-box"><Search size={17}/><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Buscar conexión..." /></div></div>
          {connectionsQuery.isLoading ? <div className="empty-state"><LoaderCircle className="animate-spin"/><p>Cargando tus conexiones...</p></div> : filtered.length === 0 ? <div className="empty-state"><Database size={34}/><h3>No hay APIs todavía</h3><p>Agrega tu primer proveedor para comenzar a importar productos.</p><button className="secondary-action" onClick={() => setShowForm(true)}><Plus size={17}/> Añadir API</button></div> : <div className="connection-grid">{filtered.map((item) => <ConnectionCard key={item.id} item={item} busy={busyId === item.id} onEdit={() => editConnection(item)} onAction={(action) => actionMutation.mutate({ id: item.id, action })}/>)}</div>}
        </section>
      </div>
    </main>
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
