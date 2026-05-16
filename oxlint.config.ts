import { defineConfig } from "oxlint";

export default defineConfig({
  plugins: ["import", "promise", "typescript", "unicorn", "oxc", "vitest"],
  jsPlugins: [
    { name: "solid", specifier: "eslint-plugin-solid" },
  ],
  categories: {
    correctness: "error",
    suspicious: "error",
  },
  options: {
    typeAware: true,
  },
  rules: {
    "import/no-named-export": "off",
    "import/group-exports": "off",
    "import/no-relative-parent-imports": "off",
    "import/prefer-default-export": "off",
    "import/no-named-as-default": "off",
    "import/no-unassigned-import": "off",
    "typescript/no-base-to-string": "off",
    "typescript/no-unsafe-type-assertion": "off",
    "typescript/no-unnecessary-type-assertion": "off",
    "typescript/no-unsafe-enum-comparison": "off",
    "unicorn/consistent-function-scoping": "off",
    "unicorn/prefer-add-event-listener": "off",

    // eslint-plugin-solid rules (SolidJS-specific)
    "solid/components-return-once": "error",
    "solid/event-handlers": "error",
    "solid/imports": "error",
    "solid/jsx-no-duplicate-props": "error",
    "solid/jsx-no-script-url": "error",
    "solid/jsx-no-undef": "error",
    "solid/jsx-uses-vars": "error",
    "solid/no-destructure": "error",
    "solid/no-innerhtml": "error",
    "solid/no-react-deps": "error",
    "solid/no-react-specific-props": "error",
    "solid/no-unknown-namespaces": "error",
    "solid/prefer-for": "error",
    "solid/reactivity": "error",
    "solid/self-closing-comp": "error",
    "solid/style-prop": "error",
    "solid/no-array-handlers": "warn",
    "solid/prefer-classlist": "warn",
  },
  env: {
    builtin: true,
    node: true,
  },
  overrides: [
    {
      files: ["apps/web/tests/**/*.test.ts"],
      env: {
        vitest: true,
      },
    },
  ],
});
