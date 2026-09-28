import type { PluginServerContext } from "@getpaseo/plugin/server";
import { revealInFinder } from "./server/reveal";
import { revealInFinderRpc } from "./shared/reveal";

export default function contribute(server: PluginServerContext) {
  server.handle(revealInFinderRpc, (input, context) => revealInFinder(input, context.paseo));
  return () => {};
}
