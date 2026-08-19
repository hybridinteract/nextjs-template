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
  {
    // Dates and numbers must go through the centralized layers
    // (@/lib/date-utils, @/lib/numeric), never raw browser-locale formatting.
    // See `docs/rules/12-dates-and-numbers.md`.
    //
    // ONE block on purpose: in flat config a later `no-restricted-syntax` entry
    // *replaces* an earlier one rather than merging, so a second block for the
    // number rules would silently switch the date rules off for every file
    // outside its `ignores`. Add selectors to this array; never add a second
    // block for this rule.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/lib/date-utils.ts", "src/lib/numeric/**"],
    rules: {
      "no-restricted-syntax": [
        "error",
        {
          selector:
            "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
          message:
            "Don't format with toLocale*(): it follows the viewer's browser locale AND timezone, so the same record reads differently on different machines. Use formatDate/formatDateTime/formatTime/formatBusinessDate from @/lib/date-utils, passing a timeZone from useDisplayTimeZone().",
        },
        {
          selector:
            "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
          message:
            "new Date().toISOString().slice(0,10) yields the UTC day, which is off by one west of UTC. Use todayString(timeZone) / toDateString() from @/lib/date-utils.",
        },
        {
          selector:
            "NewExpression[callee.object.name='Intl'][callee.property.name=/^(NumberFormat|PluralRules)$/]",
          message:
            "Don't construct Intl.NumberFormat directly — it follows the viewer's browser locale, so 1234.5 renders as '1.234,5' on a German machine. Use formatMoney/formatQuantity from @/lib/numeric.",
        },
        {
          selector:
            "CallExpression[callee.object.name='Intl'][callee.property.name=/^(NumberFormat|PluralRules)$/]",
          message:
            "Don't call Intl.NumberFormat directly — it follows the viewer's browser locale. Use formatMoney/formatQuantity from @/lib/numeric.",
        },
      ],
    },
  },
];

export default config;
