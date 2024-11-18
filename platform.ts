import { CurrentRuntime, Runtime } from "@cross/runtime";
import { makeDenoPlatform } from "./platform_deno.ts";
import { makeNodePlatform } from "./platform_node.ts";
import type { DirectoryCreator, FileWriter } from "./interfaces.ts";

const nodeLikeRuntimes = [Runtime.Bun, Runtime.Node];

export function runtimeIsNodeLike(runtime: Runtime): boolean {
  return nodeLikeRuntimes.includes(runtime);
}

export interface Platform {
  fileWriter: FileWriter;
  directoryCreator: DirectoryCreator;
}

function getCurrentPlatform(): Platform {
  if (CurrentRuntime === Runtime.Deno) {
    return makeDenoPlatform();
  } else if (runtimeIsNodeLike(CurrentRuntime)) {
    return makeNodePlatform();
  } else {
    throw new Error("Unsupported platform/runtime");
  }
}

export const platform: Platform = getCurrentPlatform();
