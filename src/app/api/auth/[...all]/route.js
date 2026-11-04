// src/app/api/auth/[...all]/route.js
/** Better Auth's HTTP endpoints (password-reset links, Google sign-in callback, sign-out…). */
import { toNextJsHandler } from "better-auth/next-js";
import { auth } from "@/server/auth";

export const { GET, POST } = toNextJsHandler(auth);