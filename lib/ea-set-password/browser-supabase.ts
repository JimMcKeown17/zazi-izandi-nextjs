import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { PERMITTED_SUPABASE_PROJECT_REF } from "./contract";

type PublicSupabaseEnvironment = {
  NEXT_PUBLIC_SUPABASE_URL?: string;
  NEXT_PUBLIC_SUPABASE_ANON_KEY?: string;
};

export type BrowserSupabaseClientFactory = typeof createClient;

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
): SupabaseClient {
  const configuredUrl = environment.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = environment.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!configuredUrl || !anonKey) {
    throw new Error("Missing public Supabase configuration");
  }

  // This validation intentionally precedes factory invocation/network-capable client construction.
  derivePermittedSupabaseProjectRef(configuredUrl);
  validatePublicSupabaseAnonKey(anonKey);

  return factory(configuredUrl, anonKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: true,
    },
  });
}
