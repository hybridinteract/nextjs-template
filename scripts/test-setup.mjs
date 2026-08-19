/**
 * Registers the resolution hooks for `npm test`. See ./test-hooks.mjs for why.
 * Loaded via `node --import ./scripts/test-setup.mjs`.
 */
import { register } from "node:module";
import { pathToFileURL } from "node:url";

register("./test-hooks.mjs", pathToFileURL("./scripts/"));
