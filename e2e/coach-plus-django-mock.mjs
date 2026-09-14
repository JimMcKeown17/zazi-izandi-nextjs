import { createServer } from "node:http";
import { VALID_MOBILE_USER_PROFILE_PAYLOAD as profile } from "../lib/mobile/user-profile/test-fixtures.ts";

const host = "127.0.0.1";
const port = 4013;
const entitlements = new Map();
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function send(response, status, body) {
  response.writeHead(status, {
    "Content-Type": "application/json",
    "Cache-Control": "private, no-store",
  });
  response.end(JSON.stringify(body));
}

function callerClaims(request) {
  const token = /^Bearer (\S+)$/.exec(request.headers.authorization ?? "")?.[1];
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 3 || parts.some((part) => !part)) return null;
  try {
    // Local contract mock only: read Clerk's session metadata, without network
    // signature verification. This is not proof of Django JWT verification.
    const claims = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8"));
    return typeof claims?.sub === "string" && claims.sub ? claims : null;
  } catch {
    return null;
  }
}

function entitlement(userId) {
  return {
    user_id: userId,
    feature_key: "ai_coach",
    ...(entitlements.get(userId) ?? { enabled: false, server_updated_at: null }),
  };
}

createServer(async (request, response) => {
  const url = new URL(request.url ?? "/", `http://${host}:${port}`);
  if (url.pathname === "/health") return send(response, 200, { ok: true });
  const claims = callerClaims(request);
  if (!claims) return send(response, 401, { error: "unauthorized" });
  if (request.headers["x-internal-auth"] !== "offline-mobile-contract-test-secret") {
    return send(response, 403, { error: "forbidden" });
  }
  const role = claims.metadata?.role;

  if (url.pathname.startsWith("/api/mobile/users/") && request.method === "GET") {
    if (!["admin", "senior_staff", "zz_data_manager"].includes(role)) {
      return send(response, 403, { error: "forbidden" });
    }
    if (url.pathname !== `/api/mobile/users/${profile.user_id}/`) {
      return send(response, 404, { error: "user not found" });
    }
    return send(response, 200, profile);
  }

  if (url.pathname === "/api/mobile/coach/entitlements/") {
    if (!["admin", "senior_staff"].includes(role)) {
      return send(response, 403, { error: "forbidden" });
    }
    if (!["GET", "POST"].includes(request.method)) {
      return send(response, 405, { error: "method not allowed" });
    }
    let input;
    if (request.method === "POST") {
      try {
        let body = "";
        for await (const chunk of request) body += chunk;
        input = JSON.parse(body);
      } catch {
        return send(response, 400, { error: "invalid JSON" });
      }
    }
    const userId = request.method === "GET" ? url.searchParams.get("user_id") : input?.user_id;
    if (typeof userId !== "string" || !uuid.test(userId)) {
      return send(response, 400, { error: "user_id must be a canonical UUID" });
    }
    const canonicalId = userId.toLowerCase();
    if (request.method === "POST") {
      if (typeof input?.enabled !== "boolean") {
        return send(response, 400, { error: "enabled must be a boolean" });
      }
      entitlements.set(canonicalId, {
        enabled: input.enabled,
        server_updated_at: new Date().toISOString(),
      });
    }
    return send(response, 200, entitlement(canonicalId));
  }
  return send(response, 404, { error: "Coach Plus mock route not found" });
}).listen(port, host);
