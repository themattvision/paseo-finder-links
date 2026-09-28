import type { PluginClientContext } from "@getpaseo/plugin/client";
import { installFinderFileLinks } from "./client/web";

export default function contribute(client: PluginClientContext) {
  return installFinderFileLinks(client);
}
