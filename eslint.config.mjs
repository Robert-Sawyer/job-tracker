import js from "@eslint/js";
import tsEslint from "typescript-eslint";
import eslintConfigPrettier from "eslint-config-prettier";

export default tsEslint.config(
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/.next/**",
      "**/build/**",
      "**/src/generated/**"
    ],
  },

  {
    files: ["**/*.js", "**/*.mjs", "**/*.cjs"],
    extends: [js.configs.recommended],
  },

  {
    files: ["**/*.ts", "**/*.tsx"],
    extends: [
      js.configs.recommended,
      ...tsEslint.configs.recommended,
    ],
  },

  eslintConfigPrettier
);
