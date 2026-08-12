import { createAPIFileRoute } from "@tanstack/react-start/api";
import { getCookie, setCookie } from "vinxi/http";
import crypto from "node:crypto";

export const APIRoute = createAPIFileRoute("/api/login")({
  POST: async ({ request }) => {
    try {
      const body = await request.json();
      const password: string = body?.password ?? "";
      const expectedPassword = process.env.ADMIN_PASSWORD;

      function generateToken() {
        const secret = expectedPassword || "dev-secret";
        return crypto.createHmac("sha256", secret).update("admin-session").digest("hex");
      }

      const doSetCookie = () => {
        setCookie("iamax_admin_session", generateToken(), {
          httpOnly: true,
          path: "/",
          maxAge: 60 * 60 * 24 * 7,
          sameSite: "lax",
        });
      };

      // En desarrollo sin contraseña, permitir acceso libre
      if (!expectedPassword && process.env.NODE_ENV !== "production") {
        doSetCookie();
        return Response.json({ success: true });
      }

      if (expectedPassword && password === expectedPassword) {
        doSetCookie();
        return Response.json({ success: true });
      }

      return Response.json({ success: false, error: "Contraseña incorrecta" }, { status: 401 });
    } catch (err) {
      return Response.json({ success: false, error: "Error interno" }, { status: 500 });
    }
  },
});
