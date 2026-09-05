import assert from "node:assert/strict";
import test from "node:test";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { createPasswordSupabaseClient } from "./browser-supabase";
import { createPasswordJourney } from "./journey";

for (const logoutFailure of ["server", "network"] as const) {
  test(`real SDK releases the password adapter and listener after ${logoutFailure} logout failure`, async () => {
    const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, "window");
    const documentDescriptor = Object.getOwnPropertyDescriptor(globalThis, "document");
    const listeners = new Set<unknown>();
    Object.defineProperty(globalThis, "window", { configurable: true, value: {
      addEventListener: (name: string, listener: unknown) => { if (name === "visibilitychange") listeners.add(listener); },
      removeEventListener: (name: string, listener: unknown) => { if (name === "visibilitychange") listeners.delete(listener); },
      location: { href: "https://www.zazi-izandi.co.za/ea-set-password" },
    } });
    Object.defineProperty(globalThis, "document", { configurable: true, value: { visibilityState: "visible" } });
    let rawClient: SupabaseClient | undefined;
    const requests: string[] = [];
    try {
      const user = { id: "11111111-1111-4111-8111-111111111111", email: "synthetic@example.test", app_metadata: {}, user_metadata: {}, aud: "authenticated" };
      const accessToken = [
        Buffer.from(JSON.stringify({ alg: "HS256", typ: "JWT" })).toString("base64url"),
        Buffer.from(JSON.stringify({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 3600 })).toString("base64url"),
        Buffer.from("synthetic-signature").toString("base64url"),
      ].join(".");
      const adapter = createPasswordSupabaseClient({
        NEXT_PUBLIC_SUPABASE_URL: "https://yaclyyurdwarhmiheojr.supabase.co",
        NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_synthetic_test_value",
      }, (url, key, options) => {
        rawClient = createClient(url, key, { ...options, global: { fetch: async (input) => {
          const endpoint = new URL(String(input));
          assert.equal(endpoint.origin, "https://yaclyyurdwarhmiheojr.supabase.co");
          requests.push(endpoint.pathname);
          if (endpoint.pathname === "/auth/v1/user") return new Response(JSON.stringify(user), { status: 200 });
          assert.equal(endpoint.pathname, "/auth/v1/logout");
          if (logoutFailure === "network") throw new Error("synthetic network failure");
          return new Response(JSON.stringify({ message: "synthetic logout failure" }), { status: 500 });
        } } });
        return rawClient;
      });
      const journey = createPasswordJourney({ auth: adapter.auth, completion: async () => { assert.fail("no operation completion after disposal"); } });
      assert.deepEqual(await journey.capture({
        accessToken, refreshToken: "synthetic-refresh", callbackType: "recovery", operationCandidate: null,
      }), { kind: "ready" });
      assert.equal(listeners.size, 1, "positive control: actual SDK attached its visibility listener");
      await journey.dispose();
      assert.deepEqual(requests, ["/auth/v1/user", "/auth/v1/logout"]);
      assert.equal(listeners.size, 0);
      const before = requests.length;
      assert.ok((await adapter.auth.updateUser({ password: "synthetic-password" })).error);
      assert.equal((await adapter.auth.setSession({ access_token: accessToken, refresh_token: "synthetic-refresh" })).data.session, null);
      await journey.submit("synthetic-password", "synthetic-password");
      assert.equal(requests.length, before, "retired adapter cannot reuse SDK-held credentials");
    } finally {
      // The test deliberately owns a raw reference to inspect real SDK behavior;
      // the product only exposes its detached facade. Avoid leaking test globals.
      await rawClient?.auth.stopAutoRefresh();
      if (windowDescriptor) Object.defineProperty(globalThis, "window", windowDescriptor);
      else Reflect.deleteProperty(globalThis, "window");
      if (documentDescriptor) Object.defineProperty(globalThis, "document", documentDescriptor);
      else Reflect.deleteProperty(globalThis, "document");
    }
  });
}
