import { execFile } from "node:child_process";
import { homedir } from "node:os";
import { isAbsolute, resolve } from "node:path";
import { promisify } from "node:util";
import { stat } from "node:fs/promises";
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

function hrefToPath(href: string): string | null {
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
      return decodePath(url.pathname);
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

export async function resolveExistingPath(input: RevealInput, paseo: PaseoApi): Promise<string> {
  const rawPath = hrefToPath(input.href);
  if (!rawPath) {
    throw new Error("Il link non contiene un percorso locale valido.");
  }

  let filePath: string;
  if (rawPath === "~" || rawPath.startsWith("~/")) {
    filePath = resolve(homedir(), rawPath.slice(2));
  } else if (isAbsolute(rawPath)) {
    filePath = resolve(rawPath);
  } else {
    const workspaceRoot = await getWorkspaceRoot(input, paseo);
    if (!workspaceRoot) {
      throw new Error("Non riesco a determinare la cartella del workspace corrente.");
    }
    filePath = resolve(workspaceRoot, rawPath);
  }

  await stat(filePath);
  return filePath;
}

export async function revealInFinder(input: RevealInput, paseo: PaseoApi): Promise<RevealOutput> {
  if (process.platform !== "darwin") {
    return { ok: false, error: "Questa versione del plugin supporta Finder su macOS." };
  }

  try {
    const filePath = await resolveExistingPath(input, paseo);
    await execFileAsync("/usr/bin/open", ["-R", filePath], { shell: false });
    return { ok: true, path: filePath };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : "Impossibile mostrare il file nel Finder.",
    };
  }
}
