/**
 * The interfaces that underlie this library.
 *
 * The value storage handler interface that consumers generally work with is {@linkcode FluentHandler}, which enhances
 * the core {@linkcode ValueStorageHandler} interface with fluent methods to build variations with additional
 * constraints.
 *
 * The options passed to functions in the library are also described as interfaces. The most frequently used is
 * {@linkcode ValueStorageHandlerOptions}, which are the options passed to the
 * {@linkcode ValueStorageHandler.storeValue} method to control the storage behavior (e.g., to map property names
 * to file names, etc.).
 *
 * The {@linkcode FileWriter} and {@linkcode DirectoryCreator} interfaces are the low-level abstractions over the
 * underlying runtime platform. Deno and Node.js/Bun have implementations built into the library, but it is possible
 * to write additional implementations over other file system-like media and use them with the library.
 *
 * @module
 */

/**
 * Our own equivalent to the Node.js `Abortable` interface. Unfortunately, the Deno and Node.js
 * `AbortSignal` types aren't completely identical, so using `Abortable` directly causes
 * type checking issues.
 */
export interface WithOptionalSignal {
  /**
   * A signal checked during writing operations to cancel them (e.g., based on a timeout).
   */
  signal?: AbortSignal;
}

/**
 * Options passed to the {@link FileWriter} {@linkcode FileWriter.writeTextToFile | writeTextToFile} method.
 */
export interface WriteTextToFileOptions extends WithOptionalSignal {
  /**
   * File system permissions applied to the file, if it is created.
   */
  mode?: number;
}

/**
 * Options passed to the {@link FileWriter} {@linkcode FileWriter.writeBinaryToFile | writeBinaryToFile} method.
 */
export interface WriteBinaryToFileOptions extends WithOptionalSignal {
  /**
   * File system permissions applied to the file, if it is created.
   */
  mode?: number;
}

/**
 * Interface of a writer that can write text files from strings and `Uint8Array`s to the file system.
 */
export interface FileWriter {
  /**
   * The name of the writer. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously write the contents to a file identified by its URL into a string.
   *
   * @param path The URL of the file to write.
   * @param contents The file contents to write.
   * @param options Options to apply to the writer.
   * @returns A promise that resolves when writing is complete.
   */
  writeTextToFile(
    path: URL,
    contents: string,
    options?: Readonly<WriteTextToFileOptions>,
  ): Promise<void>;

  /**
   * Asynchronously write the contents to a file identified by its URL into a `Uint8Array`.
   *
   * @param path The URL of the file to read.
   * @param contents The file contents to write.
   * @param options Options to apply to the reader.
   * @returns A promise that resolves when the writing is complete.
   */
  writeBinaryToFile(
    path: URL,
    contents: Readonly<Uint8Array>,
    options?: Readonly<WriteTextToFileOptions>,
  ): Promise<void>;
}

/**
 * Options passed to the {@linkcode DirectoryCreator} {@linkcode DirectoryCreator.createDirectory | createDirectory} method.
 */
export interface DirectoryCreatorOptions extends WithOptionalSignal {
  /**
   * If true, any intermediate parent directories that need to be created, will also be.
   */
  recursive?: boolean;

  /**
   * File system permissions applied to the directory, if the platform supports them (i.e., not on Windows).
   */
  mode?: number;
}

/**
 * Interface of a directory creator, that can asynchronously create a new directory.
 */
export interface DirectoryCreator {
  /**
   * The name of the directory creator. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously create a directory.
   *
   * @param directoryUrl The URL of the directory to create. The parent is expected to exist.
   * @param options Options to apply to the creator.
   * @returns A promise that resolves once the directory is created.
   */
  createDirectory(
    directoryUrl: URL,
    options?: Readonly<DirectoryCreatorOptions>,
  ): Promise<void>;
}

/**
 * Options passed to the {@link ValueStorageHandler} {@linkcode ValueStorageHandler.storeValueToFile | storeValueToFile} method.
 */
export interface ValueStorageHandlerOptions
  extends WriteTextToFileOptions, WriteBinaryToFileOptions {
  /**
   * If set to `true` and the value storage handler is able to detect lossy conditions (e.g., storing to a directory
   * but there aren't enough value storage handlers for all properties), the value storage handler will reject with an
   * error if a loss of data condition is detected.
   *
   * By default, storage is best-effort and values that aren't covered by handlers are ignored.
   */
  strict?: boolean;

  /**
   * A string encoding function to apply when converting the name of a property in the input data to
   * a path element in the URL of the destination file/directory. If not specified, defaults to `encodePathElement`.
   *
   * @param propertyName The name of the property in the input object.
   * @returns The name to use as a path element.
   */
  propertyNameEncoder?: (propertyName: string) => string;
}

/**
 * Interface implemented by objects that can store values to files or directories.
 *
 * Value storage handlers, as opposed to _writers_, encapsulate reading serialization and writing of a
 * value to the file system (or wherever the underlying writer persists to). They also encapsulate
 * the evaluation whether they can handle the value, so that the overall storage orchestration
 * can query value storage handlers in order until one matches.
 *
 * This library only contains value storage handlers for plain text, binary data and JSON files,
 * plus directories of files/directories. Consumers can create their own handlers for additional formats.
 */
export interface ValueStorageHandler {
  /**
   * The name of the storer. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Check whether this file value storer is able to store this value.
   *
   * @param pathInSource The (slash-separated) path where the value is located in the original object.
   * @param destinationUrl The URL of the file where the value would be written (without file extension).
   * @param value
   */
  canStoreValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
  ): boolean;

  /**
   * Asynchronously store (serialize and write) the contents to the file system at the specified URL. The
   * exact serialization format depends on the implementation.
   *
   * If the `ValueStorageHandler` is associated with a specific file extension, it will add the extension
   * as it writes the file.
   *
   * @param pathInSource The (slash-separated) path where the value is located in the original object.
   * @param destinationUrl The URL of the file to write (without file extension).
   * @param value The value to serialize and write.
   * @param options Options governing the behavior of the loader.
   * @returns A promise to a JavaScript value. There are no magic values, any value including `undefined` is valid.
   */
  storeValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
    options?: Readonly<ValueStorageHandlerOptions>,
  ): Promise<void>;
}

/**
 * Extension of the value storage handler with a fluent API for convenience.
 */
export interface FluentHandler extends ValueStorageHandler {
  /**
   * Give the handler a name.
   *
   * @param name The new name for the handler.
   * @returns A new handler with the same behavior but with the new name.
   */
  withName(name: string): FluentHandler;

  /**
   * Add a pattern-based path match pattern.
   *
   * @param pattern The path matching pattern to add.
   * @returns A new handler with the existing behavior plus the additional path matching requirement.
   */
  whenPathMatches(pattern: string): FluentHandler;

  /**
   * Add pattern-based path matching: the path in the source must match **all** of these patterns.
   *
   * @param patterns An array of path matching patterns to match -- all patterns must match.
   * @returns A new handler with the existing behavior plus the additional path matching requirement.
   */
  whenPathMatchesEvery(patterns: string[]): FluentHandler;

  /**
   * Add pattern-based path matching: the path in the source must match **at least one** of these patterns.
   *
   * @param patterns An array of path matching patterns to match -- at least one pattern must match.
   * @returns A new handler with the existing behavior plus the additional path matching requirement.
   */
  whenPathMatchesSome(patterns: string[]): FluentHandler;

  /**
   * Add a type matching condition that only matches array values.
   */
  whenIsArray(): FluentHandler;

  /**
   * Add a type matching condition that only matches object (excluding `null` and array) values.
   */
  whenIsObject(): FluentHandler;

  /**
   * Add coarse JavaScript type matching using the `typeof` operator. The handler only can store values whose
   * type matches the argument.
   *
   * @param type The JavaScript type name that values must satisfy.
   * @returns A new handler with the existing behavior plus the additional type matching requirement.   */
  whenIsTypeOf(
    type:
      | "string"
      | "number"
      | "bigint"
      | "boolean"
      | "symbol"
      | "undefined"
      | "object"
      | "function",
  ): FluentHandler;

  /**
   * Add class instance  matching using the `instanceof` operator. The handler only can store values
   * that are instances of the provided class (constructor).
   *
   * @param classConstructor The class (constructor) to match.
   * @returns A new handler with the existing behavior plus the additional class instance matching requirement.
   */
  whenIsInstanceOf(
    // deno-lint-ignore no-explicit-any
    classConstructor: new (..._: any[]) => unknown,
  ): FluentHandler;
}

/**
 * The signature expected of serializer functions passed to the {@linkcode HandlerBuilder.customFile} method.
 */
export type StringifyFunc = (input: unknown) => string;

/**
 * The signature expected of the custom `canStoreValue` implementation passed to the
 * {@linkcode HandlerBuilder.customFile} method.
 */
export type CanStoreValueFunc = (
  pathInSource: string,
  destinationUrl: URL,
  value: unknown,
) => boolean;

/**
 * The common options passed to the file handler builder methods on interface {@linkcode HandlerBuilder}.
 *
 * These apply to {@linkcode HandlerBuilder.textFile}, {@linkcode HandlerBuilder.binaryFile},
 * {@linkcode HandlerBuilder.jsonFile}, and {@linkcode HandlerBuilder.customFile}.
 */
export interface FileValueHandlerOptions {
  /**
   * The file name extension to append to written files. If omitted, the handler will use to a
   * format-appropriate default.
   */
  extension?: string;

  /**
   * The optional name to give the handler. It is only informational and useful when debugging code with many handlers.
   */
  name?: string;
}

/**
 * The specific options for the {@linkcode HandlerBuilder.jsonFile} method.
 */
export interface JsonFileValueHandlerOptions extends FileValueHandlerOptions {
  /**
   * Optionally output compact JSON. By default, the generated JSON is prettified by including line breaks and
   * indentation.
   */
  compact?: boolean;
}

/**
 * Options specific to the {@linkcode HandlerBuilder.customFile} method.
 *
 * Note that the {@linkcode CustomFileValueHandlerOptions.serializer | serializer} option is mandatory.
 */
export interface CustomFileValueHandlerOptions extends FileValueHandlerOptions {
  /**
   * The serializer (function that converts a value into a string) to use for this custom value storage handler.
   */
  serializer: StringifyFunc;

  /**
   * Optional implementation of the {@linkcode ValueStorageHandler.canStoreValue} function for the custom value
   * storage handler. If omitted, the `canStoreValue` method will always return `true`.
   */
  canStoreValue?: CanStoreValueFunc;
}

/**
 * Options that apply to the directory-related builder methods: {@linkcode HandlerBuilder.arrayToDirectory} and
 * {@linkcode HandlerBuilder.objectToDirectory}.
 *
 * Note that the {@linkcode ObjectToDirectoryHandlerOptions.handlers | handlers} option is mandatory.
 */
export interface ObjectToDirectoryHandlerOptions {
  /**
   * The handlers to consult when storing object contents. Required.
   */
  handlers: Iterable<ValueStorageHandler>;

  /**
   * The optional name for the value storage handler. It is only informational and useful when debugging code with
   * many handlers.
   */
  name?: string;

  /**
   * Default options to merge with those provided by the caller in the handler's
   * {@linkcode ValueStorageHandler.storeValue} implementation.
   */
  defaultOptions?: Readonly<ValueStorageHandlerOptions>;
}

/**
 * Options that apply specifically to the array to directory builder method:
 * {@linkcode HandlerBuilder.arrayToDirectory}.
 *
 * Note that the {@linkcode ArrayToDirectoryHandlerOptions.keyProperty | keyProperty} option is mandatory.
 */
export interface ArrayToDirectoryHandlerOptions
  extends ObjectToDirectoryHandlerOptions {
  /**
   * The key of the property in array items that the handler will use to determine what to call each item as it
   * is stored within a directory. If omitted, the handler will use the item's index as its name in the directory.
   */
  keyProperty?: string;
}

/**
 * A fluent builder interface for creating value storage handlers handlers.
 */
export interface HandlerBuilder {
  /**
   * Create a new text file value storage handler. This handler stores strings as plain text files.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs plain text file writing.
   */
  textFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler;

  /**
   * Create a new binary file value storage handler. The handler can store `Uint8Array`, `ArrayBuffer` and
   * `ArrayBufferView` values. No other value types are handled.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs binary file writing.
   */
  binaryFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler;

  /**
   * Create a new JSON file value storage handler. This handler serializes values to JSON and
   * writes them to files.
   *
   * The JSON defaults to a prettified format with line breaks and indentation. Use the
   * {@linkcode JsonFileValueHandlerOptions.compact} option to use a compact JSON format, instead.
   *
   * @param options The options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs JSON file writing.
   */
  jsonFile(options?: Readonly<JsonFileValueHandlerOptions>): FluentHandler;

  /**
   * Create a storage handler that serializes values using a provided serializer function and writes the resulting
   * string to a file.
   *
   * @param options The parameters and options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that performs custom file writing.
   */
  customFile(options: Readonly<CustomFileValueHandlerOptions>): FluentHandler;

  /**
   * Create a storage handler that stores arrays of **objects** as directories, where the name of each entry in the
   * directory is derived from the contents of the corresponding object. The provided handlers are used to store
   * the items.
   *
   * Array directory value storage handlers only respond to `canStoreValue` when the value is an array.
   *
   * The intent is to write out a directory where the array contents are stored as directories, each representing an
   * object in the array. The name of each directory is taken from a property in the object. The
   * {@linkcode ArrayToDirectoryHandlerOptions.keyProperty | keyProperty} parameter determines which property is used
   * to name directory entries.
   *
   * If the array items are found not to be objects or not to contain the key property, the handler's `storeValue`
   * method will reject with a `TypeError`.
   *
   * The handlers in the `options` parameter are evaluated in order when processing each property in the object to
   * store. If a handler's `canStoreValue` method returns `true` for a property, it will be used to store the value.
   * If no handler can store an object-valued property, the directory object storage handler will serve as the fallback,
   * recursively storing that value. Remaining non-object values cause an error to be raised or are either ignored,
   * depending on the value of the {@linkcode ValueStorageHandlerOptions.strict} option.
   *
   * @param options The parameters and options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that stores arrays of objects as directories.
   */
  arrayToDirectory(
    options: Readonly<ArrayToDirectoryHandlerOptions>,
  ): FluentHandler;

  /**
   * Create a storage handler that stores objects as directories. Each directory entry corresponds to a property in
   * the value object. The provided handlers are used to store the items.
   *
   * Directory value storage handlers only respond to `canStoreValue` when the value is an object.
   *
   * The handlers in the `options` parameter are evaluated in order when processing each property in the object to
   * store. If a handler's `canStoreValue` method returns `true` for a property, it will be used to store the value.
   * If no handler can store an object-valued property, the directory object storage handler will serve as the fallback,
   * recursively storing that value. Remaining non-object values cause an error to be raised or are either ignored,
   * depending on the value of the {@linkcode ValueStorageHandlerOptions.strict} option.
   *
   * @param options The parameters and options to control the specifics of the handler.
   * @returns An object implementing the {@linkcode FluentHandler} interface that stores objects as directories.
   */
  objectToDirectory(
    options: Readonly<ObjectToDirectoryHandlerOptions>,
  ): FluentHandler;
}
