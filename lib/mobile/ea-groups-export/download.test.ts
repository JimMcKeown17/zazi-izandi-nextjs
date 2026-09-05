import assert from "node:assert/strict";
import test from "node:test";

import { downloadEaGroupsCsv } from "./download";

test("assigns the attested server filename, clicks, removes, and revokes", async () => {
  const events: string[] = [];
  const anchor = {
    href: "",
    download: "",
    click: () => events.push("click"),
    remove: () => events.push("remove"),
  };

  await downloadEaGroupsCsv({
    fetchExport: async () =>
      new Response("csv", {
        headers: {
          "X-Zazi-Download-Filename":
            "zazi-mobile-ea-current-groups-2026-09-01.csv",
        },
      }),
    createObjectUrl: () => "blob:safe-export",
    revokeObjectUrl: (url) => events.push(`revoke:${url}`),
    createAnchor: () => anchor,
    appendAnchor: () => events.push("append"),
  });

  assert.equal(anchor.href, "blob:safe-export");
  assert.equal(
    anchor.download,
    "zazi-mobile-ea-current-groups-2026-09-01.csv"
  );
  assert.deepEqual(events, [
    "append",
    "click",
    "remove",
    "revoke:blob:safe-export",
  ]);
});

test("rejects an invalid filename before creating an object URL", async () => {
  let objectUrls = 0;
  await assert.rejects(
    () =>
      downloadEaGroupsCsv({
        fetchExport: async () =>
          new Response("csv", {
            headers: { "X-Zazi-Download-Filename": "../../private.csv" },
          }),
        createObjectUrl: () => {
          objectUrls += 1;
          return "blob:unsafe";
        },
        revokeObjectUrl: () => undefined,
        createAnchor: () => ({
          href: "",
          download: "",
          click: () => undefined,
          remove: () => undefined,
        }),
        appendAnchor: () => undefined,
      }),
    /invalid filename/i
  );
  assert.equal(objectUrls, 0);
});

test("revokes the object URL even when the click fails", async () => {
  let revoked = "";
  await assert.rejects(() =>
    downloadEaGroupsCsv({
      fetchExport: async () =>
        new Response("csv", {
          headers: {
            "X-Zazi-Download-Filename":
              "zazi-mobile-ea-current-groups-2026-09-01.csv",
          },
        }),
      createObjectUrl: () => "blob:must-revoke",
      revokeObjectUrl: (url) => {
        revoked = url;
      },
      createAnchor: () => ({
        href: "",
        download: "",
        click: () => {
          throw new Error("click failed");
        },
        remove: () => undefined,
      }),
      appendAnchor: () => undefined,
    })
  );
  assert.equal(revoked, "blob:must-revoke");
});
