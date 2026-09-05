export const PAYROLL_EXPORT_KIND = "sessions-payroll-summary" as const;
export const DETAIL_EXPORT_KIND = "sessions-detail" as const;
export type SessionExportKind =
  | typeof PAYROLL_EXPORT_KIND
  | typeof DETAIL_EXPORT_KIND;
export type CapacityRecovery = "population" | "shorter-range" | "narrow-scope";

const RECOVERY_MESSAGE = {
  population:
    "The reporting population exceeds the safe download limit. Contact the data team.",
  "shorter-range":
    "This date range contains too many sessions to download safely. Choose a shorter range and try again.",
  "narrow-scope":
    "The export is larger than the safe download limit. Choose a shorter range or one school and try again.",
} as const;

const config = {
  [PAYROLL_EXPORT_KIND]: {
    djangoSlug: "payroll-summary",
    filenameSlug: "payroll-summary",
    schema: "mobile-sessions-payroll-summary-v1",
    maxBytes: 10_000_000,
    capacityPrefix: "mobile-sessions-payroll-summary",
    codePrefix: "mobile_sessions_payroll_summary_export",
  },
  [DETAIL_EXPORT_KIND]: {
    djangoSlug: "detail",
    filenameSlug: "detail",
    schema: "mobile-sessions-detail-v1",
    maxBytes: 20_000_000,
    capacityPrefix: "mobile-sessions-detail",
    codePrefix: "mobile_sessions_detail_export",
  },
} as const;

const PUBLIC_CAPACITY_CONTRACT = {
  "sessions-payroll-summary:population": {
    token: "mobile-sessions-payroll-summary-capacity-population-v1",
    code: "mobile_sessions_payroll_summary_export_population_capacity_exceeded",
  },
  "sessions-payroll-summary:shorter-range": {
    token: "mobile-sessions-payroll-summary-capacity-range-v1",
    code: "mobile_sessions_payroll_summary_export_range_capacity_exceeded",
  },
  "sessions-payroll-summary:narrow-scope": {
    token: "mobile-sessions-payroll-summary-capacity-scope-v1",
    code: "mobile_sessions_payroll_summary_export_scope_capacity_exceeded",
  },
  "sessions-detail:population": {
    token: "mobile-sessions-detail-capacity-population-v1",
    code: "mobile_sessions_detail_export_population_capacity_exceeded",
  },
  "sessions-detail:shorter-range": {
    token: "mobile-sessions-detail-capacity-range-v1",
    code: "mobile_sessions_detail_export_range_capacity_exceeded",
  },
  "sessions-detail:narrow-scope": {
    token: "mobile-sessions-detail-capacity-scope-v1",
    code: "mobile_sessions_detail_export_scope_capacity_exceeded",
  },
} as const satisfies Record<
  `${SessionExportKind}:${CapacityRecovery}`,
  { readonly token: string; readonly code: string }
>;

export function sessionExportConfig(kind: SessionExportKind) {
  const base = config[kind];
  const population = PUBLIC_CAPACITY_CONTRACT[`${kind}:population`];
  const shorterRange = PUBLIC_CAPACITY_CONTRACT[`${kind}:shorter-range`];
  const narrowScope = PUBLIC_CAPACITY_CONTRACT[`${kind}:narrow-scope`];
  return {
    ...base,
    capacity: {
      population: {
        ...population,
        message: RECOVERY_MESSAGE.population,
      },
      "shorter-range": {
        ...shorterRange,
        message: RECOVERY_MESSAGE["shorter-range"],
      },
      "narrow-scope": {
        ...narrowScope,
        message: RECOVERY_MESSAGE["narrow-scope"],
      },
    },
  } as const;
}

export async function readBoundedSessionExportBytes(
  response: Response,
  maxBytes: number
): Promise<Uint8Array> {
  const rawLength = response.headers.get("content-length");
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength) || Number(rawLength) > maxBytes) {
      await response.body?.cancel();
      throw new Error("session export byte limit exceeded");
    }
  }
  if (!response.body) throw new Error("session export body missing");
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel();
        throw new Error("session export byte limit exceeded");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  if (total === 0) throw new Error("session export body missing");
  const result = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return result;
}

export function expectedSessionExportFilename(input: {
  kind: SessionExportKind;
  startDate: string;
  endDate: string;
  dataAsOf: string;
}): string | null {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{6}Z$/.test(input.dataAsOf)) {
    return null;
  }
  const parsed = new Date(input.dataAsOf);
  if (!Number.isFinite(parsed.getTime())) return null;
  const stamp = parsed.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  return (
    `zazi-mobile-sessions-${sessionExportConfig(input.kind).filenameSlug}-` +
    `${input.startDate}-to-${input.endDate}-as-of-${stamp}.csv`
  );
}

export function parseCsvRecords(csv: string): string[][] {
  if (!csv.startsWith("\ufeff") || !csv.endsWith("\r\n")) {
    throw new Error("invalid session export CSV envelope");
  }
  const records: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 1; index < csv.length; index += 1) {
    const character = csv[index];
    if (quoted) {
      if (character === '"' && csv[index + 1] === '"') {
        field += '"';
        index += 1;
      } else if (character === '"') {
        quoted = false;
      } else {
        field += character;
      }
    } else if (character === '"') {
      if (field !== "") throw new Error("invalid session export CSV quote");
      quoted = true;
    } else if (character === ",") {
      row.push(field);
      field = "";
    } else if (character === "\r" && csv[index + 1] === "\n") {
      row.push(field);
      records.push(row);
      row = [];
      field = "";
      index += 1;
    } else if (character === "\r" || character === "\n") {
      throw new Error("invalid session export CSV line ending");
    } else {
      field += character;
    }
  }
  if (quoted || row.length > 0 || field !== "") {
    throw new Error("invalid session export CSV syntax");
  }
  return records;
}
