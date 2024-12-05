/**
 * Some utility functions useful in advanced library usage scenarios.
 *
 * The {@linkcode encodePathElement} function implements the minimal subset of URI component encoding required to
 * prevent issues when constructing paths in the source object. It encodes the "%" and "/" characters to prevent
 * conflicts. The {@linkcode decodePathElement} function implements the corresponding decoding.
 *
 * The {@linkcode makeFluent} function is a convenient way to "upgrade" a simple {@linkcode ValueStorageHandler}
 * implementation to the full {@linkcode FluentHandler} interface by wrapping it in a fluent implementation. This is
 * useful when implementing a value storage handler from scratch -- one can simply implement the core interface and use
 * the library implementation of fluent handlers via a call to {@linkcode makeFluent}.
 *
 * @module
 */

// deno-lint-ignore no-unused-vars
import type { FluentHandler, ValueStorageHandler } from "./interfaces.ts";

export { decodePathElement, encodePathElement } from "./path_encoder.ts";
export { makeFluent } from "./fluent_handlers.ts";
