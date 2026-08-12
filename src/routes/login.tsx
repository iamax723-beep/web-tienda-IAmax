import { createFileRoute, redirect } from "@tanstack/react-router";
import { createServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Lock, Loader2, ArrowRight } from "lucide-react";

// Esta función se ejecuta SÓLO en el servidor — nunca falla en el cliente
const doLogin = createServerFn({ method: "POST" })
  .validator((data: unknown) => data as { password: string })
  .handler(async ({ data }) => {
    const { setCookie } = await import("vinxi/http");
    const crypto = await import("node:crypto");
    const expectedPassword = process.env.ADMIN_PASSWORD;

    const generateToken = (secret: string) =>
      crypto.createHmac("sha256", secret).update("admin-session").digest("hex");

    // En desarrollo sin contraseña, permitir acceso libre
    if (!expectedPassword && process.env.NODE_ENV !== "production") {
      setCookie("iamax_admin_session", generateToken("dev-secret"), {
        httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax",
      });
      return { ok: true };
    }

    if (expectedPassword && data.password === expectedPassword) {
      setCookie("iamax_admin_session", generateToken(expectedPassword), {
        httpOnly: true, path: "/", maxAge: 60 * 60 * 24 * 7, sameSite: "lax",
      });
      return { ok: true };
    }

    return { ok: false };
  });

export const Route = createFileRoute("/login")({
  component: Login,
  head: () => ({ title: "IAmax Hub - Acceso Restringido" }),
});

function Login() {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      // Obtener la URL del server function (con fallback al ID conocido)
      const fnId = (doLogin as any).serverFnMeta?.id || (doLogin as any).url?.split("/").pop();
      const fnUrl = (doLogin as any).url || (fnId ? `/_serverFn/${fnId}` : null);
      console.log("[login] fnUrl:", fnUrl, "doLogin keys:", Object.keys(doLogin as any));
      if (!fnUrl) {
        setError("Error de configuración. Recarga la página e intenta de nuevo.");
        return;
      }
      const r = await fetch(fnUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-tsr-serverFn": "true",
          "accept": "application/json",
        },
        body: JSON.stringify([{ data: { password } }]),
      });
      if (!r.ok) {
        const body = await r.text().catch(() => "");
        setError(`Error ${r.status}: ${body.substring(0, 80) || "Inténtalo de nuevo."}`);
        return;
      }
      const result = await r.json();
      // TanStack serializa el resultado en un array
      const payload = Array.isArray(result) ? result[0] : result;
      if (payload?.ok === true) {
        window.location.href = "/admin";
      } else {
        setError("Contraseña incorrecta");
      }
    } catch {
      setError("Error de red. Inténtalo de nuevo.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10" />
      <div className="absolute -top-24 -left-24 w-96 h-96 bg-primary/20 rounded-full blur-[100px] animate-pulse" />
      <div className="absolute -bottom-24 -right-24 w-96 h-96 bg-secondary/20 rounded-full blur-[100px] animate-pulse" />

      <Card className="w-full max-w-md border-none shadow-[0_20px_50px_rgba(0,0,0,0.2)] bg-card/80 backdrop-blur-3xl relative z-10 overflow-hidden ring-1 ring-white/10">
        <div className="absolute top-0 inset-x-0 h-1 bg-linear-to-r from-primary via-secondary to-primary" />
        <CardHeader className="space-y-4 pt-10 pb-8 text-center">
          <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center ring-1 ring-primary/20 shadow-inner">
            <Lock className="w-8 h-8 text-primary" />
          </div>
          <div className="space-y-2">
            <CardTitle className="text-3xl font-black tracking-tight">Acceso Restringido</CardTitle>
            <CardDescription className="text-base text-muted-foreground">
              Ingresa la contraseña de administrador para acceder a IAmax Hub.
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="px-10 pb-10">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Input
                type="password"
                placeholder="Contraseña"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoFocus
                className="h-14 bg-background/50 border-white/10 text-center text-xl tracking-widest focus-visible:ring-primary/50 rounded-xl"
              />
              {error && <p className="text-sm text-red-500 font-medium text-center animate-in fade-in slide-in-from-top-2">{error}</p>}
            </div>
            <Button
              type="submit"
              className="w-full h-14 text-base font-bold rounded-xl bg-linear-to-r from-primary to-secondary hover:shadow-[0_10px_20px_rgba(0,0,0,0.2)] hover:shadow-primary/30 transition-all duration-300"
              disabled={loading || !password}
            >
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : (
                <span className="flex items-center gap-2">
                  Entrar al Hub <ArrowRight className="w-5 h-5" />
                </span>
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
