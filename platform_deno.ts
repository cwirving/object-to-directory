import type {
  DirectoryCreatorOptions,
  WriteBinaryToFileOptions,
  WriteTextToFileOptions,
} from "./interfaces.ts";
import type { Platform } from "./platform.ts";

function denoWriteTextToFile(
  path: URL,
  contents: string,
  options?: Readonly<WriteTextToFileOptions>,
): Promise<void> {
  return Deno.writeTextFile(path, contents, options);
}

function denoWriteBinaryToFile(
  path: URL,
  contents: Readonly<Uint8Array>,
  options?: Readonly<WriteBinaryToFileOptions>,
): Promise<void> {
  return Deno.writeFile(path, contents, options);
}

function denoCreateDirectory(
  directoryUrl: URL,
  options?: DirectoryCreatorOptions,
): Promise<void> {
  return Deno.mkdir(directoryUrl, options);
}

export function makeDenoPlatform(): Platform {
  return Object.freeze({
    fileWriter: {
      name: "Deno file writer",
      writeTextToFile: denoWriteTextToFile,
      writeBinaryToFile: denoWriteBinaryToFile,
    },
    directoryCreator: {
      name: "Deno directory creator",
      createDirectory: denoCreateDirectory,
    },
  });
}
