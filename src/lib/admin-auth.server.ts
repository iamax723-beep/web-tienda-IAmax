import { getRequestHeader } from "@tanstack/react-start/server";

export function isAdminAuthorized() {
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedPassword) return process.env.NODE_ENV !== "production";
  const authorization = getRequestHeader("authorization");
  if (!authorization?.startsWith("Basic ")) return false;
  try {
    const decoded = Buffer.from(authorization.slice(6), "base64").toString("utf8");
    const separator = decoded.indexOf(":");
    const username = separator >= 0 ? decoded.slice(0, separator) : "";
    const password = separator >= 0 ? decoded.slice(separator + 1) : "";
    return username === "admin" && password === expectedPassword;
  } catch {
    return false;
  }
}

export function requireAdmin() {
  if (!isAdminAuthorized()) {
    throw new Response("No autorizado", {
      status: 401,
      headers: { "WWW-Authenticate": 'Basic realm="IAmax Hub", charset="UTF-8"' },
    });
  }
}

export function adminChallenge() {
  return new Response("Acceso administrativo protegido", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="IAmax Hub", charset="UTF-8"' },
  });
}
