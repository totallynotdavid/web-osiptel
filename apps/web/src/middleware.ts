import { redirect } from "@solidjs/router";
import { createMiddleware } from "@solidjs/start/middleware";
import { getCookie } from "@solidjs/start/http";

import {
  defaultPathForRole,
  hasRole,
  isAdminPath,
  isManagerPath,
  isPublicPath,
} from "~/lib/auth/rbac";
import { SESSION_COOKIE } from "~/lib/auth/session";
import { db } from "~/lib/db/db";
import { createSessionRepo } from "~/server/auth/session-repo";

export default createMiddleware({
  onRequest: async (event) => {
    const url = new URL(event.request.url);
    event.locals = event.locals ?? {};

    const nonce = crypto.randomUUID().replace(/-/g, "");
    event.locals.nonce = nonce;
    event.locals.session = null;

    const csp = [
      "default-src 'self'",
      `script-src 'nonce-${nonce}' 'strict-dynamic' 'unsafe-eval'`,
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https:",
      "font-src 'self' data:",
      "connect-src 'self'",
      "object-src 'none'",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'none'",
    ].join("; ");

    event.response.headers.set("Content-Security-Policy", csp);

    if (isPublicPath(url.pathname)) return undefined;

    const sessionId = getCookie(event.nativeEvent, SESSION_COOKIE);

    if (!sessionId) {
      const res = redirect("/login");
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }

    const sessions = createSessionRepo(db);
    const session = await sessions.findValid(sessionId);

    if (!session) {
      const res = redirect("/login");
      res.headers.set("Content-Security-Policy", csp);
      return res;
    }

    event.locals.session = session;

    // Role-based path guards
    if (isAdminPath(url.pathname) && !hasRole(session.role, "admin")) {
      return redirect(defaultPathForRole(session.role));
    }
    if (isManagerPath(url.pathname) && !hasRole(session.role, "sales_manager")) {
      return redirect(defaultPathForRole(session.role));
    }

    return undefined;
  },
});
