import coreWebVitals from "eslint-config-next/core-web-vitals";
import typescript from "eslint-config-next/typescript";

// Dates and numbers must go through the centralized layers (@/lib/date-utils,
// @/lib/numeric), never raw browser-locale formatting.
// See `docs/rules/12-dates-and-numbers.md`.
const DATE_AND_NUMBER_RULES = [
  {
    selector: "CallExpression[callee.property.name=/^toLocale(Date|Time)?String$/]",
    message:
      "Don't format with toLocale*(): it follows the viewer's browser locale AND timezone, so the same record reads differently on different machines. Use formatDate/formatDateTime/formatTime/formatBusinessDate from @/lib/date-utils, passing a timeZone from useDisplayTimeZone().",
  },
  {
    selector: "CallExpression[callee.property.name='slice'][callee.object.callee.property.name='toISOString']",
    message:
      "new Date().toISOString().slice(0,10) yields the UTC day, which is off by one west of UTC. Use todayString(timeZone) / toDateString() from @/lib/date-utils.",
  },
  {
    selector: "NewExpression[callee.object.name='Intl'][callee.property.name=/^(NumberFormat|PluralRules)$/]",
    message:
      "Don't construct Intl.NumberFormat directly — it follows the viewer's browser locale, so 1234.5 renders as '1.234,5' on a German machine. Use formatMoney/formatQuantity from @/lib/numeric.",
  },
  {
    selector: "CallExpression[callee.object.name='Intl'][callee.property.name=/^(NumberFormat|PluralRules)$/]",
    message:
      "Don't call Intl.NumberFormat directly — it follows the viewer's browser locale. Use formatMoney/formatQuantity from @/lib/numeric.",
  },
];

// The design system: no made-up sizes, colours, corners, shadows or timings in a
// class name, and no raw Tailwind palette. Each one is a second, private design
// system that dark mode and the next rebrand will miss.
// See `docs/rules/10-styling.md`.
const MADE_UP_VALUE = String.raw`(^|\s|:)-?(text|font|rounded(-[trblxyse]{1,2})?|shadow|tracking|leading|duration|delay|ease)-\[`;
const MADE_UP_COLOUR = String.raw`(^|\s|:)(bg|border|ring|outline|fill|stroke|from|via|to|divide|decoration|placeholder|caret|accent)-\[(#|rgb|hsl|oklch|color:)`;
const RAW_PALETTE = String.raw`(^|\s|:)-?(text|bg|border|ring|outline|fill|stroke|from|via|to|divide|decoration|placeholder|caret|accent|shadow)-(slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-[0-9]|(^|\s|:)(text|bg|border)-(white|black)\b`;

function inClassStrings(pattern, message) {
  return [
    { selector: `Literal[value=/${pattern}/]`, message },
    { selector: `TemplateElement[value.raw=/${pattern}/]`, message },
  ];
}

const SIZE_RULES = inClassStrings(
  MADE_UP_VALUE,
  "No made-up values in a class name (text-[11px], rounded-[7px], shadow-[…], duration-[…]). Use Tailwind's scale: text-xs to text-3xl, rounded-md to rounded-3xl, shadow-sm to shadow-2xl, duration-150/200/300. A size you need everywhere is a token in globals.css. See docs/rules/10-styling.md.",
);

const COLOUR_RULES = [
  ...inClassStrings(
    MADE_UP_COLOUR,
    "No hand-picked colours in a class name (bg-[#1F6F5F]). Use a token: bg-primary, text-success, bg-muted… A missing colour is a new token in globals.css, set for both themes.",
  ),
  ...inClassStrings(
    RAW_PALETTE,
    "No raw Tailwind palette (text-red-500, bg-gray-100, text-white). It does not change with dark mode. Use a token: text-destructive, bg-muted, text-primary-foreground.",
  ),
];

// The parts, not lookalikes. A raw control or a hand-styled one skips the
// focus ring, the height, dark mode and the label wiring the part has.
// See docs/rules/10-styling.md.
const RAW_CONTROL = "^(button|input|select|textarea|dialog|table)$";
const STYLED_PROPERTY =
  "^(color|background|backgroundColor|backgroundImage|borderColor|boxShadow|fontFamily|fontSize|fontWeight|lineHeight|letterSpacing|borderRadius)$";

const PART_RULES = [
  {
    selector: `JSXOpeningElement[name.name=/${RAW_CONTROL}/]`,
    message:
      "Use the part, not a raw element: <Button>, <Input>, <Select>, <Textarea>, <Modal>, <Table> or <DataView>. Only the folders that build parts (components/ui, layout, shared, data-view) use raw elements. A missing part goes there first. See docs/rules/10-styling.md.",
  },
  {
    selector: `JSXAttribute[name.name='style'] Property[key.name=/${STYLED_PROPERTY}/]`,
    message:
      "No colours, fonts, sizes, corners or shadows in an inline style: they skip the tokens, so dark mode and the next rebrand miss them. Use a class and a token. An inline style may only carry a computed layout value, like a meter's width.",
  },
];

// Toasts go through `notify` (@/lib/toast). It sets the durations and makes a
// retried save replace its last error instead of stacking three. Only `toast`
// is blocked: importing `Toaster` from sonner is fine. src/lib/toast.ts is the
// one file allowed it, with a disable comment on that line.
// See `docs/rules/05-mutations-and-toasts.md`.
const SONNER_TOAST = {
  name: "sonner",
  importNames: ["toast"],
  message:
    "Use notify from @/lib/toast. It sets the durations and stops a retried save from stacking identical errors. Errors in a mutation's onError are notify.fromError(err, \"Could not …\").",
};

// One look, one icon set, one component kit. Radix is only ever reached
// through components/ui, and fonts are loaded once, in the root layout.
const FOREIGN_UI_PATTERNS = [
  { group: ["react-icons", "react-icons/*", "@heroicons/*", "@tabler/*", "@phosphor-icons/*", "@fortawesome/*"], message: "Icons are lucide-react only." },
  { group: ["@mui/*", "antd", "antd/*", "@chakra-ui/*", "@mantine/*", "styled-components", "@emotion/*"], message: "This app has one component kit: components/ui (shadcn on Radix). See docs/rules/10-styling.md." },
  { group: ["@radix-ui/*"], message: "Radix is reached only through components/ui. Use the part there, or add one to components/ui first." },
];
const ONLY_IN_UI = [
  { name: "radix-ui", message: "Radix is reached only through components/ui. Use the part there, or add one to components/ui first." },
  { name: "next/font/google", message: "Fonts are loaded once, in src/app/layout.tsx." },
  { name: "next/font/local", message: "Fonts are loaded once, in src/app/layout.tsx." },
];

// Where the part and size rules do not apply. The parts themselves are built
// from raw elements and their own sizes: components/shared and
// components/data-view (components/ui and components/layout are exempt from
// more, below). They still may not use raw colours. Tests render raw inputs to
// test Field. The global error page replaces the whole document, so the app's
// classes and fonts are not there to use.
const PART_RULE_EXCEPTIONS = [
  "src/components/shared/**",
  "src/components/data-view/**",
  "src/**/*.test.{ts,tsx}",
  "src/app/global-error.tsx",
];

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
    // The date/number, size, colour and part rules share ONE rule
    // name, and in flat config a later `no-restricted-syntax` entry *replaces*
    // an earlier one rather than merging. So every block below builds its list
    // from the constants above, and none may be edited by hand to add a
    // selector: add it to a constant instead, or a block silently loses it.
    files: ["src/**/*.{ts,tsx}"],
    ignores: [
      "src/lib/date-utils.ts",
      "src/lib/numeric/**",
      "src/components/ui/**",
      "src/components/layout/**",
      ...PART_RULE_EXCEPTIONS,
    ],
    rules: {
      "no-restricted-syntax": ["error", ...DATE_AND_NUMBER_RULES, ...SIZE_RULES, ...COLOUR_RULES, ...PART_RULES],
    },
  },
  {
    // The exceptions keep the date, number and colour rules.
    files: PART_RULE_EXCEPTIONS,
    ignores: ["src/components/ui/**", "src/components/layout/**"],
    rules: {
      "no-restricted-syntax": ["error", ...DATE_AND_NUMBER_RULES, ...COLOUR_RULES],
    },
  },
  {
    // components/ui and components/layout are where the design system itself is
    // built, so they may use made-up values. They still follow the date and
    // number rules.
    files: ["src/components/ui/**/*.{ts,tsx}", "src/components/layout/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-syntax": ["error", ...DATE_AND_NUMBER_RULES],
    },
  },
  {
    // Same "later replaces earlier" rule as above, for no-restricted-imports.
    files: ["src/**/*.{ts,tsx}"],
    ignores: ["src/components/ui/**", "src/app/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [SONNER_TOAST, ...ONLY_IN_UI], patterns: FOREIGN_UI_PATTERNS }],
    },
  },
  {
    files: ["src/components/ui/**/*.{ts,tsx}", "src/app/layout.tsx"],
    rules: {
      "no-restricted-imports": ["error", { paths: [SONNER_TOAST], patterns: FOREIGN_UI_PATTERNS }],
    },
  },
];

export default config;
