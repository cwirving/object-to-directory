import type { DirectoryCreator, DirectoryCreatorOptions } from "../interfaces.ts";

export interface MockDirectoryCreatorCall {
  directoryUrl: URL;
  options?: Readonly<DirectoryCreatorOptions>;
}

export class MockDirectoryCreator implements DirectoryCreator {
  name: string;

  calls: MockDirectoryCreatorCall[] = [];

  constructor(name: string) {
    this.name = name;
  }

  createDirectory(directoryUrl: URL, options?: Readonly<DirectoryCreatorOptions>): Promise<void> {
    this.calls.push({directoryUrl, options});
    return Promise.resolve();
  }
}
