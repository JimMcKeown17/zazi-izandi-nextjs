import assert from "node:assert/strict";
import test from "node:test";

import {
  createPasswordSupabaseClient,
  derivePermittedSupabaseProjectRef,
} from "./browser-supabase";
import { bootstrapPasswordJourney } from "./bootstrap";
import { capturePasswordCallback, type CapturedPasswordCallback } from "./callback";
import { forwardPasswordCompletion } from "./completion-route";
import { SAFE_MESSAGES } from "./contract";
import { createPasswordJourney, type PasswordAuthBoundary } from "./journey";
import { isPublicEaSetPasswordRoute } from "@/lib/routes/public-routes";

const OPERATION_ID = "123e4567-e89b-42d3-a456-426614174000";
const ACCESS_TOKEN = "access-token-only-a-test-fixture";
const REFRESH_TOKEN = "refresh-token-only-a-test-fixture";
const PROVIDER_SESSION_BEARER = "provider-validated-session-bearer";
const CALLBACK_URL = `https://example.test/ea-set-password?operation_id=${OPERATION_ID}#access_token=${ACCESS_TOKEN}&refresh_token=${REFRESH_TOKEN}&type=invite&expires_in=3600&token_type=bearer`;

function callback(overrides: Partial<CapturedPasswordCallback> = {}): CapturedPasswordCallback {
  return {
    accessToken: ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
    callbackType: "recovery",
    operationCandidate: null,
    ...overrides,
  };
}

function createAuth(options: {
  setSessionError?: { code?: string; message?: string } | null;
  providerUser?: object | null;
  updateErrors?: Array<{ code?: string; message?: string } | null>;
} = {}): PasswordAuthBoundary & {
  setSessions: Array<{ access_token: string; refresh_token: string }>;
  updates: number;
  signOutScopes: string[];
} {
  const updateErrors = [...(options.updateErrors ?? [])];
  return {
    setSessions: [],
    updates: 0,
    signOutScopes: [],
    async setSession(tokens) {
      this.setSessions.push(tokens);
      return {
        data: {
          session: options.setSessionError ? null : { access_token: PROVIDER_SESSION_BEARER },
          user: options.providerUser === undefined ? { id: "provider-user" } : options.providerUser,
        },
        error: options.setSessionError ?? null,
      };
    },
    async updateUser() {
      this.updates += 1;
      return { error: updateErrors.shift() ?? null };
    },
    async signOut(options) {
      this.signOutScopes.push(options.scope);
    },
  };
}

test("RED/GREEN bootstrap: synchronously scrubs original callback history before client construction", () => {
  const trace: string[] = [];
  const bootstrap = bootstrapPasswordJourney({
    href: CALLBACK_URL,
    scrubOriginalCallbackUrl: () => trace.push("history-replace-state"),
    createJourney: (captured) => {
      trace.push("client-constructed");
      assert.equal(captured.accessToken, ACCESS_TOKEN);
      return {} as never;
    },
  });
  assert.ok(bootstrap.journey);
  assert.deepEqual(trace, ["history-replace-state", "client-constructed"]);
});

test("scrub failure fails closed before client construction", () => {
  let constructionCount = 0;
  const bootstrap = bootstrapPasswordJourney({
    href: CALLBACK_URL,
    scrubOriginalCallbackUrl: () => {
      throw new Error("history failure");
    },
    createJourney: () => {
      constructionCount += 1;
      return {} as never;
    },
  });
  assert.equal(constructionCount, 0);
  assert.equal(bootstrap.journey, null);
  assert.deepEqual(bootstrap.result, {
    kind: "terminal_error",
    code: "unavailable",
    message: SAFE_MESSAGES.unavailable,
  });
});

test("callback capture accepts exact root evidence and rejects duplicate, malformed, and cross-path inputs", () => {
  assert.deepEqual(capturePasswordCallback(CALLBACK_URL), {
    accessToken: ACCESS_TOKEN,
    refreshToken: REFRESH_TOKEN,
    callbackType: "invite",
    operationCandidate: OPERATION_ID,
  });
  for (const href of [
    CALLBACK_URL.replace("/ea-set-password", "/ea-set-password/other"),
    CALLBACK_URL.replace("access_token=", "access_token=x&access_token="),
    CALLBACK_URL.replace("type=invite", "type=unknown"),
    CALLBACK_URL.replace("refresh_token=", "refresh_token=bad%20token"),
    CALLBACK_URL.replace(`operation_id=${OPERATION_ID}`, `operation_id=${OPERATION_ID}&operation_id=${OPERATION_ID}`),
  ]) {
    assert.equal(capturePasswordCallback(href), null);
  }
});

test("isolated client rejects wrong project pre-construction and disables URL auto-detection", () => {
  let constructionCount = 0;
  assert.throws(
    () => createPasswordSupabaseClient({ NEXT_PUBLIC_SUPABASE_URL: "https://wrong-project.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key_value" }, (() => { constructionCount += 1; return {}; }) as never),
    /Unpermitted/
  );
  assert.equal(constructionCount, 0);
  assert.equal(derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co"), "yaclyyurdwarhmiheojr");
  let options: unknown;
  createPasswordSupabaseClient(
    { NEXT_PUBLIC_SUPABASE_URL: "https://yaclyyurdwarhmiheojr.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key_value" },
    ((_url: string, _key: string, nextOptions: unknown) => { options = nextOptions; return {}; }) as never
  );
  assert.deepEqual(options, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } });
});

test("browser client rejects paths, ports, and service-role-looking keys before construction", () => {
  assert.throws(() => derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co/rest/v1"), /Invalid/);
  assert.throws(() => derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co:8443"), /Invalid/);
  let constructionCount = 0;
  assert.throws(
    () => createPasswordSupabaseClient({ NEXT_PUBLIC_SUPABASE_URL: "https://yaclyyurdwarhmiheojr.supabase.co", NEXT_PUBLIC_SUPABASE_ANON_KEY: "service_role_credential_that_must_never_be_browser_visible" }, (() => { constructionCount += 1; return {}; }) as never),
    /Invalid/
  );
  assert.equal(constructionCount, 0);
});

test("provider-validated recovery callback/session uses exact setSession input and local-only discard", async () => {
  const auth = createAuth();
  const journey = createPasswordJourney({ auth, completion: async () => ({ ok: true }) });
  assert.deepEqual(await journey.capture(callback()), { kind: "ready" });
  assert.deepEqual(auth.setSessions, [{ access_token: ACCESS_TOKEN, refresh_token: REFRESH_TOKEN }]);
  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("operation-less setup rejects invite callbacks and provider session/user failures", async () => {
  const cases = [
    { auth: createAuth(), input: callback({ callbackType: "invite" }) },
    { auth: createAuth({ providerUser: null }), input: callback() },
    { auth: createAuth({ setSessionError: { message: "provider failure" } }), input: callback() },
  ];
  for (const { auth, input } of cases) {
    const journey = createPasswordJourney({ auth, completion: async () => ({ ok: true }) });
    assert.equal((await journey.capture(input)).kind, "terminal_error");
    assert.equal(auth.updates, 0);
    assert.deepEqual(auth.signOutScopes, ["local"]);
  }
});

test("weak-password retry retains only ephemeral provider session and never completes recovery with Django", async () => {
  const auth = createAuth({ updateErrors: [{ code: "weak_password", message: "provider text" }] });
  let completionCalls = 0;
  const journey = createPasswordJourney({ auth, completion: async () => { completionCalls += 1; return { ok: true }; } });
  await journey.capture(callback());
  const weak = await journey.submit("short", "short");
  assert.deepEqual(weak, { kind: "recoverable_error", code: "weak_password", message: SAFE_MESSAGES.weakPassword });
  assert.ok(!JSON.stringify(weak).includes("provider text"));
  assert.equal(auth.signOutScopes.length, 0);
  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.equal(completionCalls, 0);
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("operation-bound callback sends only provider session bearer to completion and signs out locally", async () => {
  const auth = createAuth();
  let received: { operationId?: string; bearer?: string } = {};
  const journey = createPasswordJourney({ auth, completion: async ({ operationId, bearer }) => { received = { operationId, bearer }; return { ok: true }; } });
  assert.equal((await journey.capture(callback({ callbackType: "invite", operationCandidate: OPERATION_ID }))).kind, "ready");
  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.deepEqual(received, { operationId: OPERATION_ID, bearer: PROVIDER_SESSION_BEARER });
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("malformed operation candidate cannot downgrade invite callback to recovery", async () => {
  const auth = createAuth();
  const journey = createPasswordJourney({ auth, completion: async () => ({ ok: true }) });
  assert.equal((await journey.capture(callback({ callbackType: "invite", operationCandidate: "forged" }))).kind, "terminal_error");
  assert.equal(auth.updates, 0);
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("retired auth-js subscription surface cannot be reached by explicit session journey", async () => {
  const auth = createAuth() as unknown as PasswordAuthBoundary & { onAuthStateChange(): never };
  auth.onAuthStateChange = () => { throw new Error("subscription must not run"); };
  const journey = createPasswordJourney({ auth, completion: async () => ({ ok: true }) });
  assert.deepEqual(await journey.capture(callback()), { kind: "ready" });
});

test("only exact public password route is Clerk-exempt", () => {
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password"), true);
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password/"), false);
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password/anything"), false);
});

test("operation completion forwards only canonical JSON and bearer Authorization", async () => {
  let observed: { path?: string; body?: unknown; init?: RequestInit } = {};
  const response = await forwardPasswordCompletion(
    new Request("https://next.example/api/mobile/password-completion", { method: "POST", headers: { Authorization: `Bearer ${PROVIDER_SESSION_BEARER}` }, body: JSON.stringify({ operation_id: OPERATION_ID }) }),
    (async (path: string, body: unknown, init?: RequestInit) => { observed = { path, body, init }; return new Response(JSON.stringify({ kind: "provisioning_completed", operation_id: OPERATION_ID }), { status: 200 }); }) as never
  );
  assert.deepEqual(response, { status: 200, body: { kind: "completed" } });
  assert.equal(observed.path, "/api/mobile/accounts/password-completion/");
  assert.deepEqual(observed.body, { operation_id: OPERATION_ID });
  assert.equal(new Headers(observed.init?.headers).get("authorization"), `Bearer ${PROVIDER_SESSION_BEARER}`);
  assert.equal(observed.init?.redirect, "manual");
  assert.ok(!JSON.stringify(observed.body).includes(PROVIDER_SESSION_BEARER));
});

test("malformed and redirect completion responses fail closed", async () => {
  for (const upstream of [
    new Response("not-json", { status: 200 }),
    new Response(null, { status: 302, headers: { Location: "https://unexpected.example" } }),
    new Response(JSON.stringify({ kind: "unknown", operation_id: OPERATION_ID }), { status: 200 }),
  ]) {
    const result = await forwardPasswordCompletion(
      new Request("https://next.example/api/mobile/password-completion", { method: "POST", headers: { Authorization: `Bearer ${PROVIDER_SESSION_BEARER}` }, body: JSON.stringify({ operation_id: OPERATION_ID }) }),
      (async () => upstream) as never
    );
    assert.deepEqual(result, { status: 502, body: { kind: "completion_unconfirmed" } });
  }
});

test("cross-use completion body fails closed without bearer text", async () => {
  const result = await forwardPasswordCompletion(
    new Request("https://next.example/api/mobile/password-completion", { method: "POST", headers: { Authorization: `Bearer ${PROVIDER_SESSION_BEARER}` }, body: JSON.stringify({ operation_id: OPERATION_ID, bearer: PROVIDER_SESSION_BEARER }) }),
    (async () => new Response("not-json", { status: 200 })) as never
  );
  assert.deepEqual(result, { status: 400, body: { kind: "invalid_request" } });
  assert.ok(!JSON.stringify(result).includes(PROVIDER_SESSION_BEARER));
});
