import type {
  FluentHandler,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
} from "./interfaces.ts";
import picomatch from "picomatch";
import { isObject } from "./merge_utilities.ts";

type conditionFn = (
  pathInSource: string,
  destinationUrl: URL,
  value: unknown,
) => boolean;

export class FluentValueStorageHandler implements FluentHandler {
  readonly #innerHandler: ValueStorageHandler;
  readonly #name: string;
  readonly #condition: conditionFn;

  protected constructor(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ) {
    this.#innerHandler = handler;
    this.#name = (typeof nameOrCondition === "string")
      ? nameOrCondition
      : handler.name;
    const condition = (typeof nameOrCondition === "function")
      ? nameOrCondition
      : undefined;
    this.#condition = condition ??
      ((pathInSource: string, destinationUrl: URL, value: unknown) =>
        handler.canStoreValue(pathInSource, destinationUrl, value));
  }

  static newHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ): FluentHandler {
    return Object.freeze(
      new FluentValueStorageHandler(handler, nameOrCondition),
    );
  }

  get name(): string {
    return this.#name;
  }

  canStoreValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
  ): boolean {
    return this.#condition(pathInSource, destinationUrl, value);
  }

  storeValue(
    pathInSource: string,
    destinationUrl: URL,
    value: unknown,
    options?: Readonly<ValueStorageHandlerOptions>,
  ): Promise<void> {
    return this.#innerHandler.storeValue(
      pathInSource,
      destinationUrl,
      value,
      options,
    );
  }

  withName(name: string): FluentHandler {
    return FluentValueStorageHandler.newHandler(this, name);
  }

  whenPathMatches(pattern: string): FluentHandler {
    const matcher = picomatch(pattern);

    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matcher(pathInSource) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenPathMatchesEvery(patterns: string[]): FluentHandler {
    const matchers = patterns.map((p) => picomatch(p));

    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matchers.every((m) => m(pathInSource)) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenPathMatchesSome(patterns: string[]): FluentHandler {
    const matchers = patterns.map((p) => picomatch(p));

    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matchers.some((m) => m(pathInSource)) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsArray(): FluentHandler {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        Array.isArray(value) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsObject(): FluentHandler {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        isObject(value) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

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
  ): FluentHandler {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (typeof value === type) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsInstanceOf(
    classConstructor: new (..._: unknown[]) => unknown,
  ): FluentHandler {
    return FluentValueStorageHandler.newHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (value instanceof classConstructor) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }
}

/**
 * Given an object implementing interface {@linkcode ValueStorageHandler}, wrap it in a {@linkcode FluentHandler}
 * implementation that makes it easier to build customized versions of the handler. The handler is only wrapped if it
 * is not already a fluent handler.
 *
 * @param handler The handler to make fluent.
 * @returns The handler itself, if it is already fluent, or a wrapper around the handler that makes it fluent.
 */
export function makeFluent(handler: ValueStorageHandler): FluentHandler {
  return (handler instanceof FluentValueStorageHandler)
    ? handler
    : FluentValueStorageHandler.newHandler(handler);
}
