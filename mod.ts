import type {
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import { newDirectoryObjectStorageHandler } from "./factories.ts";

export type * from "./interfaces.ts";
export * from "./factories.ts";

/**
 * Convenience wrapper around `newDirectoryObjectStorageHandler` and `storeValue`.
 *
 * @param destinationUrl
 * @param value
 * @param handlers
 * @param options
 */
export function storeObjectToDirectory(
  destinationUrl: URL,
  value: Record<string, unknown>,
  handlers: Iterable<ValueStorageHandler>,
  options?: Readonly<ValueStorageHandlerOptions>,
): Promise<void> {
  const handler = newDirectoryObjectStorageHandler(handlers);

  return handler.storeValue("", destinationUrl, value, options);
}
