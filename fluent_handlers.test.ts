import { assertEquals } from "@std/assert";
import { test } from "@cross/test";
import {
  MockValueStorageHandler,
  MockValueStorageHandlerWithHandlers,
} from "./mocks/value_storage_handler.mock.ts";
import {
  FluentValueStorageHandler,
  FluentValueStorageHandlerWithHandlers,
} from "./fluent_handlers.ts";

test("Can create fluent handlers", () => {
  const mockHandler = new MockValueStorageHandler("foo");
  const mockHandlerWithHandlers = new MockValueStorageHandlerWithHandlers(
    "bar",
  );

  const fluentHandler = FluentValueStorageHandler.newHandler(
    mockHandler,
    "FOO",
  );
  const fluentHandlerWithHandlers = FluentValueStorageHandlerWithHandlers
    .newHandler(mockHandlerWithHandlers, "BAR");

  assertEquals(fluentHandler.name, "FOO");
  assertEquals(fluentHandlerWithHandlers.name, "BAR");
});
