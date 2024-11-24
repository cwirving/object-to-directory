import type {
  DirectoryCreator,
  DirectoryObjectStorer,
  DirectoryObjectStorerOptions,
  FileValueStorer,
  FileValueStorerOptions,
  FileWriter,
} from "./interfaces.ts";
import { platform } from "./platform.ts";
import { DirectoryReference } from "./directory_reference.ts";
import { compileStorers, storeObjectToDirectoryEx } from './directory_storer.ts';
import { mergeOptions } from "./merge_utilities.ts";

/**
 * Create a new file writer appropriate for writing local files on the current platform.
 *
 * File writers don't interpret the contents of the file they read, they just write them as-is.
 *
 * @returns An object implementing the {@linkcode FileWriter} interface.
 */
export function newFileReader(): FileWriter {
  return platform.fileWriter;
}

/**
 * Create a new directory creator that can create local directories on the current platform.
 *
 * @returns An object implementing the {@linkcode DirectoryCreator} interface.
 */
export function newDirectoryContentsReader(): DirectoryCreator {
  return platform.directoryCreator;
}

/**
 * Create a new writer for plain text files, using the provided file text wtiter.
 *
 * @param textWriter The file text reader to perform the physical file writing.
 * @returns An object implementing the {@linkcode FileValueStorer} interface that performs plain text file writing. If
 */
export function newTextFileValueStorer(
  textWriter: FileWriter,
): FileValueStorer {
  return Object.freeze({
    name: "Text file value storer",
    storeValueToFile: (
      fileUrl: URL,
      value: unknown,
      options?: Readonly<FileValueStorerOptions>,
    ) => {
      options?.signal?.throwIfAborted();

      return textWriter.writeTextToFile(fileUrl, String(value), options);
    },
  });
}

/**
 * Create a new storer for (opaque) binary files, using the provided file writer.
 *
 * The storer will write Uint8Array, ArrayBuffer and ArrayBufferView instances directly.
 * Every other value type will be converted to a string and written out in UTF-8 encoding.
 *
 * @param binaryWriter The binary file wtiter used to perform the physical file writing.
 * @returns An object implementing the {@linkcode FileValueStorer} interface.
 */
export function newBinaryFileValueLoader(
  binaryWriter: FileWriter,
): FileValueStorer {
  return Object.freeze({
    name: "Binary file value storer",
    storeValueToFile: (
      fileUrl: URL,
      value: unknown,
      options?: FileValueStorerOptions,
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

      return binaryWriter.writeBinaryToFile(fileUrl, buffer, options);
    },
  });
}

/**
 * The signature expected of string serializer functions passed to {@linkcode newStringSerializerFileValueStorer} function.
 */
export type StringifyFunc = (input: unknown) => string;

/**
 * Create a new text file loader using an externally-provided parser function.
 *
 * @param textWriter The underlying text file reader used to perform the physical file reading.
 * @param serializer The string parser function applied to the string loaded by the text file reader.
 * @param name The name to give the resulting file value loader.
 * @returns An object implementing the {@linkcode FileValueStorer} interface.
 */
export function newStringSerializerFileValueStorer(
  textWriter: FileWriter,
  serializer: StringifyFunc,
  name: string,
): FileValueStorer {
  return Object.freeze({
    name: name,
    storeValueToFile: (
      fileUrl: URL,
      value: unknown,
      options?: FileValueStorerOptions,
    ) => {
      options?.signal?.throwIfAborted();

      const text = serializer(value);
      return textWriter.writeTextToFile(fileUrl, text, options);
    },
  });
}

/**
 * Create a new JSON file value storer with the provided text file writer.
 *
 * @param textWriter The underlying text file reader used to perform physical file reading.
 * @returns An object implementing the {@linkcode FileValueStorer} interface which reads and parses JSON files.
 */
export function newJsonFileValueStorer(
  textWriter: FileWriter,
): FileValueStorer {
  return newStringSerializerFileValueStorer(
    textWriter,
    JSON.stringify,
    "JSON file value storer",
  );
}

export function newDirectoryObjectStorer(
  storers: Iterable<Readonly<[string, FileValueStorer]>>,
  name?: string,
  defaultOptions?: Readonly<DirectoryObjectStorerOptions>,
): DirectoryObjectStorer {
  const handlers = compileStorers(storers);

  return Object.freeze({
    name: name ?? "Generic object to directory storer",
    _storers: storers, // Not used. Just present to make code easier to debug.
    _defaultOptions: defaultOptions, // Not used. Just present to make code easier to debug.
    storeObjectToDirectory(
      directoryPath: URL,
      contents: Record<string, unknown>,
      options?: Readonly<DirectoryObjectStorerOptions>,
    ): Promise<void> {
      const mergedOptions = mergeOptions(defaultOptions, options);

      return storeObjectToDirectoryEx({
        destinationUrl: directoryPath,
        currentPathInSource: "",
        contents: contents,
        handlers: handlers,
        options: mergedOptions,
      });
    },
  });
}
