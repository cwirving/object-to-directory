import {
  newBinaryFileValueStorageHandler,
  newCustomValueStorageHandler,
  newDirectoryArrayOfObjectsStorageHandler,
  newDirectoryCreator,
  newDirectoryObjectStorageHandler,
  newFileWriter,
  newJsonValueStorageHandler,
  newTextFileValueStorageHandler,
} from "./factories.ts";
import type {
  ArrayToDirectoryHandlerOptions,
  CustomFileValueHandlerOptions,
  DirectoryCreator,
  FileValueHandlerOptions,
  FileWriter,
  FluentHandler,
  HandlerBuilder,
  JsonFileValueHandlerOptions,
  ObjectToDirectoryHandlerOptions,
} from "./interfaces.ts";

export class HandlerBuilderImpl implements HandlerBuilder {
  readonly #fileWriter: FileWriter;
  readonly #directoryCreator: DirectoryCreator;

  constructor(fileWriter?: FileWriter, directoryCreator?: DirectoryCreator) {
    this.#fileWriter = fileWriter ?? newFileWriter();
    this.#directoryCreator = directoryCreator ?? newDirectoryCreator();
  }

  textFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler {
    return newTextFileValueStorageHandler(
      this.#fileWriter,
      options?.extension,
      options?.name,
    );
  }

  binaryFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler {
    return newBinaryFileValueStorageHandler(
      this.#fileWriter,
      options?.extension,
      options?.name,
    );
  }

  jsonFile(options?: Readonly<JsonFileValueHandlerOptions>): FluentHandler {
    return newJsonValueStorageHandler(
      this.#fileWriter,
      options?.prettified,
      options?.name,
    );
  }

  customFile(options: Readonly<CustomFileValueHandlerOptions>): FluentHandler {
    return newCustomValueStorageHandler(
      this.#fileWriter,
      options.serializer,
      options.canStoreValue,
      options.extension,
      options.name,
    );
  }

  arrayToDirectory(
    options: Readonly<ArrayToDirectoryHandlerOptions>,
  ): FluentHandler {
    return newDirectoryArrayOfObjectsStorageHandler(
      options.keyProperty,
      options.handlers,
      this.#directoryCreator,
      options.name,
      options.defaultOptions,
    );
  }

  objectToDirectory(
    options: Readonly<ObjectToDirectoryHandlerOptions>,
  ): FluentHandler {
    return newDirectoryObjectStorageHandler(
      options.handlers,
      this.#directoryCreator,
      options.name,
      options.defaultOptions,
    );
  }
}
