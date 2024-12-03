# Object-To-Directory

The reverse of
(@scroogieboy/directory-to-object)[https://jsr.io/@scroogieboy/directory-to-object].

## Examples

### Write the OpenAPI "pet store" spec in a decomposed directory structure

This example uses a small set of handlers set up to define output format choices
for specific paths in the spec.

It also makes use of the property name encoder option to map characters that are
forbidden in the file system to more aesthetic choices (mapping the forward
slash to a full-width solidus).

```typescript
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

// Let's use a little Unicode trickery to make the paths look pretty: replace "/" with
// the full-width solidus character, which is allowed in the file system.
await otd.storeObjectToDirectory(destinationUrl, petstore, handlers, {
  strict: true,
  propertyNameEncoder: (name) => name.replaceAll("/", "／"),
});
```

The full example source code can be found in the [examples](./examples)
directory.

Running this program will write the OpenAPI spec decomposed into multiple files:

```
└── petstore
    ├── components
    │   └── schemas
    │       ├── Error.json
    │       ├── Pet.json
    │       └── Pets.json
    ├── info.json
    ├── openapi.txt
    ├── paths
    │   ├── ／pets.json
    │   └── ／pets／{petId}.json
    └── servers.json
```
