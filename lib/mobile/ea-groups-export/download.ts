const SAFE_FILENAME =
  /^zazi-mobile-ea-current-groups-[0-9]{4}-[0-9]{2}-[0-9]{2}\.csv$/;

type DownloadAnchor = {
  href: string;
  download: string;
  click(): void;
  remove(): void;
};

export type EaGroupsDownloadDependencies = {
  fetchExport(): Promise<Response>;
  createObjectUrl(blob: Blob): string;
  revokeObjectUrl(url: string): void;
  createAnchor(): DownloadAnchor;
  appendAnchor(anchor: DownloadAnchor): void;
};

export async function downloadEaGroupsCsv(
  dependencies: EaGroupsDownloadDependencies
): Promise<void> {
  const response = await dependencies.fetchExport();
  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: string;
    } | null;
    throw new Error(payload?.error ?? "The export could not be generated.");
  }

  const filename = response.headers.get("x-zazi-download-filename") ?? "";
  if (!SAFE_FILENAME.test(filename)) {
    throw new Error("The export returned an invalid filename.");
  }

  const blob = await response.blob();
  const url = dependencies.createObjectUrl(blob);
  try {
    const anchor = dependencies.createAnchor();
    anchor.href = url;
    anchor.download = filename;
    dependencies.appendAnchor(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    dependencies.revokeObjectUrl(url);
  }
}
