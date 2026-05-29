// Auth.js route handler — exposes /api/auth/* endpoints (signin, callback,
// session, csrf, signout). `handlers` is { GET, POST } from auth.ts.
import { handlers } from "@/auth";

export const { GET, POST } = handlers;
