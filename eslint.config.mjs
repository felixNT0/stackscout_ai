import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import { defineConfig, globalIgnores } from "eslint/config";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    rules: {
      // Stylistic: apostrophes in marketing copy are valid JSX text.
      "react/no-unescaped-entities": "off",
      // `any` is still flagged as a warning, not a hard error.
      "@typescript-eslint/no-explicit-any": "warn",
      // These React Compiler lints flag idiomatic fetch-on-mount data loading
      // (setState inside async callbacks triggered by effects). Revisit when the
      // rule matures; current usage follows the standard pattern.
      "react-hooks/set-state-in-effect": "off",
      "react-hooks/purity": "off",
    },
  },
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
]);

export default eslintConfig;
