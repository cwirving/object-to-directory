import type {
  DirectoryCreator,
  FileWriter,
  FluentHandler,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
  ValueStorageHandlerWithHandlers,
} from "./interfaces.ts";
import { platform } from "./platform.ts";
import { DirectoryValueStorageHandler } from "./directory_storer.ts";
import {
  FluentValueStorageHandler,
  FluentValueStorageHandlerWithHandlers,
} from "./fluent_handlers.ts";

/**
 * Create a new file writer appropriate for writing local files on the current platform.
 *
 * File writers don't interpret the contents of the file they read, they just write them as-is.
 *
 * @returns An object implementing the {@linkcode FileWriter} interface.
 */
export function newFileWriter(): FileWriter {
  return platform.fileWriter;
}

/**
 * Create a new directory creator that can create local directories on the current platform.
 *
 * @returns An object implementing the {@linkcode DirectoryCreator} interface.
 */
export function newDirectoryCreator(): DirectoryCreator {
  return platform.directoryCreator;
}

/**
 * Create a new value storage handler for plain text files, using the provided file writer.
 *
 * @param textWriter The file text reader to perform the physical file writing.
 * @param extension The file name extension (including the dot) to add to the path of the URL when writing files. Defaults to ".txt".
 * @returns An object implementing the {@linkcode ValueStorageHandler} interface that performs plain text file writing. If
 */
export function newTextFileValueStorageHandler(
  textWriter: FileWriter,
  extension: string = ".txt",
): ValueStorageHandler & FluentHandler<ValueStorageHandler> {
  return FluentValueStorageHandler.newHandler({
    name: "Text file value storage handler",
    canStoreValue(
      _pathInSource: string,
      _destinationUrl: URL,
      value: unknown,
    ): boolean {
      return typeof value === "string";
    },
    storeValue: (
      _pathInSource: string,
      destinationUrl: URL,
      value: unknown,
      options?: Readonly<ValueStorageHandlerOptions>,
    ) => {
      options?.signal?.throwIfAborted();

      const urlWithExtension = new URL(destinationUrl);
      urlWithExtension.pathname += extension;

      return textWriter.writeTextToFile(
        urlWithExtension,
        value as string,
        options,
      );
    },
  });
}

/**
 * Create a new value storage handler for (opaque) binary files, using the provided file writer.
 *
 * The handler will write Uint8Array, ArrayBuffer and ArrayBufferView instances directly.
 * Every other value type will be converted to a string and written out in UTF-8 encoding.
 *
 * @param binaryWriter The binary file wtiter used to perform the physical file writing.
 * @param extension The file name extension (including the dot) to add to the path of the URL when writing files. Defaults to ".bin".
 * @returns An object implementing the {@linkcode ValueStorageHandler} interface.
 */
export function newBinaryFileValueLoader(
  binaryWriter: FileWriter,
  extension: string = ".bin",
): ValueStorageHandler & FluentHandler<ValueStorageHandler> {
  return FluentValueStorageHandler.newHandler({
    name: "Binary file value storage handler",
    canStoreValue(
      _pathInSource: string,
      _destinationUrl: URL,
      _value: unknown,
    ): boolean {
      return true;
    },
    storeValue: (
      _pathInSource: string,
      destinationUrl: URL,
      value: unknown,
      options?: ValueStorageHandlerOptions,
    ) => {
      options?.signal?.throwIfAborted();

      let buffer: Uint8Array;
      if (value instanceof Uint8Array) {
        buffer = value;
      } else if (value instanceof ArrayBuffer) {
        buffer = new Uint8Array(value);
      } else if (ArrayBuffer.isView(value)) {
        buffer = new Uint8Array(
          value.buffer,
          value.byteOffset,
          value.byteLength,
        );
      } else {
        buffer = new TextEncoder().encode(String(value));
      }

      const urlWithExtension = new URL(destinationUrl);
      urlWithExtension.pathname += extension;

      return binaryWriter.writeBinaryToFile(urlWithExtension, buffer, options);
    },
  });
}

/**
 * The signature expected of string serializer functions passed to {@linkcode newStringSerializerValueStorageHandler} function.
 */
export type StringifyFunc = (input: unknown) => string;

/**
 * Create a new text file loader using an externally-provided parser function.
 *
 * @param textWriter The underlying text file reader used to perform the physical file reading.
 * @param serializer The string parser function applied to the string loaded by the text file reader.
 * @param extension The extension to add to file name when saving it.
 * @param name The name to give the resulting file value loader.
 * @returns An object implementing the {@linkcode ValueStorageHandler} interface.
 */
export function newStringSerializerValueStorageHandler(
  textWriter: FileWriter,
  serializer: StringifyFunc,
  extension: string,
  name: string,
): ValueStorageHandler & FluentHandler<ValueStorageHandler> {
  return FluentValueStorageHandler.newHandler({
    name: name,
    canStoreValue(
      _pathInSource: string,
      _destinationUrl: URL,
      _value: unknown,
    ): boolean {
      return true;
    },
    storeValue: (
      _pathInSource: string,
      destinationUrl: URL,
      value: unknown,
      options?: ValueStorageHandlerOptions,
    ) => {
      options?.signal?.throwIfAborted();

      const text = serializer(value);

      const urlWithExtension = new URL(destinationUrl);
      urlWithExtension.pathname += extension;

      return textWriter.writeTextToFile(urlWithExtension, text, options);
    },
  });
}

/**
 * Create a new JSON file value storage handler with the provided text file writer.
 *
 * @param textWriter The underlying text file reader used to perform physical file reading.
 * @returns An object implementing the {@linkcode ValueStorageHandler} interface which reads and parses JSON files.
 */
export function newJsonValueStorageHandler(
  textWriter: FileWriter,
): ValueStorageHandler {
  return newStringSerializerValueStorageHandler(
    textWriter,
    JSON.stringify,
    ".json",
    "JSON file value storage handler",
  );
}

export function newDirectoryObjectStorageHandler(
  handlers: Iterable<ValueStorageHandler>,
  directoryCreator?: DirectoryCreator,
  name?: string,
  defaultOptions?: Readonly<ValueStorageHandlerOptions>,
):
  & ValueStorageHandlerWithHandlers
  & FluentHandler<ValueStorageHandlerWithHandlers> {
  const handlersCopy = Array.from(handlers);

  if (!directoryCreator) {
    directoryCreator = newDirectoryCreator();
  }

  return FluentValueStorageHandlerWithHandlers.newHandler(
    new DirectoryValueStorageHandler(
      name ?? "Directory value storage handler",
      handlersCopy,
      directoryCreator,
      defaultOptions,
    ),
  );
}
