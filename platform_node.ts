import type {
  DirectoryCreatorOptions,
  WriteBinaryToFileOptions,
  WriteTextToFileOptions,
} from "./interfaces.ts";
import * as fsPromises from "node:fs/promises";
import type { Abortable } from "node:events";
import type { Platform } from "./platform.ts";

function nodeWriteTextToFile(
  path: URL,
  contents: string,
  options?: Readonly<WriteTextToFileOptions>,
): Promise<void> {
  return fsPromises.writeFile(path, contents, {
    encoding: "utf-8",
    signal: (options as Abortable | undefined)?.signal,
  })
}

function nodeWriteBinaryToFile(
  path: URL,
  contents: Readonly<Uint8Array>,
  options?: Readonly<WriteBinaryToFileOptions>,
): Promise<void> {
  return fsPromises.writeFile(path, contents, {
    encoding: null,
    signal: (options as Abortable | undefined)?.signal,
  })
}

function nodeCreateDirectory(
  directoryUrl: URL,
  _options?: DirectoryCreatorOptions,
): Promise<void> {
  return fsPromises.mkdir(directoryUrl)

}

export function makeNodePlatform(): Platform {
  return Object.freeze({
    fileWriter: {
      name: "fs.writeFile",
      writeTextToFile: nodeWriteTextToFile,
      writeBinaryToFile: nodeWriteBinaryToFile,
    },
    directoryCreator: {
      name: "fs.mkdir",
      createDirectory: nodeCreateDirectory,
    },
  });
}
