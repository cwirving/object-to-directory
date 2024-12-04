import { json2csv } from "json-2-csv";
import * as otd from "../mod.ts";
import trivyOutput from "./trivy_output.json" with { type: "json" };

const destinationUrl = new URL(import.meta.resolve("../tmp/trivy_output"));

// Let's roll our own CSV handler.
const csvHandler = otd.handlers.customFile({
  serializer: (v) => Array.isArray(v) ? json2csv(v) : "",
  extension: ".csv",
  name: "CSV Handler",
});

// Set up the handlers for the "/Results" path -- we want to treat this path differently.
const resultsHandlers: otd.ValueStorageHandler[] = [
  csvHandler.whenIsArray(),
  otd.handlers.textFile(),
];

const handlers: otd.ValueStorageHandler[] = [
  // Plain-text properties go to .txt files.
  otd.handlers.textFile(),
  // The "Results" array property is written as a directory containing CSV files of vulnerabilities.
  otd.handlers.arrayToDirectory({
    keyProperty: "Target",
    handlers: resultsHandlers,
  }).whenPathMatches("/Results"),
  // Default to writing any other properties as JSON files.
  otd.handlers.jsonFile({ prettified: true }),
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
