import assert from "node:assert/strict";
import test from "node:test";
import React from "react";
import { renderToStaticMarkup } from "react-dom/server";

import PMLayout from "@/app/pm/layout";
import PMLoading from "@/app/pm/loading";

test("the PM route renders an accessible, visible loading state", () => {
  const html = renderToStaticMarkup(React.createElement(PMLoading));

  assert.match(html, /data-testid="pm-loading-page"/);
  assert.match(html, /role="status"/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-busy="true"/);
  assert.match(html, /Loading programme data/);
  assert.match(html, /animate-spin/);
});

test("the shared PM layout returns its main content synchronously", () => {
  const marker = React.createElement("div", { "data-testid": "page-content" });
  const layout = PMLayout({ children: marker });

  assert.ok(React.isValidElement(layout));
  const layoutChildren = React.Children.toArray(
    (layout.props as { children: React.ReactNode }).children
  );
  const main = layoutChildren.find(
    (child) => React.isValidElement(child) && child.type === "main"
  );

  assert.ok(React.isValidElement(main));
  const mainChildren = React.Children.toArray(
    (main.props as { children: React.ReactNode }).children
  );
  const renderedMarker = mainChildren.find(React.isValidElement);

  assert.ok(React.isValidElement(renderedMarker));
  assert.equal(
    (renderedMarker.props as { "data-testid"?: string })["data-testid"],
    "page-content"
  );
});
