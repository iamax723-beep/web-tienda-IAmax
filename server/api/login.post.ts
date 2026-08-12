import { setCookie, readBody } from "h3";
import crypto from "node:crypto";

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const password: string = body?.password ?? "";
  const expectedPassword = process.env.ADMIN_PASSWORD;

  function generateToken() {
    const secret = expectedPassword || "dev-secret";
    return crypto.createHmac("sha256", secret).update("admin-session").digest("hex");
  }

  // En desarrollo sin contraseña configurada, permitir acceso libre
  if (!expectedPassword && process.env.NODE_ENV !== "production") {
    setCookie(event, "iamax_admin_session", generateToken(), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return { success: true };
  }

  if (expectedPassword && password === expectedPassword) {
    setCookie(event, "iamax_admin_session", generateToken(), {
      httpOnly: true,
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
      sameSite: "lax",
    });
    return { success: true };
  }

  setResponseStatus(event, 401);
  return { success: false, error: "Contraseña incorrecta" };
});
