const CALLBACK_PATH = "/ea-set-password";
const CALLBACK_ORIGIN = "https://www.zazi-izandi.co.za";
const TOKEN_PATTERN = /^[A-Za-z0-9._~-]{1,8192}$/;
const CALLBACK_TYPES = new Set(["invite", "recovery"]);
const OPTIONAL_FRAGMENT_FIELDS = new Set(["expires_in", "expires_at", "token_type"]);

export type CapturedPasswordCallback = {
  accessToken: string;
  refreshToken: string;
  callbackType: "invite" | "recovery";
  operationCandidate: string | null;
};

function oneValue(values: URLSearchParams, field: string): string | null {
  const matches = values.getAll(field);
  return matches.length === 1 ? matches[0] : null;
}

function isPositiveIntegerAtMost(
  value: string,
  maximum: number,
  maximumDigits: number
): boolean {
  if (value.length > maximumDigits || !/^[1-9][0-9]*$/.test(value)) return false;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed <= maximum;
}

/**
 * Parses callback evidence locally. It neither constructs a client nor logs or
 * stores credential values. The caller must scrub browser history before I/O.
 */
export function capturePasswordCallback(href: string): CapturedPasswordCallback | null {
  let url: URL;
  try {
    url = new URL(href);
  } catch {
    return null;
  }
  if (
    url.origin !== CALLBACK_ORIGIN ||
    url.username ||
    url.password ||
    url.port ||
    url.pathname !== CALLBACK_PATH ||
    url.searchParams.getAll("operation_id").length > 1
  ) {
    return null;
  }
  for (const key of url.searchParams.keys()) {
    if (key !== "operation_id") return null;
  }

  const fragment = new URLSearchParams(url.hash.startsWith("#") ? url.hash.slice(1) : url.hash);
  const allowedFields = new Set(["access_token", "refresh_token", "type", ...OPTIONAL_FRAGMENT_FIELDS]);
  for (const key of fragment.keys()) {
    if (!allowedFields.has(key) || fragment.getAll(key).length !== 1) return null;
  }

  const accessToken = oneValue(fragment, "access_token");
  const refreshToken = oneValue(fragment, "refresh_token");
  const callbackType = oneValue(fragment, "type");
  if (
    !accessToken ||
    !refreshToken ||
    !callbackType ||
    !TOKEN_PATTERN.test(accessToken) ||
    !TOKEN_PATTERN.test(refreshToken) ||
    !CALLBACK_TYPES.has(callbackType)
  ) {
    return null;
  }
  const tokenType = fragment.get("token_type");
  if (tokenType !== null && tokenType !== "bearer") return null;
  const expiresIn = fragment.get("expires_in");
  if (expiresIn !== null && !isPositiveIntegerAtMost(expiresIn, 2_147_483_647, 10)) {
    return null;
  }
  const expiresAt = fragment.get("expires_at");
  if (expiresAt !== null && !isPositiveIntegerAtMost(expiresAt, Number.MAX_SAFE_INTEGER, 16)) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
    callbackType: callbackType as "invite" | "recovery",
    operationCandidate: url.searchParams.get("operation_id"),
  };
}
