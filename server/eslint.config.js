import js from "@eslint/js";
import globals from "globals";

export default [
  { ignores: ["node_modules"] },
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: globals.node,
    },
    rules: {
      // Destructuring a field out alongside a rest sibling (the
      // strip-password_hash-before-it-leaves-the-service pattern) is a
      // deliberate omission, not a bug.
      "no-unused-vars": ["error", { ignoreRestSiblings: true }],
    },
  },
];
