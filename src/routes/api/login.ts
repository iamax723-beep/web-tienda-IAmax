import { createAPIFileRoute } from "@tanstack/react-start/api";
import { setCookie } from "vinxi/http";
import { generateAdminToken } from "@/lib/admin-auth.server";

export const APIRoute = createAPIFileRoute("/api/login")({
  POST: async ({ request }) => {
    try {
      const { password } = await request.json();
      const expectedPassword = process.env.ADMIN_PASSWORD;
      
      // Si no hay contraseña configurada y estamos en desarrollo, permitimos
      if (!expectedPassword && process.env.NODE_ENV !== "production") {
        setCookie("iamax_admin_session", generateAdminToken(), {
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "lax",
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }

      if (expectedPassword && password === expectedPassword) {
        setCookie("iamax_admin_session", generateAdminToken(), {
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "lax",
        });
        return new Response(JSON.stringify({ success: true }), { status: 200 });
      }
      return new Response(JSON.stringify({ error: "Contraseña incorrecta" }), { status: 401 });
    } catch {
      return new Response(JSON.stringify({ error: "Invalid request" }), { status: 400 });
    }
  },
});
