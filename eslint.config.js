import js from "@eslint/js";
import tseslint from "typescript-eslint";

export default tseslint.config(
  { ignores: ["node_modules", "coverage", "data", "reports", "dist", "*.cjs"] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      "@typescript-eslint/no-explicit-any": "error",
      "@typescript-eslint/consistent-type-imports": "error",
      "@typescript-eslint/no-unused-vars": ["error", { argsIgnorePattern: "^_" }],
      "no-console": ["error", { allow: ["error"] }],
      eqeqeq: "error",
    },
  },
  {
    // The composition root and server entrypoint may log at startup.
    files: ["src/main/**"],
    rules: { "no-console": "off" },
  },
  {
    // CLI scripts (checkers, scaffolders) are Node programs: console is their UI.
    files: ["scripts/**"],
    languageOptions: { globals: { console: "readonly", process: "readonly" } },
    rules: { "no-console": "off" },
  },
);
