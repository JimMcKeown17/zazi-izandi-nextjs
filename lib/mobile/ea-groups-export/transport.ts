export const EA_GROUPS_EXPORT_MAX_BYTES = 10_000_000;
export const EA_GROUPS_EXPORT_SCHEMA = "ea-current-groups-v1";
export const EA_GROUPS_EXPORT_CAPACITY_ERROR =
  "ea-current-groups-capacity-v1";

export async function readBoundedResponseBytes(
  response: Response,
  maxBytes = EA_GROUPS_EXPORT_MAX_BYTES
): Promise<Uint8Array> {
  const rawLength = response.headers.get("content-length");
  if (rawLength !== null) {
    if (!/^\d+$/.test(rawLength) || Number(rawLength) > maxBytes) {
      await response.body?.cancel();
      throw new Error("The export exceeds the safe byte limit.");
    }
  }

  if (!response.body) throw new Error("The export body is missing.");
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
        throw new Error("The export exceeds the safe byte limit.");
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  if (total === 0) throw new Error("The export body is missing.");

  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return bytes;
}

export function eaGroupsDownloadFilename(now = new Date()): string {
  return `zazi-mobile-ea-current-groups-${now.toISOString().slice(0, 10)}.csv`;
}
