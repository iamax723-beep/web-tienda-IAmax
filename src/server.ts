import "./lib/error-capture";

import { consumeLastCapturedError } from "./lib/error-capture";
import { renderErrorPage } from "./lib/error-page";

type ServerEntry = {
  fetch: (request: Request, env: unknown, ctx: unknown) => Promise<Response> | Response;
};

let serverEntryPromise: Promise<ServerEntry> | undefined;

async function getServerEntry(): Promise<ServerEntry> {
  if (!serverEntryPromise) {
    serverEntryPromise = import("@tanstack/react-start/server-entry").then(
      (m) => (m.default ?? m) as ServerEntry,
    );
  }
  return serverEntryPromise;
}

// h3 swallows in-handler throws into a normal 500 Response with body
// {"unhandled":true,"message":"HTTPError"} — try/catch alone never fires for those.
async function normalizeCatastrophicSsrResponse(response: Response): Promise<Response> {
  if (response.status < 500) return response;
  const contentType = response.headers.get("content-type") ?? "";
  if (!contentType.includes("application/json")) return response;

  const body = await response.clone().text();
  if (!isH3SwallowedErrorBody(body)) return response;

  console.error(consumeLastCapturedError() ?? new Error(`h3 swallowed SSR error: ${body}`));
  return new Response(renderErrorPage(), {
    status: 500,
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

function isH3SwallowedErrorBody(body: string): boolean {
  try {
    const payload = JSON.parse(body) as { unhandled?: unknown; message?: unknown };
    return payload.unhandled === true && payload.message === "HTTPError";
  } catch {
    return false;
  }
}

export default {
  async fetch(request: Request, env: unknown, ctx: unknown) {
    try {
      const url = new URL(request.url);
      console.log("!!! SERVER.TS FETCH:", request.method, url.pathname);

      // --- LOGIN INTERCEPTOR ---
      if (request.method === "POST" && url.pathname === "/login") {
        let password = "";
        const contentType = request.headers.get("content-type") || "";
        if (contentType.includes("application/x-www-form-urlencoded") || contentType.includes("multipart/form-data")) {
          const data = await request.formData();
          password = data.get("password")?.toString() || "";
        }

        const expectedPassword = process.env.ADMIN_PASSWORD;
        const crypto = await import("node:crypto");
        const generateToken = (secret: string) => crypto.createHmac("sha256", secret).update("admin-session").digest("hex");

        let ok = false;
        let token = "";

        if (!expectedPassword && process.env.NODE_ENV !== "production") {
          ok = true;
          token = generateToken("dev-secret");
        } else if (expectedPassword && password === expectedPassword) {
          ok = true;
          token = generateToken(expectedPassword);
        }

        const headers = new Headers();
        if (ok) {
          headers.append("Set-Cookie", `iamax_admin_session=${token}; HttpOnly; Path=/; Max-Age=${60 * 60 * 24 * 7}; SameSite=Lax`);
          headers.append("Location", "/admin");
        } else {
          headers.append("Location", "/login?error=true");
        }
        return new Response(null, { status: 302, headers });
      }

      // --- LOGOUT INTERCEPTOR ---
      if (request.method === "POST" && (url.pathname === "/logout" || url.pathname === "/__logout")) {
        const headers = new Headers();
        headers.append("Set-Cookie", `iamax_admin_session=; HttpOnly; Path=/; Max-Age=0; SameSite=Lax`);
        headers.append("Location", "/login");
        return new Response(null, { status: 302, headers });
      }

      const handler = await getServerEntry();
      const response = await handler.fetch(request, env, ctx);
      return await normalizeCatastrophicSsrResponse(response);
    } catch (error) {
      console.error(error);
      return new Response(renderErrorPage(), {
        status: 500,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    }
  },
};
