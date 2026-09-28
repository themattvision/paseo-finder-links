import type { PluginClientContext } from "@getpaseo/plugin/client";
import { Platform } from "react-native";
import {
  getRouteContext,
  isFinderEligibleHref,
  revealInFinderRpc,
} from "../shared/reveal";

interface ClickTarget {
  closest(selector: string): AnchorElement | null;
}

interface AnchorElement {
  getAttribute(name: string): string | null;
}

interface ClickEvent {
  readonly button: number;
  readonly target: unknown;
  readonly altKey: boolean;
  readonly ctrlKey: boolean;
  readonly metaKey: boolean;
  readonly shiftKey: boolean;
  preventDefault(): void;
  stopPropagation(): void;
  stopImmediatePropagation(): void;
}

interface WebDocument {
  addEventListener(type: "click", listener: (event: ClickEvent) => void, capture: boolean): void;
  removeEventListener(type: "click", listener: (event: ClickEvent) => void, capture: boolean): void;
}

declare const document: WebDocument;
declare const location: { readonly pathname: string };

function asClickTarget(value: unknown): ClickTarget | null {
  if (!value || typeof value !== "object" || !("closest" in value)) {
    return null;
  }
  return value as ClickTarget;
}

function isAssistantFileAnchor(anchor: AnchorElement): boolean {
  const style = anchor.getAttribute("style") ?? "";
  return /(?:^|;)\s*display:\s*contents\s*(?:;|$)/i.test(style);
}

export function installFinderFileLinks(client: PluginClientContext): () => void {
  if (Platform.OS !== "web") {
    return () => {};
  }

  const handleClick = (event: ClickEvent) => {
    if (
      event.button !== 0 ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.shiftKey
    ) {
      return;
    }

    const anchor = asClickTarget(event.target)?.closest("a[href]");
    const href = anchor?.getAttribute("href") ?? "";
    if (!anchor || !isAssistantFileAnchor(anchor) || !isFinderEligibleHref(href)) {
      return;
    }

    event.preventDefault();
    event.stopPropagation();
    event.stopImmediatePropagation();

    void client
      .rpc(revealInFinderRpc, {
        href,
        ...getRouteContext(location.pathname),
      })
      .then((result) => {
        if (!result.ok) {
          console.error("[paseo-finder-links] " + result.error);
        }
      })
      .catch((error: unknown) => {
        console.error("[paseo-finder-links] Failed to reveal file", error);
      });
  };

  document.addEventListener("click", handleClick, true);
  return () => document.removeEventListener("click", handleClick, true);
}
