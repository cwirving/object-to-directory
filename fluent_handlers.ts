import type {
  FluentHandler,
  ValueStorageHandler,
  ValueStorageHandlerOptions,
  ValueStorageHandlerWithHandlers,
} from "./interfaces.ts";
import { default as picomatch } from "picomatch";

type conditionFn = (
  pathInSource: string,
  destinationUrl: URL,
  value: unknown,
) => boolean;

export abstract class AbstractFluentValueStorageHandler<
  THandler extends ValueStorageHandler,
> implements ValueStorageHandler, FluentHandler<THandler> {
  readonly #innerHandler: ValueStorageHandler;
  readonly #name: string;
  readonly #condition: conditionFn;

  protected abstract newInnerHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ): THandler & FluentHandler<THandler>;

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

  get name(): string {
    return this.#innerHandler.name;
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

  withName(name: string): THandler & FluentHandler<THandler> {
    return this.newInnerHandler(this, name);
  }

  whenPathMatches(pattern: string): THandler & FluentHandler<THandler> {
    const matcher = picomatch(pattern);

    return this.newInnerHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matcher(pathInSource) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenPathMatchesSome(patterns: string[]): THandler & FluentHandler<THandler> {
    const matchers = patterns.map((p) => picomatch(p));

    return this.newInnerHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        matchers.some((m) => m(pathInSource)) &&
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
  ): THandler & FluentHandler<THandler> {
    return this.newInnerHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (typeof value === type) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }

  whenIsInstanceOf(
    classConstructor: new () => unknown,
  ): THandler & FluentHandler<THandler> {
    return this.newInnerHandler(
      this,
      (pathInSource: string, destinationUrl: URL, value: unknown) =>
        (value instanceof classConstructor) &&
        this.canStoreValue(pathInSource, destinationUrl, value),
    );
  }
}

export class FluentValueStorageHandler
  extends AbstractFluentValueStorageHandler<ValueStorageHandler> {
  static newHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ): ValueStorageHandler & FluentHandler<ValueStorageHandler> {
    return Object.freeze(
      new FluentValueStorageHandler(handler, nameOrCondition),
    );
  }

  protected override newInnerHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ): ValueStorageHandler & FluentHandler<ValueStorageHandler> {
    return Object.freeze(
      new FluentValueStorageHandler(handler, nameOrCondition),
    );
  }

  protected constructor(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ) {
    super(handler, nameOrCondition);
  }
}

export class FluentValueStorageHandlerWithHandlers
  extends AbstractFluentValueStorageHandler<ValueStorageHandlerWithHandlers> {
  readonly handlers: ValueStorageHandler[] = [];

  static newHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ):
    & ValueStorageHandlerWithHandlers
    & FluentHandler<ValueStorageHandlerWithHandlers> {
    return Object.freeze(
      new FluentValueStorageHandlerWithHandlers(handler, nameOrCondition),
    );
  }

  protected override newInnerHandler(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ):
    & ValueStorageHandlerWithHandlers
    & FluentHandler<ValueStorageHandlerWithHandlers> {
    return Object.freeze(
      new FluentValueStorageHandlerWithHandlers(handler, nameOrCondition),
    );
  }

  protected constructor(
    handler: ValueStorageHandler,
    nameOrCondition?: string | conditionFn,
  ) {
    super(handler, nameOrCondition);
  }
}
