import assert from "node:assert/strict";
import test from "node:test";

import {
  downloadSessionExport,
  type SessionExportDownloadDependencies,
} from "@/lib/mobile/session-exports/download";
import { DETAIL_EXPORT_KIND } from "@/lib/mobile/session-exports/transport";

test("preserves the Window receiver when using the default browser fetch", async () => {
  const filename =
    "zazi-mobile-sessions-detail-2026-02-20-to-2026-03-19-as-of-20260902T004010Z.csv";
  const calls: string[] = [];
  const anchor = {
    href: "",
    download: "",
    click: () => calls.push("click"),
    remove: () => calls.push("remove"),
  };
  const windowStub = {
    fetch: (async function (this: object, input, init) {
      if (this !== windowStub) {
        throw new TypeError(
          "Failed to execute 'fetch' on 'Window': Illegal invocation"
        );
      }
      calls.push("fetch");
      assert.equal(
        input,
        "/mobile-app/exports/sessions-detail?start_date=2026-02-20&end_date=2026-03-19"
      );
      assert.deepEqual(init, { cache: "no-store" });
      return new Response(new Blob(["csv"]), {
        headers: { "X-Zazi-Download-Filename": filename },
      });
    }) as typeof fetch,
  };
  const originalWindow = Object.getOwnPropertyDescriptor(globalThis, "window");
  const originalFetch = Object.getOwnPropertyDescriptor(globalThis, "fetch");
  const originalDocument = Object.getOwnPropertyDescriptor(globalThis, "document");
  const originalCreateObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    "createObjectURL"
  );
  const originalRevokeObjectURL = Object.getOwnPropertyDescriptor(
    URL,
    "revokeObjectURL"
  );

  Object.defineProperty(globalThis, "window", {
    configurable: true,
    value: windowStub,
  });
  Object.defineProperty(globalThis, "fetch", {
    configurable: true,
    value: windowStub.fetch,
  });
  Object.defineProperty(globalThis, "document", {
    configurable: true,
    value: {
      createElement: (tagName: string) => {
        assert.equal(tagName, "a");
        calls.push("create-anchor");
        return anchor;
      },
      body: {
        appendChild: (candidate: unknown) => {
          assert.equal(candidate, anchor);
          calls.push("append-anchor");
        },
      },
    },
  });
  Object.defineProperty(URL, "createObjectURL", {
    configurable: true,
    value: (blob: Blob) => {
      assert.ok(blob instanceof Blob);
      calls.push("create-url");
      return "blob:session-export-default";
    },
  });
  Object.defineProperty(URL, "revokeObjectURL", {
    configurable: true,
    value: (url: string) => calls.push(`revoke:${url}`),
  });

  try {
    await downloadSessionExport({
      kind: DETAIL_EXPORT_KIND,
      startDate: "2026-02-20",
      endDate: "2026-03-19",
      schoolId: null,
      schoolType: null,
    });

    assert.equal(anchor.href, "blob:session-export-default");
    assert.equal(anchor.download, filename);
    assert.deepEqual(calls, [
      "fetch",
      "create-url",
      "create-anchor",
      "append-anchor",
      "click",
      "remove",
      "revoke:blob:session-export-default",
    ]);
  } finally {
    for (const [target, key, descriptor] of [
      [globalThis, "window", originalWindow],
      [globalThis, "fetch", originalFetch],
      [globalThis, "document", originalDocument],
      [URL, "createObjectURL", originalCreateObjectURL],
      [URL, "revokeObjectURL", originalRevokeObjectURL],
    ] as const) {
      if (descriptor) {
        Object.defineProperty(target, key, descriptor);
      } else {
        Reflect.deleteProperty(target, key);
      }
    }
  }
});

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
