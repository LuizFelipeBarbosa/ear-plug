module.exports = {
  root: true,
  extends: ["expo"],
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
