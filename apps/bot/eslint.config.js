const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  {
    languageOptions: {
      ecmaVersion: 2021,
      sourceType: "module",
      globals: {
        // Node.js global variables
        process: "readonly",
        __dirname: "readonly",
        __filename: "readonly",
        exports: "readonly",
        require: "readonly",
        module: "readonly",
        Buffer: "readonly",
        global: "readonly",
        console: "readonly",      // <-- ADD THIS
        setTimeout: "readonly",   // <-- ADD THIS
        clearTimeout: "readonly", // <-- OPTIONAL
        setInterval: "readonly",  // <-- OPTIONAL
        clearInterval: "readonly",// <-- OPTIONAL
      },
    },
    ignores: ['node_modules/**'],
    rules: {
      // Your custom rules
    },
  },
];
