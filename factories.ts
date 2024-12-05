/**
 * The functions in this module are the lower-level implementation details of the public API. They allow advanced
 * consumers to control precisely how the library interacts with the file system or provide their own file system-like
 * implementations.
 *
 * The {@linkcode newFileWriter} function is a platform-neutral way of creating the file writing abstraction used
 * throughout this library.
 *
 * The {@linkcode newDirectoryCreator} function is a platform-neutral way of creating the directory creation abstraction
 * used throughout this library.
 *
 * The {@linkcode DefaultHandlerBuilder} is the default implementation of the {@linkcode HandlerBuilder} interface.
 * It is initialized with {@linkcode FileWriter} and {@linkcode DirectoryCreator}
 * implementations. It is used to build all the handlers known to the library in a fluent way.
 *
 * @module
 */

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
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { platform } from "./platform.ts";
import { DirectoryValueStorageHandler } from "./directory_storer.ts";
import { makeFluent } from "./fluent_handlers.ts";
import { isObject } from "./merge_utilities.ts";

/**
 * The prettified `JSON.stringify` form we use by default.
 *
 * @param value The value to serialize.
 * @returns The JSON representation of the value.
 */
function jsonPrettifiedStringify(value: unknown): string {
  return JSON.stringify(value, null, 2);
}

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
 * An implementation of interface {@linkcode HandlerBuilder} that provides default versions of the known
 * value storage handlers.
 */
export class DefaultHandlerBuilder implements HandlerBuilder {
  readonly #directoryCreator: DirectoryCreator;
  readonly #fileWriter: FileWriter;

  constructor(fileWriter?: FileWriter, directoryCreator?: DirectoryCreator) {
    this.#directoryCreator = directoryCreator ?? newDirectoryCreator();
    this.#fileWriter = fileWriter ?? newFileWriter();
  }

  /**
   * Create a new value storage handler for plain text files, using the builder's file writer.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs plain text file writing.
   */
  textFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler {
    const extension = options?.extension ?? ".txt";
    const fileWriter = this.#fileWriter;
    const name = options?.name ?? "Text file value storage handler";

    return makeFluent({
      name: name,
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
        if (options?.signal?.aborted) {
          return Promise.reject(options?.signal?.reason);
        }

        const urlWithExtension = new URL(destinationUrl);
        urlWithExtension.pathname += extension;

        return fileWriter.writeTextToFile(
          urlWithExtension,
          value as string,
          options,
        );
      },
    });
  }

  /**
   * Create a new value storage handler for (opaque) binary files, using the builder's file writer.
   *
   * The handler can store `Uint8Array`, `ArrayBuffer` and `ArrayBufferView` instances.
   * No other types are handled.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs binary file writing.
   */
  binaryFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler {
    const extension = options?.extension ?? ".bin";
    const fileWriter = this.#fileWriter;
    const name = options?.name ?? "Binary file value storage handler";

    return makeFluent({
      name: name,
      canStoreValue(
        _pathInSource: string,
        _destinationUrl: URL,
        value: unknown,
      ): boolean {
        return (value instanceof Uint8Array) ||
          (value instanceof ArrayBuffer) ||
          ArrayBuffer.isView(value);
      },
      storeValue: (
        pathInSource: string,
        destinationUrl: URL,
        value: unknown,
        options?: ValueStorageHandlerOptions,
      ) => {
        if (options?.signal?.aborted) {
          return Promise.reject(options?.signal?.reason);
        }

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
          return Promise.reject(
            new TypeError(
              `Attempting to store non-binary value at path "${pathInSource}" to a binary file.`,
            ),
          );
        }

        const urlWithExtension = new URL(destinationUrl);
        urlWithExtension.pathname += extension;

        return fileWriter.writeBinaryToFile(urlWithExtension, buffer, options);
      },
    });
  }

  /**
   * Create a new value storage handler for JSON files, using the builder's file writer.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs JSON file writing.
   */
  jsonFile(options?: Readonly<JsonFileValueHandlerOptions>): FluentHandler {
    const customOptions =
      (options
        ? Object.fromEntries(Object.entries(options))
        : {}) as FileValueHandlerOptions as CustomFileValueHandlerOptions;
    customOptions.extension = options?.extension ?? ".json";
    customOptions.serializer = options?.compact
      ? JSON.stringify
      : jsonPrettifiedStringify;

    return this.customFile(customOptions);
  }

  /**
   * Create a new value storage handler for custom text files, using the builder's file writer and a caller-provided
   * serializer function.
   *
   * @param options The options and parameters to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs custom file writing.
   */
  customFile(options: Readonly<CustomFileValueHandlerOptions>): FluentHandler {
    const canStoreValue = options.canStoreValue ??
      ((_p: string, _u: URL, _v: unknown) => true);
    const extension = options.extension ?? "";
    const fileWriter = this.#fileWriter;
    const name = options.name ??
      `Custom value storage handler for extension "${extension}"`;
    const serializer = options.serializer;

    return makeFluent({
      name: name,
      canStoreValue(
        pathInSource: string,
        destinationUrl: URL,
        value: unknown,
      ): boolean {
        return canStoreValue(pathInSource, destinationUrl, value);
      },
      storeValue: (
        _pathInSource: string,
        destinationUrl: URL,
        value: unknown,
        options?: ValueStorageHandlerOptions,
      ) => {
        if (options?.signal?.aborted) {
          return Promise.reject(options?.signal?.reason);
        }

        const text = serializer(value);

        const urlWithExtension = new URL(destinationUrl);
        urlWithExtension.pathname += extension;

        return fileWriter.writeTextToFile(urlWithExtension, text, options);
      },
    });
  }

  /**
   * Create a new storage handler for arrays of **objects**, writing them to a directory -- this handler writes array
   * contents to directories in the file system, delegating to other handlers for the actual storage of the object's
   * properties.
   *
   * Directory value storage handlers only respond to `canStoreValue` when the value is an array.
   *
   * The intent is to write out a directory where the array contents are stored as directories, each representing an
   * object in the array. The name of each directory is taken from a property in the object. The `keyProperty` parameter
   * determines which property is used.
   *
   * If the array items are found not to be objects or not to contain the key property, the handler's `storeValue`
   * method will reject with a `TypeError`.
   *
   * The handlers are evaluated in order when processing each property in the object to store. If a handler's
   * `canStoreValue` method returns `true` for a property, it will be used to store the value. If no handler can store
   * an object-valued property, the directory object storage handler will recursively store that value, too. Remaining
   * non-object values cause an error to be raised or are either ignored, depending on the value of the
   * {@linkcode ValueStorageHandlerOptions.strict} option.
   *
   * @param options The options and parameters to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that stores arrays of objects as directories.
   */
  arrayToDirectory(
    options: Readonly<ArrayToDirectoryHandlerOptions>,
  ): FluentHandler {
    const keyProperty = options.keyProperty;
    const innerHandler = this.objectToDirectory(options);

    // Behind the scenes, all we're doing is transform the array into an object, then passing it to the
    // inner handler for storage.
    return makeFluent({
      name: name ?? "Array of objects directory value storage handler",
      canStoreValue(
        _pathInSource: string,
        _destinationUrl: URL,
        value: unknown,
      ): boolean {
        return Array.isArray(value);
      },
      storeValue(
        pathInSource: string,
        destinationUrl: URL,
        value: unknown,
        options?: Readonly<ValueStorageHandlerOptions>,
      ): Promise<void> {
        if (options?.signal?.aborted) {
          return Promise.reject(options?.signal?.reason);
        }

        if (!Array.isArray(value)) {
          return Promise.reject(
            new TypeError(
              `Attempting to store non-array value at path "${pathInSource}" as an array directory.`,
            ),
          );
        }

        if (
          !value.every((item) =>
            isObject(item) && typeof item[keyProperty] === "string"
          )
        ) {
          return Promise.reject(
            new TypeError(
              `Value at path "${pathInSource}" is not an array of objects with a "${keyProperty}" property.`,
            ),
          );
        }

        const transformedValue = Object.fromEntries(
          value.map((item) => [item[keyProperty], item]),
        );

        return innerHandler.storeValue(
          pathInSource,
          destinationUrl,
          transformedValue,
          options,
        );
      },
    });
  }

  /**
   * Create a new directory object storage handler -- this handler writes object contents to directories in the file
   * system, delegating to other handlers for the actual storage of the object's properties.
   *
   * Directory value storage handlers only respond to `canStoreValue` when the value is an object.
   *
   * The handlers are evaluated in order when processing each property in the object to store. If a handler's
   * `canStoreValue` method returns `true` for a property, it will be used to store the value. If no handler can store
   * an object-valued property, the directory object storage handler will recursively store that value, too. Remaining
   * non-object values cause an error to be raised or are either ignored, depending on the value of the
   * {@linkcode ValueStorageHandlerOptions.strict} option.
   *
   * @param options The options and parameters to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that stores objects as directories.
   */
  objectToDirectory(
    options: Readonly<ObjectToDirectoryHandlerOptions>,
  ): FluentHandler {
    const handlersCopy = Array.from(options.handlers);

    return makeFluent(
      new DirectoryValueStorageHandler(
        options.name ?? "Directory value storage handler",
        handlersCopy,
        this.#directoryCreator,
        options.defaultOptions,
      ),
    );
  }
}
