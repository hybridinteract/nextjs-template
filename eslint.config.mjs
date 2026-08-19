import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

const config = [
  { ignores: [".next/**", "node_modules/**", "out/**", "next-env.d.ts"] },
  ...coreWebVitals,
  ...typescript,
  {
    rules: {
      // `_`-prefixed bindings are this codebase's marker for a deliberately unused
      // value (discarded destructuring targets, placeholder handlers).
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          varsIgnorePattern: "^_",
          argsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
          destructuredArrayIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    // ncube.js is a plain CommonJS Node script, not app source — `require()` is
    // how it is meant to be written.
    files: ["ncube.js"],
    rules: { "@typescript-eslint/no-require-imports": "off" },
  },
  // NOTE: the date/number `no-restricted-syntax` rules go here once
  // `@/lib/date-utils` and `@/lib/numeric` land. Add them to ONE block — in flat
  // config a later `no-restricted-syntax` entry *replaces* an earlier one rather
  // than merging, so a second block silently switches the first one off.
];

export default config;
