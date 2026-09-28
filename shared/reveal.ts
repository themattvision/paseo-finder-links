import { defineRpc } from "@getpaseo/plugin";
import { z } from "zod";

const LINE_FRAGMENT = /^#L[0-9]+(?:C[0-9]+)?(?:-L?[0-9]+(?:C[0-9]+)?)?$/i;
const COLON_LINE_SUFFIX = /:[0-9]+(?::[0-9]+)?(?:-[0-9]+(?::[0-9]+)?)?$/;
const PAREN_LINE_SUFFIX = /\([0-9]+(?:,[0-9]+)?(?:-[0-9]+(?:,[0-9]+)?)?\)$/;
const WORD_LINE_SUFFIX = /\s+lines?\s+[0-9]+(?:-[0-9]+)?$/i;

export const revealInFinderRpc = defineRpc({
  name: "finder-links.reveal",
  input: z.object({
    href: z.string().min(1).max(16_384),
    agentId: z.string().min(1).max(512).optional(),
    workspaceId: z.string().min(1).max(512).optional(),
  }),
  output: z.discriminatedUnion("ok", [
    z.object({ ok: z.literal(true), path: z.string() }),
    z.object({ ok: z.literal(false), error: z.string() }),
  ]),
});

export interface RouteContext {
  agentId?: string;
  workspaceId?: string;
}

function decodeSegment(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function getRouteContext(pathname: string): RouteContext {
  const pathOnly = pathname.split(/[?#]/, 1)[0] ?? "";
  const agentMatch = pathOnly.match(/^\/h\/[^/]+\/agent\/([^/]+)(?:\/|$)/);
  if (agentMatch?.[1]) {
    return { agentId: decodeSegment(agentMatch[1]) };
  }

  const workspaceMatch = pathOnly.match(/^\/h\/[^/]+\/workspace\/([^/]+)(?:\/|$)/);
  if (workspaceMatch?.[1]) {
    return { workspaceId: decodeSegment(workspaceMatch[1]) };
  }

  return {};
}

export function hasSourcePosition(href: string): boolean {
  const trimmed = href.trim();
  const hashIndex = trimmed.lastIndexOf("#");
  if (hashIndex >= 0 && LINE_FRAGMENT.test(trimmed.slice(hashIndex))) {
    return true;
  }
  const withoutHash = hashIndex >= 0 ? trimmed.slice(0, hashIndex) : trimmed;
  return (
    COLON_LINE_SUFFIX.test(withoutHash) ||
    PAREN_LINE_SUFFIX.test(withoutHash) ||
    WORD_LINE_SUFFIX.test(withoutHash)
  );
}

export function isFinderEligibleHref(href: string): boolean {
  const trimmed = href.trim();
  if (!trimmed || hasSourcePosition(trimmed)) {
    return false;
  }
  if (/^(?:https?|mailto|tel|data|javascript):/i.test(trimmed)) {
    return false;
  }
  return true;
}
