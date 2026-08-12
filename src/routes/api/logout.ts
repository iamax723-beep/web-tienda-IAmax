import { createAPIFileRoute } from "@tanstack/react-start/api";
import { setCookie } from "vinxi/http";

export const APIRoute = createAPIFileRoute("/api/logout")({
  POST: async () => {
    setCookie("iamax_admin_session", "", {
      httpOnly: true,
      path: "/",
      maxAge: 0,
      sameSite: "lax",
    });
    return new Response(JSON.stringify({ success: true }), { status: 200 });
  },
});
