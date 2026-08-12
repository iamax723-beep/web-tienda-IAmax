import { getCookie } from "vinxi/http";
import crypto from "crypto";

export function generateAdminToken() {
  const secret = process.env.ADMIN_PASSWORD || "dev-secret";
  return crypto.createHmac("sha256", secret).update("admin-session").digest("hex");
}

export function isAdminAuthorized() {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword && process.env.NODE_ENV !== "production") return true;
  const cookieToken = getCookie("iamax_admin_session");
  return cookieToken === generateAdminToken();
}

export function requireAdmin() {
  if (!isAdminAuthorized()) {
    throw new Response("No autorizado", { status: 401 });
  }
}

export function adminChallenge() {
  return new Response("Acceso administrativo protegido", { status: 401 });
}
