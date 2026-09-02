import assert from "node:assert/strict";
import test from "node:test";

import {
  downloadSessionExport,
  type SessionExportDownloadDependencies,
} from "@/lib/mobile/session-exports/download";
import { DETAIL_EXPORT_KIND } from "@/lib/mobile/session-exports/transport";

test("downloads the attested blob with school scope and always revokes its URL", async () => {
  const calls: string[] = [];
  const anchor = {
    href: "",
    download: "",
    click: () => calls.push("click"),
    remove: () => calls.push("remove"),
  };
  const filename = "zazi-mobile-sessions-detail-2026-02-20-to-2026-03-19-as-of-20260902T004010Z.csv";
  const dependencies: SessionExportDownloadDependencies = {
    fetch: (async (input, init) => {
      assert.equal(
        input,
        "/mobile-app/exports/sessions-detail?start_date=2026-02-20&end_date=2026-03-19&school_id=11111111-1111-4111-8111-111111111111&school_type=primary"
      );
      assert.deepEqual(init, { cache: "no-store" });
      return new Response(new Blob(["csv"]), {
        headers: { "X-Zazi-Download-Filename": filename },
      });
    }) as typeof fetch,
    createObjectURL: asyncBlob => {
      assert.ok(asyncBlob instanceof Blob);
      calls.push("create");
      return "blob:session-export";
    },
    revokeObjectURL: url => calls.push(`revoke:${url}`),
    createAnchor: () => anchor,
  };

  const message = await downloadSessionExport({
    kind: DETAIL_EXPORT_KIND,
    startDate: "2026-02-20",
    endDate: "2026-03-19",
    schoolId: "11111111-1111-4111-8111-111111111111",
    schoolType: "primary",
  }, dependencies);

  assert.equal(anchor.href, "blob:session-export");
  assert.equal(anchor.download, filename);
  assert.deepEqual(calls, ["create", "click", "remove", "revoke:blob:session-export"]);
  assert.match(message, /server snapshot/);
});

test("surfaces an attested staff error without allocating a blob URL", async () => {
  let created = false;
  const dependencies: SessionExportDownloadDependencies = {
    fetch: (async () => new Response(
      JSON.stringify({ error: "Choose a shorter range and try again." }),
      { status: 413, headers: { "Content-Type": "application/json" } }
    )) as typeof fetch,
    createObjectURL: () => {
      created = true;
      return "blob:unused";
    },
    revokeObjectURL: () => assert.fail("nothing should be revoked"),
    createAnchor: () => assert.fail("no anchor should be created"),
  };

  await assert.rejects(
    downloadSessionExport({
      kind: DETAIL_EXPORT_KIND,
      startDate: "2026-02-20",
      endDate: "2026-03-19",
      schoolId: null,
      schoolType: null,
    }, dependencies),
    /Choose a shorter range/
  );
  assert.equal(created, false);
});
