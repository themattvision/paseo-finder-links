import assert from "node:assert/strict";
import test from "node:test";
import { getRouteContext, hasSourcePosition, isFinderEligibleHref } from "./reveal.ts";

test("extracts the active agent or workspace from Paseo routes", () => {
  assert.deepEqual(getRouteContext("/h/local/agent/agent%201"), { agentId: "agent 1" });
  assert.deepEqual(getRouteContext("/h/local/workspace/workspace-1/tab/file"), {
    workspaceId: "workspace-1",
  });
  assert.deepEqual(getRouteContext("/settings"), {});
});

test("keeps source-position links inside Paseo", () => {
  for (const href of ["src/app.ts:42", "src/app.ts:42:8", "src/app.ts#L42", "src/app.ts(42)"]) {
    assert.equal(hasSourcePosition(href), true, href);
    assert.equal(isFinderEligibleHref(href), false, href);
  }
});

test("routes plain local files to Finder and leaves web links alone", () => {
  for (const href of [
    "/Users/matteo/Downloads/archive.zip",
    "file:///Users/matteo/Downloads/archive.zip",
    "docs/README.md",
    "~/Downloads/archive.zip",
  ]) {
    assert.equal(isFinderEligibleHref(href), true, href);
  }
  for (const href of ["https://example.com/file.zip", "mailto:test@example.com", ""]) {
    assert.equal(isFinderEligibleHref(href), false, href);
  }
});
