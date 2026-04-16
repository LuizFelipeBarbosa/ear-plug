import { dirname } from "node:path";
import { fileURLToPath } from "node:url";
import tsParser from "@typescript-eslint/parser";

const configDir = dirname(fileURLToPath(import.meta.url));

export default [
  {
    ignores: ["node_modules/**", "dist/**", "tsconfig.tsbuildinfo"],
  },
  {
    files: ["src/**/*.{ts,tsx}"],
    languageOptions: {
      parser: tsParser,
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: configDir,
        ecmaVersion: "latest",
        sourceType: "module",
      },
    },
  },
];
