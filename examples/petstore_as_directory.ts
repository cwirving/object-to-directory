import { assertEquals } from "@std/assert";
import * as otd from "../mod.ts";
import * as dto from "@scroogieboy/directory-to-object";
import petstore from "./petstore.json" with { type: "json" };

const destinationUrl = new URL(import.meta.resolve("../tmp/petstore"));

const fileWriter = otd.newFileWriter();
const handlers: otd.ValueStorageHandler[] = [
  // Write the "openapi" value as its own file.
  otd.newTextFileValueStorageHandler(fileWriter).whenPathMatches("/openapi"),
  // These are the path patterns we want to write out as JSON files.
  otd.newJsonValueStorageHandler(fileWriter, true).whenPathMatchesSome([
    "/components/schemas/*",
    "/info",
    "/paths/*",
    "/servers",
  ]),
  // Any remaining objects will be written as directories.
];

// Clean up the destination directory, if it exists.
try {
  await Deno.remove(destinationUrl, { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) {
    throw e;
  }
}

// Let's use a little Unicode trickery to make the paths look pretty: replace "/" with
// the full-width solidus character, which is allowed in the file system.
await otd.storeObjectToDirectory(destinationUrl, petstore, handlers, {
  strict: true,
  propertyNameEncoder: (name) => name.replaceAll("/", "／"),
});

// Use directory-to-object to load the OpenAPI spec back in, with the corresponding name decoding.
const loadedPetstore = await dto.loadObjectFromDirectory(destinationUrl, {
  propertyNameDecoder: (name: string) => name.replaceAll("／", "/"),
});

// The specs should be identical 😀.
assertEquals(loadedPetstore, petstore);
