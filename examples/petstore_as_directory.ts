import petstore from "./petstore.json" with { type: "json" };
import * as otd from "../mod.ts";

const destinationUrl = new URL(import.meta.resolve("../tmp/petstore"));

const fileWriter = otd.newFileWriter();
const handlers: otd.ValueStorageHandler[] = [
  // Write the "openapi" value as its own file.
  otd.newTextFileValueStorageHandler(fileWriter).whenPathMatches("/openapi"),
  // These are the path patterns we want to write out as JSON files.
  otd.newJsonValueStorageHandler(fileWriter).whenPathMatchesSome([
    "/components/schemas/*",
    "/info",
    "/paths/*",
    "/servers",
  ]),
  // Any remaining objects will be written as directories.
];

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
