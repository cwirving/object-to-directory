/**
 * An extensible library to write out the contents of JavaScript objects to a directory structure in the file system.
 * This can be used to write complicated data structures in a way that is easier for humans to work with, or to
 * extract interesting parts of the data structure into their own files/directories.
 *
 * {@linkcode storeObjectToDirectory} stores a JavaScript object to the file system as a directory. It relies on
 * value storage handlers to guide how the various properties in the input object and their descendents are written
 * to the file system.
 *
 * The {@linkcode Handlers} builder singleton is a convenient way to build handlers for {@linkcode storeObjectToDirectory}.
 * See the {@linkcode HandlerBuilder} interface for a description of the various handlers that can be created through
 * the builder.
 *
 * @module
 */

import type {
  HandlerBuilder,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";

import { DefaultHandlerBuilder } from "./factories.ts";

/**
 * Convenience wrapper around the handler builder in {@linkcode Handlers} and the
 * {@linkcode ValueStorageHandler.storeValue} directory storage handler method to write the contents
 * of an object to a directory in one step.
 *
 * @param destinationUrl The destination in the file system of the directory to create, as a URL.
 * @param value The object to store.
 * @param handlers The value storage handlers to consult when storing the properties in the object.
 * @param options Options to control the specifics of the storage.
 */
export function storeObjectToDirectory(
  destinationUrl: URL,
  value: Record<string, unknown>,
  handlers: Iterable<ValueStorageHandler>,
  options?: Readonly<ValueStorageHandlerOptions>,
): Promise<void> {
  const handler = Handlers.objectToDirectory({ handlers: handlers });

  return handler.storeValue("", destinationUrl, value, options);
}

/**
 * The default handler builder for the library -- imlements the {@linkcode HandlerBuilder} interface for a
 * convenient way to create storage handlers.
 */
export const Handlers: HandlerBuilder = new DefaultHandlerBuilder();
