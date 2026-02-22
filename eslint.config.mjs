export default [
  {
    files: ["js/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: {
        window: "readonly",
        document: "readonly",
        localStorage: "readonly",
        requestAnimationFrame: "readonly",
        cancelAnimationFrame: "readonly",
        Audio: "readonly",
        CustomEvent: "readonly",
        Event: "readonly",
        setTimeout: "readonly",
        clearTimeout: "readonly",
        setInterval: "readonly",
        clearInterval: "readonly",
        performance: "readonly",
        navigator: "readonly",
        PIXI: "readonly",
      },
    },
    rules: {
      "no-unused-vars": ["warn", { args: "none", varsIgnorePattern: "^_" }],
      "no-unreachable": "warn",
      complexity: ["warn", 25],
      "max-lines-per-function": ["warn", { max: 220, skipBlankLines: true, skipComments: true }],
    },
  },
];
