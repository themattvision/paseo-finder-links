import { execFile } from "node:child_process";
import { stat } from "node:fs/promises";
import { homedir } from "node:os";
import { posix, win32 } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import type { RpcInput, RpcOutput } from "@getpaseo/plugin";
import type { PluginHandlerContext } from "@getpaseo/plugin/server";
import { hasSourcePosition, revealInFinderRpc } from "../shared/reveal.ts";

const execFileAsync = promisify(execFile);

type RevealInput = RpcInput<typeof revealInFinderRpc>;
type RevealOutput = RpcOutput<typeof revealInFinderRpc>;
type PaseoApi = PluginHandlerContext["paseo"];

function decodePath(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function hrefToPath(href: string, platform: NodeJS.Platform = process.platform): string | null {
  const trimmed = href.trim();
  if (!trimmed || hasSourcePosition(trimmed)) {
    return null;
  }

  if (/^file:/i.test(trimmed)) {
    try {
      const url = new URL(trimmed);
      if (url.protocol !== "file:") {
        return null;
      }
      return fileURLToPath(url, { windows: platform === "win32" });
    } catch {
      return null;
    }
  }

  const pathOnly = trimmed.split(/[?#]/, 1)[0] ?? "";
  return decodePath(pathOnly);
}

async function getWorkspaceRoot(input: RevealInput, paseo: PaseoApi): Promise<string | null> {
  if (input.agentId) {
    return (await paseo.agents.ref(input.agentId).refresh())?.agent.cwd ?? null;
  }
  if (input.workspaceId) {
    return (await paseo.workspaces.ref(input.workspaceId).refresh())?.workspaceDirectory ?? null;
  }
  return null;
}

export async function resolveExistingPath(
  input: RevealInput,
  paseo: PaseoApi,
  platform: NodeJS.Platform = process.platform,
): Promise<string> {
  const rawPath = hrefToPath(input.href, platform);
  if (!rawPath) {
    throw new Error("Il link non contiene un percorso locale valido.");
  }

  const path = platform === "win32" ? win32 : posix;
  let filePath: string;
  if (rawPath === "~" || rawPath.startsWith("~/")) {
    filePath = path.resolve(homedir(), rawPath.slice(2));
  } else if (path.isAbsolute(rawPath)) {
    filePath = path.resolve(rawPath);
  } else {
    const workspaceRoot = await getWorkspaceRoot(input, paseo);
    if (!workspaceRoot) {
      throw new Error("Non riesco a determinare la cartella del workspace corrente.");
    }
    filePath = path.resolve(workspaceRoot, rawPath);
  }

  await stat(filePath);
  return filePath;
}

export interface RevealCommand {
  executable: string;
  args: string[];
}

export function buildRevealCommand(
  filePath: string,
  isDirectory: boolean,
  platform: NodeJS.Platform = process.platform,
): RevealCommand {
  if (platform === "darwin") {
    return { executable: "/usr/bin/open", args: ["-R", filePath] };
  }
  if (platform === "win32") {
    return {
      executable: "explorer.exe",
      args: isDirectory ? [filePath] : [`/select,${filePath}`],
    };
  }
  throw new Error("This plugin supports macOS Finder and Windows File Explorer.");
}

export async function revealInFinder(input: RevealInput, paseo: PaseoApi): Promise<RevealOutput> {
  try {
    const filePath = await resolveExistingPath(input, paseo);
    const fileStats = await stat(filePath);
    const command = buildRevealCommand(filePath, fileStats.isDirectory());
    await execFileAsync(command.executable, command.args, { shell: false });
    return { ok: true, path: filePath };
  } catch (error) {
    return {
      ok: false,
      error:
        error instanceof Error
          ? error.message
          : "Unable to reveal the path in the system file manager.",
    };
  }
}
