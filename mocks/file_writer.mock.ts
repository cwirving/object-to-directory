import type { FileWriter, WriteTextToFileOptions } from "../interfaces.ts";

export interface WriteBinaryToFileCall {
  path: URL;
  contents: Readonly<Uint8Array>;
  options?: Readonly<WriteTextToFileOptions>;
}

export interface WriteTextToFileCall {
  path: URL;
  contents: string;
  options?: Readonly<WriteTextToFileOptions>;
}

export class MockFileWriter implements FileWriter {
  name: string;

  calls: {
    writeBinaryToFile: WriteBinaryToFileCall[];
    writeTextToFile: WriteTextToFileCall[];
  } = { writeBinaryToFile: [], writeTextToFile: [] };

  constructor(name: string) {
    this.name = name;
  }

  writeBinaryToFile(
    path: URL,
    contents: Readonly<Uint8Array>,
    options?: Readonly<WriteTextToFileOptions>,
  ): Promise<void> {
    this.calls.writeBinaryToFile.push({ path, contents, options });
    return Promise.resolve();
  }

  writeTextToFile(
    path: URL,
    contents: string,
    options?: Readonly<WriteTextToFileOptions>,
  ): Promise<void> {
    this.calls.writeTextToFile.push({ path, contents, options });
    return Promise.resolve();
  }
}
