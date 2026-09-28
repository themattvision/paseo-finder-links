import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { buildRevealCommand, hrefToPath, resolveExistingPath } from "./reveal.ts";

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

  assert.equal(resolved, resolve(pluginRoot, "README.md"));
});

test("converts Windows file URLs and UNC shares to native paths", () => {
  assert.equal(
    hrefToPath("file:///C:/Users/Matteo/My%20File.zip", "win32"),
    String.raw`C:\Users\Matteo\My File.zip`,
  );
  assert.equal(
    hrefToPath("file://server/share/My%20File.zip", "win32"),
    String.raw`\\server\share\My File.zip`,
  );
});

test("builds safe native commands without a shell", () => {
  assert.deepEqual(buildRevealCommand("/tmp/My File.zip", false, "darwin"), {
    executable: "/usr/bin/open",
    args: ["-R", "/tmp/My File.zip"],
  });
  assert.deepEqual(
    buildRevealCommand(String.raw`C:\Users\Matteo\My File.zip`, false, "win32"),
    {
      executable: "explorer.exe",
      args: [String.raw`/select,C:\Users\Matteo\My File.zip`],
    },
  );
  assert.deepEqual(buildRevealCommand(String.raw`C:\Users\Matteo\Downloads`, true, "win32"), {
    executable: "explorer.exe",
    args: [String.raw`C:\Users\Matteo\Downloads`],
  });
  assert.throws(
    () => buildRevealCommand("/tmp/My File.zip", false, "linux"),
    /macOS Finder and Windows File Explorer/,
  );
});
