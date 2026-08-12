import { setCookie } from "h3";

export default defineEventHandler((event) => {
  setCookie(event, "iamax_admin_session", "", {
    httpOnly: true,
    path: "/",
    maxAge: 0,
    sameSite: "lax",
  });
  return { success: true };
});
