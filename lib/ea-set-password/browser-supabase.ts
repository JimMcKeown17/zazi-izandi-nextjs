import { createClient, type SupabaseClient, type SupabaseClientOptions } from "@supabase/supabase-js";

import { PERMITTED_SUPABASE_PROJECT_REF } from "./contract";
import type { PasswordAuthBoundary } from "./journey";

type PublicSupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type BrowserSupabaseClientFactory = (
  url: string,
  key: string,
  options: SupabaseClientOptions<"public">
) => SupabaseClient;

/**
 * Parses a Supabase project URL without retaining or printing that URL. The
 * browser password client must never even be constructed for another project.
 */
export function derivePermittedSupabaseProjectRef(configuredUrl: string): string {
  let url: URL;
  try {
    url = new URL(configuredUrl);
  } catch {
    throw new Error("Invalid public Supabase configuration");
  }

  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== "/" ||
    url.search ||
    url.hash
  ) {
    throw new Error("Invalid public Supabase configuration");
  }

  const hostnameParts = url.hostname.toLowerCase().split(".");
  if (
    hostnameParts.length !== 3 ||
    hostnameParts[1] !== "supabase" ||
    hostnameParts[2] !== "co" ||
    hostnameParts[0] !== PERMITTED_SUPABASE_PROJECT_REF
  ) {
    throw new Error("Unpermitted public Supabase project");
  }

  return hostnameParts[0];
}

function decodeLegacyJwtPayload(key: string): Record<string, unknown> | null {
  const parts = key.split(".");
  if (parts.length !== 3 || parts.some((part) => !/^[A-Za-z0-9_-]+$/.test(part))) {
    return null;
  }
  try {
    const encodedPayload = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    const paddedPayload = encodedPayload.padEnd(Math.ceil(encodedPayload.length / 4) * 4, "=");
    const payload = JSON.parse(atob(paddedPayload)) as unknown;
    return payload && typeof payload === "object" && !Array.isArray(payload)
      ? (payload as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** Rejects secret/admin-looking values before a network-capable client exists. */
export function validatePublicSupabaseAnonKey(anonKey: string): void {
  if (anonKey.length < 16 || anonKey.length > 8192 || /\s/.test(anonKey)) {
    throw new Error("Invalid public Supabase configuration");
  }
  if (/^sb_publishable_[A-Za-z0-9_-]+$/.test(anonKey)) return;
  if (/^sb_secret_/i.test(anonKey) || /service[_-]?role/i.test(anonKey)) {
    throw new Error("Invalid public Supabase configuration");
  }

  const payload = decodeLegacyJwtPayload(anonKey);
  if (!payload || payload.role !== "anon") {
    throw new Error("Invalid public Supabase configuration");
  }
  for (const refField of ["ref", "project_ref"]) {
    const candidate = payload[refField];
    if (candidate !== undefined && candidate !== PERMITTED_SUPABASE_PROJECT_REF) {
      throw new Error("Invalid public Supabase configuration");
    }
  }
}

export function createPasswordSupabaseClient(
  environment: PublicSupabaseEnvironment,
  factory: BrowserSupabaseClientFactory = createClient
): { auth: PasswordAuthBoundary } {
  const configuredUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !anonKey) {
    throw new Error("Missing public Supabase configuration");
  }

  // This validation intentionally precedes factory invocation/network-capable client construction.
  derivePermittedSupabaseProjectRef(configuredUrl);
  validatePublicSupabaseAnonKey(anonKey);

  let client: SupabaseClient | null = factory(configuredUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  });

  // Expose only the password boundary. Supabase can retain its private memory
  // session when logout fails, so neither the page nor its journey owns the raw
  // client. Detach it synchronously and retire its listener after pending SDK
  // calls settle, regardless of whether the provider revokes the session.
  return {
    auth: {
      async setSession(tokens) {
        if (!client) return {
          data: { session: null, user: null },
          error: { code: "session_disposed" },
        };
        return client.auth.setSession(tokens);
      },
      async updateUser(attributes) {
        if (!client) return { error: { code: "session_disposed" } };
        return client.auth.updateUser(attributes);
      },
      async signOut(options) {
        const retiring = client;
        client = null;
        if (!retiring) return;
        try {
          return await retiring.auth.signOut(options);
        } finally {
          // signOut waits for initialization and serialized session operations.
          // This public API also removes the SDK's visibilitychange listener.
          await retiring.auth.stopAutoRefresh();
        }
      },
    },
  };
}
