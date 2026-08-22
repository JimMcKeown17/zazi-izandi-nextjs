import assert from "node:assert/strict";
import test from "node:test";

import {
  createPasswordSupabaseClient,
  derivePermittedSupabaseProjectRef,
} from "./browser-supabase";
import { bootstrapPasswordJourney } from "./bootstrap";
import { forwardPasswordCompletion } from "./completion-route";
import { SAFE_MESSAGES } from "./contract";
import { createPasswordJourney, type PasswordAuthBoundary } from "./journey";
import { isPublicEaSetPasswordRoute } from "@/lib/routes/public-routes";

const OPERATION_ID = "123e4567-e89b-42d3-a456-426614174000";
const TEMPORARY_BEARER = "temporary-bearer-that-must-not-reach-ui";

function createAuth(options: {
  recovery?: boolean;
  updateErrors?: Array<{ code?: string; message?: string } | null>;
  session?: { access_token: string } | null;
} = {}): PasswordAuthBoundary & { updates: number; signOuts: number; signOutScopes: string[] } {
  let listener: ((event: string, session: { access_token: string } | null) => void) | null = null;
  const session = options.session === undefined ? { access_token: TEMPORARY_BEARER } : options.session;
  const updateErrors = [...(options.updateErrors ?? [])];
  return {
    updates: 0,
    signOuts: 0,
    signOutScopes: [],
    onAuthStateChange(nextListener) {
      listener = nextListener;
      return () => {
        listener = null;
      };
    },
    async getSession() {
      if (options.recovery) listener?.("PASSWORD_RECOVERY", session);
      return { data: { session }, error: null };
    },
    async updateUser() {
      this.updates += 1;
      return { error: updateErrors.shift() ?? null };
    },
    async signOut(options) {
      this.signOuts += 1;
      this.signOutScopes.push(options.scope);
    },
  };
}

test("the public browser client rejects a wrong project before factory construction and has no persistent auth storage", () => {
  let constructionCount = 0;
  assert.throws(
    () =>
      createPasswordSupabaseClient(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://wrong-project.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key_value",
        },
        (() => {
          constructionCount += 1;
          return {};
        }) as never
      ),
    /Unpermitted/
  );
  assert.equal(constructionCount, 0);
  assert.equal(
    derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co"),
    "yaclyyurdwarhmiheojr"
  );

  let capturedOptions: unknown;
  createPasswordSupabaseClient(
    {
      NEXT_PUBLIC_SUPABASE_URL: "https://yaclyyurdwarhmiheojr.supabase.co",
      NEXT_PUBLIC_SUPABASE_ANON_KEY: "sb_publishable_test_key_value",
    },
    ((_url: string, _key: string, options: unknown) => {
      capturedOptions = options;
      return {};
    }) as never
  );
  assert.deepEqual(capturedOptions, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: true },
  });
});

test("password cleanup remains local to this browser session and cannot sign out other devices", async () => {
  const auth = createAuth({ recovery: true });
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => undefined,
    completion: async () => ({ ok: true }),
  });
  await journey.capture(null);
  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("failed browser client construction still clears the complete password URL before terminal UI", () => {
  const trace: string[] = [];
  const bootstrap = bootstrapPasswordJourney({
    search: "?operation_id=forged&code=provider-url-credential",
    clearUrl: () => trace.push("history-scrubbed"),
    createJourney: () => {
      trace.push("construction-attempted");
      throw new Error("configuration failure");
    },
  });
  assert.deepEqual(trace, ["construction-attempted", "history-scrubbed"]);
  assert.equal(bootstrap.journey, null);
  assert.deepEqual(bootstrap.result, {
    kind: "terminal_error",
    code: "unavailable",
    message: SAFE_MESSAGES.unavailable,
  });
});

test("a history exception during failed construction still returns a terminal bootstrap", () => {
  const bootstrap = bootstrapPasswordJourney({
    search: "?code=provider-url-credential",
    clearUrl: () => {
      throw new Error("history unavailable");
    },
    createJourney: () => {
      throw new Error("configuration failure");
    },
  });

  assert.equal(bootstrap.journey, null);
  assert.deepEqual(bootstrap.result, {
    kind: "terminal_error",
    code: "unavailable",
    message: SAFE_MESSAGES.unavailable,
  });
});

test("duplicate operation candidates are ambiguous evidence and fail closed", async () => {
  const auth = createAuth({ recovery: true });
  const bootstrap = bootstrapPasswordJourney({
    search: `?operation_id=${OPERATION_ID}&operation_id=${OPERATION_ID}`,
    clearUrl: () => undefined,
    createJourney: () =>
      createPasswordJourney({
        auth,
        clearUrl: () => undefined,
        completion: async () => ({ ok: true }),
      }),
  });

  assert.ok(bootstrap.journey);
  assert.equal(
    (await bootstrap.journey.capture(bootstrap.operationCandidate)).kind,
    "terminal_error"
  );
  assert.equal(auth.updates, 0);
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("a provider subscription exception is sanitized while local discard and URL cleanup still run", async () => {
  const signOutScopes: string[] = [];
  let urlScrubs = 0;
  const auth: PasswordAuthBoundary = {
    onAuthStateChange() {
      throw new Error("raw provider subscription failure");
    },
    async getSession() {
      throw new Error("must not run");
    },
    async updateUser() {
      return { error: null };
    },
    async signOut(options) {
      signOutScopes.push(options.scope);
    },
  };
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => {
      urlScrubs += 1;
    },
    completion: async () => ({ ok: true }),
  });

  const outcome = await journey.capture(null);
  assert.deepEqual(outcome, {
    kind: "terminal_error",
    code: "invalid_link",
    message: SAFE_MESSAGES.invalidLink,
  });
  assert.equal(urlScrubs, 1);
  assert.deepEqual(signOutScopes, ["local"]);
  assert.ok(!JSON.stringify(outcome).includes("provider"));
});

test("an unsubscribe exception cannot prevent terminal cleanup or leak provider text", async () => {
  const signOutScopes: string[] = [];
  let urlScrubs = 0;
  const auth: PasswordAuthBoundary = {
    onAuthStateChange() {
      return () => {
        throw new Error("raw provider unsubscribe failure");
      };
    },
    async getSession() {
      return {
        data: { session: null },
        error: { message: "raw provider session failure" },
      };
    },
    async updateUser() {
      return { error: null };
    },
    async signOut(options) {
      signOutScopes.push(options.scope);
    },
  };
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => {
      urlScrubs += 1;
    },
    completion: async () => ({ ok: true }),
  });

  const outcome = await journey.capture(null);
  assert.deepEqual(outcome, {
    kind: "terminal_error",
    code: "invalid_link",
    message: SAFE_MESSAGES.invalidLink,
  });
  assert.equal(urlScrubs, 1);
  assert.deepEqual(signOutScopes, ["local"]);
  assert.ok(!JSON.stringify(outcome).includes("provider"));
});

test("a history cleanup failure fails closed after a valid recovery and prevents password update", async () => {
  const auth = createAuth({ recovery: true });
  let completionCalls = 0;
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => {
      throw new Error("browser history failure");
    },
    completion: async () => {
      completionCalls += 1;
      return { ok: true };
    },
  });

  assert.deepEqual(await journey.capture(null), {
    kind: "terminal_error",
    code: "invalid_link",
    message: SAFE_MESSAGES.invalidLink,
  });
  assert.deepEqual(auth.signOutScopes, ["local"]);
  assert.equal((await journey.submit("better-password", "better-password")).kind, "terminal_error");
  assert.equal(auth.updates, 0);
  assert.equal(completionCalls, 0);
});

test("only the exact public password route is Clerk-exempt", () => {
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password"), true);
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password/"), false);
  assert.equal(isPublicEaSetPasswordRoute("/ea-set-password/anything"), false);
});

test("the browser client rejects paths, ports, and service-role-looking keys before construction", () => {
  assert.throws(
    () => derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co/rest/v1"),
    /Invalid/
  );
  assert.throws(
    () => derivePermittedSupabaseProjectRef("https://yaclyyurdwarhmiheojr.supabase.co:8443"),
    /Invalid/
  );
  let constructionCount = 0;
  assert.throws(
    () =>
      createPasswordSupabaseClient(
        {
          NEXT_PUBLIC_SUPABASE_URL: "https://yaclyyurdwarhmiheojr.supabase.co",
          NEXT_PUBLIC_SUPABASE_ANON_KEY: "service_role_credential_that_must_never_be_browser_visible",
        },
        (() => {
          constructionCount += 1;
          return {};
        }) as never
      ),
    /Invalid/
  );
  assert.equal(constructionCount, 0);
});

test("provider-proved recovery clears URL credentials before retaining a temporary in-memory session", async () => {
  const auth = createAuth({ recovery: true });
  const history: string[] = [];
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => history.push("/ea-set-password"),
    completion: async () => ({ ok: true }),
  });

  assert.deepEqual(await journey.capture(null), { kind: "ready" });
  assert.deepEqual(history, ["/ea-set-password"]);
  assert.equal(auth.signOuts, 0);
});

test("the bounded recovery latch accepts PASSWORD_RECOVERY emitted after getSession and scrubs history before ready", async () => {
  let listener: ((event: string, session: { access_token: string } | null) => void) | null = null;
  const trace: string[] = [];
  const auth: PasswordAuthBoundary = {
    onAuthStateChange(nextListener) {
      listener = nextListener;
      return () => {
        listener = null;
      };
    },
    async getSession() {
      trace.push("get-session-resolved");
      setTimeout(() => {
        listener?.("PASSWORD_RECOVERY", { access_token: TEMPORARY_BEARER });
      }, 0);
      return { data: { session: { access_token: TEMPORARY_BEARER } }, error: null };
    },
    async updateUser() {
      return { error: null };
    },
    async signOut() {},
  };
  const journey = createPasswordJourney({
    auth,
    completion: async () => ({ ok: true }),
    clearUrl: () => trace.push("history-scrubbed"),
  });

  const outcome = await journey.capture(null);
  trace.push("ui-ready");
  assert.deepEqual(outcome, { kind: "ready" });
  assert.deepEqual(trace, ["get-session-resolved", "history-scrubbed", "ui-ready"]);
});

test("a weak password retry retains only the in-memory session and leaks no provider text", async () => {
  const auth = createAuth({
    recovery: true,
    updateErrors: [{ code: "weak_password", message: "secret upstream rule: more entropy" }],
  });
  let completionBearer: string | null = null;
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => undefined,
    completion: async ({ bearer }) => {
      completionBearer = bearer;
      return { ok: true };
    },
  });
  await journey.capture(null);

  const weak = await journey.submit("short", "short");
  assert.deepEqual(weak, {
    kind: "recoverable_error",
    code: "weak_password",
    message: SAFE_MESSAGES.weakPassword,
  });
  assert.ok(!JSON.stringify(weak).includes("upstream"));
  assert.ok(!JSON.stringify(weak).includes(TEMPORARY_BEARER));
  assert.equal(auth.signOuts, 0);

  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.equal(auth.updates, 2);
  assert.equal(auth.signOuts, 1);
  assert.equal(completionBearer, null, "operation-less recovery must not call completion");
});

test("operation-bound completion forwards only the canonical operation ID in JSON and the bearer in Authorization", async () => {
  let observed: { path?: string; body?: unknown; init?: RequestInit } = {};
  const response = await forwardPasswordCompletion(
    new Request("https://next.example/api/mobile/password-completion", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEMPORARY_BEARER}`, "Content-Type": "application/json" },
      body: JSON.stringify({ operation_id: OPERATION_ID }),
    }),
    (async (path: string, body: unknown, init?: RequestInit) => {
      observed = { path, body, init };
      return new Response(JSON.stringify({ kind: "provisioning_completed", operation_id: OPERATION_ID }), { status: 200 });
    }) as never
  );

  assert.deepEqual(response, { status: 200, body: { kind: "completed" } });
  assert.equal(observed.path, "/api/mobile/accounts/password-completion/");
  assert.deepEqual(observed.body, { operation_id: OPERATION_ID });
  assert.equal(new Headers(observed.init?.headers).get("authorization"), `Bearer ${TEMPORARY_BEARER}`);
  assert.equal(observed.init?.redirect, "manual");
  assert.ok(!JSON.stringify(observed.body).includes(TEMPORARY_BEARER));
});

test("operation-bound success signs out after Django confirmation", async () => {
  const auth = createAuth();
  let calls = 0;
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => undefined,
    completion: async ({ operationId, bearer }) => {
      calls += 1;
      assert.equal(operationId, OPERATION_ID);
      assert.equal(bearer, TEMPORARY_BEARER);
      return { ok: true };
    },
  });
  assert.equal((await journey.capture(OPERATION_ID)).kind, "ready");
  assert.equal((await journey.submit("better-password", "better-password")).kind, "success");
  assert.equal(calls, 1);
  assert.equal(auth.signOuts, 1);
});

test("missing or forged operation evidence cannot turn an ordinary session into a self-service recovery", async () => {
  for (const candidate of [null, "forged-operation-id"]) {
    const auth = createAuth({ recovery: false });
    let completionCalls = 0;
    const journey = createPasswordJourney({
      auth,
      clearUrl: () => undefined,
      completion: async () => {
        completionCalls += 1;
        return { ok: true };
      },
    });
    assert.deepEqual(await journey.capture(candidate), {
      kind: "terminal_error",
      code: "invalid_link",
      message: SAFE_MESSAGES.invalidLink,
    });
    assert.equal(auth.updates, 0);
    assert.equal(completionCalls, 0);
    assert.equal(auth.signOuts, 1);
  }
});

test("a forged nonempty operation candidate fails even when the provider proves a recovery redirect", async () => {
  const auth = createAuth({ recovery: true });
  let completionCalls = 0;
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => undefined,
    completion: async () => {
      completionCalls += 1;
      return { ok: true };
    },
  });
  assert.deepEqual(await journey.capture("not-a-canonical-operation-id"), {
    kind: "terminal_error",
    code: "invalid_link",
    message: SAFE_MESSAGES.invalidLink,
  });
  assert.equal(auth.updates, 0);
  assert.equal(completionCalls, 0);
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("an explicitly empty operation_id is invalid evidence, not an absent self-service candidate", async () => {
  const auth = createAuth({ recovery: true });
  const journey = createPasswordJourney({
    auth,
    clearUrl: () => undefined,
    completion: async () => ({ ok: true }),
  });
  assert.equal((await journey.capture("")).kind, "terminal_error");
  assert.equal(auth.updates, 0);
  assert.deepEqual(auth.signOutScopes, ["local"]);
});

test("malformed and redirect Django completion responses remain a truthful terminal partial result", async () => {
  for (const response of [
    new Response("not-json", { status: 200 }),
    new Response(null, { status: 302, headers: { Location: "https://unexpected.example" } }),
    new Response(JSON.stringify({ kind: "unknown", operation_id: OPERATION_ID }), { status: 200 }),
  ]) {
    const result = await forwardPasswordCompletion(
      new Request("https://next.example/api/mobile/password-completion", {
        method: "POST",
        headers: { Authorization: `Bearer ${TEMPORARY_BEARER}` },
        body: JSON.stringify({ operation_id: OPERATION_ID }),
      }),
      (async () => response) as never
    );
    assert.deepEqual(result, { status: 502, body: { kind: "completion_unconfirmed" } });
  }
});

test("completion route rejects cross-use body shapes before forwarding and exposes only sanitized errors", async () => {
  let forwarded = false;
  const result = await forwardPasswordCompletion(
    new Request("https://next.example/api/mobile/password-completion", {
      method: "POST",
      headers: { Authorization: `Bearer ${TEMPORARY_BEARER}` },
      body: JSON.stringify({ operation_id: OPERATION_ID, bearer: TEMPORARY_BEARER }),
    }),
    (async () => {
      forwarded = true;
      throw new Error("must not run");
    }) as never
  );
  assert.deepEqual(result, { status: 400, body: { kind: "invalid_request" } });
  assert.equal(forwarded, false);
  assert.ok(!JSON.stringify(result).includes(TEMPORARY_BEARER));
});
