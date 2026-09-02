import type { SessionExportKind } from "@/lib/mobile/session-exports/transport";

const SESSION_EXPORT_FILENAME =
  /^zazi-mobile-sessions-[a-z-]+-\d{4}-\d{2}-\d{2}-to-\d{4}-\d{2}-\d{2}-as-of-\d{8}T\d{6}Z\.csv$/;

type DownloadAnchor = {
  href: string;
  download: string;
  click: () => void;
  remove: () => void;
};

export type SessionExportDownloadDependencies = {
  fetch: typeof fetch;
  createObjectURL: (blob: Blob) => string;
  revokeObjectURL: (url: string) => void;
  createAnchor: () => DownloadAnchor;
};

const browserDependencies = (): SessionExportDownloadDependencies => ({
  fetch,
  createObjectURL: (blob) => URL.createObjectURL(blob),
  revokeObjectURL: (url) => URL.revokeObjectURL(url),
  createAnchor: () => {
    const anchor = document.createElement("a");
    document.body.appendChild(anchor);
    return anchor;
  },
});

export async function downloadSessionExport(
  {
    kind,
    startDate,
    endDate,
    schoolId,
    schoolType,
  }: {
    kind: SessionExportKind;
    startDate: string;
    endDate: string;
    schoolId: string | null;
    schoolType: "ecd" | "primary" | null;
  },
  dependencies = browserDependencies()
): Promise<string> {
  let objectUrl: string | null = null;
  try {
    const query = new URLSearchParams({
      start_date: startDate,
      end_date: endDate,
    });
    if (schoolId) query.set("school_id", schoolId);
    if (schoolType) query.set("school_type", schoolType);
    const response = await dependencies.fetch(
      `/mobile-app/exports/${kind}?${query.toString()}`,
      { cache: "no-store" }
    );
    if (!response.ok) {
      const payload = (await response.json().catch(() => null)) as
        | { error?: string }
        | null;
      throw new Error(payload?.error ?? "The export could not be generated.");
    }
    const filename = response.headers.get("x-zazi-download-filename");
    if (!filename || !SESSION_EXPORT_FILENAME.test(filename)) {
      throw new Error("The export service returned an invalid filename.");
    }
    objectUrl = dependencies.createObjectURL(await response.blob());
    const anchor = dependencies.createAnchor();
    anchor.href = objectUrl;
    anchor.download = filename;
    anchor.click();
    anchor.remove();
    return "Download ready. The file reflects the server snapshot named in the CSV.";
  } finally {
    if (objectUrl) dependencies.revokeObjectURL(objectUrl);
  }
}
