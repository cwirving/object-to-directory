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
}

/**
 * Options passed to the {@link FileWriter} {@linkcode FileWriter.writeBinaryToFile | writeBinaryToFile} method.
 */
export interface WriteBinaryToFileOptions extends WithOptionalSignal {
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
 * Options passed to the {@link FileValueStorer} {@linkcode FileValueStorer.storeValueToFile | storeValueToFile} method.
 */
export interface FileValueStorerOptions extends WriteTextToFileOptions, WriteBinaryToFileOptions {
}

/**
 * Interface of a file value storer.
 *
 * File value storers, as opposed to _writers_ encapsulate reading serialization and writing of a
 * value to the file system (or wherever the underlying writer persists to).
 *
 * While this library only contains storers for plain text, binary data and JSON files, consumers
 * can create their own storers for any format they choose.
 */
export interface FileValueStorer {
  /**
   * The name of the storer. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously store (serialize and write) the contents to the file at the specified URL. The
   * exact serialization format depends on the implementation.
   *
   * @param fileUrl The URL of the file to write.
   * @param value The value to serialize and write.
   * @param options Options governing the behavior of the loader.
   * @returns A promise to a JavaScript value. There are no magic values, any value including `undefined` is valid.
   */
  storeValueToFile(
    fileUrl: URL,
    value: unknown,
    options?: Readonly<FileValueStorerOptions>,
  ): Promise<void>;
}


/**
 * Options passed to the {@link DirectoryObjectStorer} {@linkcode DirectoryObjectLoader.loadObjectFromDirectory | loadValueFromFile} method.
 */
export interface DirectoryObjectStorerOptions
  extends FileValueStorerOptions, DirectoryCreatorOptions {
}

/**
 * Interface of a directory object storer.
 *
 * Directory object storers store the contents of a plain JavaScript object to an existing directory.
 */
export interface DirectoryObjectStorer {
  /**
   * The name of the storer. For runtime debugging purposes.
   */
  readonly name: string;

  /**
   * Asynchronously write a plain JavaScript object to a directory specified by its URL.
   * Does not delete the existing contents of the directory.
   *
   * @param directoryPath The URL of the directory where the object contents will be stored.
   * @param contents The object to write as directory contents.
   * @param options Options to pass to the directory creator, file storers and file writers used during the operation.
   * @returns A promise that resolves when the
   */
  storeObjectToDirectory(
    directoryPath: URL,
    contents: Record<string, unknown>,
    options?: Readonly<DirectoryObjectStorerOptions>,
  ): Promise<void>;
}
