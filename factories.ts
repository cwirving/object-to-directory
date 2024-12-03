import type {
  DirectoryCreator,
  FileWriter,
  FluentHandler,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { platform } from "./platform.ts";
import { DirectoryValueStorageHandler } from "./directory_storer.ts";
import { FluentValueStorageHandler } from "./fluent_handlers.ts";

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
): FluentHandler {
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
): FluentHandler {
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
): FluentHandler {
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
): FluentHandler {
  return newStringSerializerValueStorageHandler(
    textWriter,
    (v) => {
      return JSON.stringify(v, null, 2);
    },
    ".json",
    "JSON file value storage handler",
  );
}

/**
 * Create a new directory object storage handler -- this handler write object contents to directories in the file
 * system, delegating to other handlers for the actual storage of the object's properties.
 *
 * Directory value storage handlers only respond to `canStoreValue` when the value is an object.
 *
 * The handlers are evaluated in order when processing each property in the object to store. If a handler's
 * `canStoreValue` method returns `true` for a property, it will be used to store the value. If not handler can store
 * an object-valued property, the directory object storage handler will recursively store that value, too. Remaining
 * non-object values cause an error to be raised or are either ignored, depending on the value of the
 * {@linkcode ValueStorageHandlerOptions.strict} option.
 *
 * @param handlers Handlers to use at runtime. This iterable is cloned immediately, so no further mutations will be observed.
 * @param directoryCreator The directory creator to use. If none is specified, uses {@linkcode newDirectoryCreator} to create one.
 * @param name The optional name of the handler.
 * @param defaultOptions Options that will be merged with those provided at runtime in {@linkcode ValueStorageHandler.storeValue} calls.
 */
export function newDirectoryObjectStorageHandler(
  handlers: Iterable<ValueStorageHandler>,
  directoryCreator?: DirectoryCreator,
  name?: string,
  defaultOptions?: Readonly<ValueStorageHandlerOptions>,
): FluentHandler {
  const handlersCopy = Array.from(handlers);

  if (!directoryCreator) {
    directoryCreator = newDirectoryCreator();
  }

  return FluentValueStorageHandler.newHandler(
    new DirectoryValueStorageHandler(
      name ?? "Directory value storage handler",
      handlersCopy,
      directoryCreator,
      defaultOptions,
    ),
  );
}
