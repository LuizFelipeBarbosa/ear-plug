module.exports = {
  root: true,
  extends: ["expo"],
  settings: {
    "import/resolver": {
      typescript: {
        project: "./tsconfig.json",
      },
      node: {
        extensions: [".js", ".jsx", ".ts", ".tsx"],
      },
    },
  },
  ignorePatterns: [".expo/*", "dist/*", "node_modules/*"],
  overrides: [
    {
      files: ["*.config.js", "metro.config.js"],
      env: {
        node: true,
      },
    },
  ],
};
