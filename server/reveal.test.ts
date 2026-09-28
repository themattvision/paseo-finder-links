import assert from "node:assert/strict";
import { dirname } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { resolveExistingPath } from "./reveal.ts";

const pluginRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("resolves a relative file inside the active workspace", async () => {
  const paseo = {
    workspaces: {
      ref: () => ({
        refresh: async () => ({ workspaceDirectory: pluginRoot }),
      }),
    },
  } as unknown as PluginHandlerContext["paseo"];

  const resolved = await resolveExistingPath(
    { href: "README.md", workspaceId: "test-workspace" },
    paseo,
  );

  assert.equal(resolved, `${pluginRoot}/README.md`);
});
