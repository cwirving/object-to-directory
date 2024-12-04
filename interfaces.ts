/**
 * Our own equivalent to the Node.js `Abortable` type. Unfortunately, the Deno and Node.js
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
 * Options passed to the {@link DirectoryCreator} {@linkcode DirectoryCreator.createDirectory | createDirectory} method.
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
 * The signature expected of string serializer functions passed to {@linkcode HandlerBuilder.customFile} method.
 */
export type StringifyFunc = (input: unknown) => string;

export interface FileValueHandlerOptions {
  extension?: string;
  name?: string;
}

export interface JsonFileValueHandlerOptions extends FileValueHandlerOptions {
  prettified?: boolean;
}

export interface CustomFileValueHandlerOptions extends FileValueHandlerOptions {
  serializer: StringifyFunc;
}

export interface ObjectToDirectoryHandlerOptions {
  handlers: Iterable<ValueStorageHandler>;
  name?: string;
  defaultOptions?: Readonly<ValueStorageHandlerOptions>;
}

export interface ArrayToDirectoryHandlerOptions
  extends ObjectToDirectoryHandlerOptions {
  keyProperty: string;
}

export interface HandlerBuilder {
  textFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler;
  binaryFile(options?: Readonly<FileValueHandlerOptions>): FluentHandler;
  jsonFile(options?: Readonly<JsonFileValueHandlerOptions>): FluentHandler;
  customFile(options: Readonly<CustomFileValueHandlerOptions>): FluentHandler;
  arrayToDirectory(
    options: Readonly<ArrayToDirectoryHandlerOptions>,
  ): FluentHandler;
  objectToDirectory(
    options: Readonly<ObjectToDirectoryHandlerOptions>,
  ): FluentHandler;
}
