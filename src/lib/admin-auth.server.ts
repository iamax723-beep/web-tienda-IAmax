import { getRequestHeader } from "@tanstack/start-server-core/request-response";
import crypto from "crypto";

export function generateAdminToken() {
  const secret = process.env.ADMIN_PASSWORD || "dev-secret";
  return crypto.createHmac("sha256", secret).update("admin-session").digest("hex");
}

export function isAdminAuthorized() {
  try {
    const expectedPassword = process.env.ADMIN_PASSWORD;
    if (!expectedPassword && process.env.NODE_ENV !== "production") return true;
    
    const cookieHeader = getRequestHeader("cookie");
    if (!cookieHeader) return false;
    
    const match = cookieHeader.match(/(?:^|;\s*)iamax_admin_session=([^;]*)/);
    const cookieToken = match ? match[1] : null;

    return cookieToken === generateAdminToken();
  } catch (err) {
    console.error("Auth error:", err);
    return false;
  }
}

export function requireAdmin() {
  if (!isAdminAuthorized()) {
    throw new Response("No autorizado", { status: 401 });
  }
}

export function adminChallenge() {
  return new Response("Acceso administrativo protegido", { status: 401 });
}
