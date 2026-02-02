import { defineConfig } from "eslint/config";
import js from "@eslint/js";
import prettier from "eslint-plugin-prettier/recommended";
import globals from "globals";

export default defineConfig([
  js.configs.recommended,
  prettier,
  {
    files: ["**/*.{js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
    },
    rules: {
      "no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },
  { ignores: ["dist"] },
  {
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
  },
]);
