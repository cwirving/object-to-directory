# Object-To-Directory

This library is the reverse of
(@scroogieboy/directory-to-object)[https://jsr.io/@scroogieboy/directory-to-object].
It makes it easy to write out the contents of a JavaScript object structure to
the file system in a granular fashion: instead of writing a single JSON, YAML or
other format file, the data is written to a directory, with properties written
to various formats (or directories) based on configuration.

## Examples

### Write the OpenAPI "pet store" spec in a decomposed directory structure, then read it back using `@scroogieboy/directory-to-object`

This example uses a small set of handlers set up to define output format choices
for specific paths in the spec.

It also makes use of the property name encoder option to map characters that are
forbidden in the file system to more aesthetic choices (mapping the forward
slash to a full-width solidus).

Finally, it reads the directory structure back into memory using the
`@scroogieboy/directory-to-object` package and verifies that the specs match.

```typescript
import { assertEquals } from "@std/assert";
import * as otd from "@scroogieboy/object-to-directory";
import * as dto from "@scroogieboy/directory-to-object";
import petstore from "./petstore.json" with { type: "json" };

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
```

The full example source code can be found in the [examples](./examples)
directory.

Running this program will write the OpenAPI spec decomposed into multiple files:

```
.
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

### Unpack the vulnerabilities from a Trivy scan JSON file

This is a somewhat contrived example that makes use of nested directory handlers
to unpack the contents of a [Trivy](https://trivy.dev/) container image scan
(e.g., the Deno distroless Docker image) into a directory structure and write
the vulnerabilities as a CSV file.

We'll use the [json-2-csv](https://www.npmjs.com/package/json-2-csv) NPM package
for the actual CSV file writing.

```typescript
import { json2csv } from "json-2-csv";
import * as otd from "@scroogieboy/object-to-directory";
import trivyOutput from "./trivy_output.json" with { type: "json" };

const destinationUrl = new URL(import.meta.resolve("../tmp/trivy_output"));

const fileWriter = otd.newFileWriter();

// Let's roll our own CSV handler.
const csvHandler = otd.newStringSerializerValueStorageHandler(
  fileWriter,
  (v) => Array.isArray(v) ? json2csv(v) : "",
  ".csv",
  "CSV Handler",
);

// Set up the handlers for the "/Results" path -- we want to treat this path differently.
const resultsHandlers: otd.ValueStorageHandler[] = [
  csvHandler.whenIsArray(),
  otd.newTextFileValueStorageHandler(fileWriter),
];

const handlers: otd.ValueStorageHandler[] = [
  // Plain-text properties go to .txt files.
  otd.newTextFileValueStorageHandler(fileWriter),
  // The "Results" array property is written as a directory containing CSV files of vulnerabilities.
  otd.newDirectoryArrayOfObjectsStorageHandler("Target", resultsHandlers)
    .whenPathMatches("/Results"),
  // Default to writing any other properties as JSON files.
  otd.newJsonValueStorageHandler(fileWriter),
];

// Clean up the destination directory, if it exists.
try {
  await Deno.remove(destinationUrl, { recursive: true });
} catch (e) {
  if (!(e instanceof Deno.errors.NotFound)) {
    throw e;
  }
}

// Let's write out a directory structure with the Trivy output broken out, including the
// vulnerabilities as a CSV file.
await otd.storeObjectToDirectory(destinationUrl, trivyOutput, handlers, {
  strict: true,
});
```

```
.
└── trivy_output
    ├── ArtifactName.txt
    ├── ArtifactType.txt
    ├── CreatedAt.txt
    ├── Metadata.json
    ├── Results
    │   └── denoland%2Fdeno:distroless (debian 12.8)
    │       ├── Class.txt
    │       ├── Target.txt
    │       ├── Type.txt
    │       └── Vulnerabilities.csv
    └── SchemaVersion.json
```

```
```
