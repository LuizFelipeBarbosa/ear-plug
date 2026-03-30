const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const path = require("path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// Watch all files in the monorepo
config.watchFolders = [workspaceRoot];

// Let Metro know where to resolve packages
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];

// pnpm keeps workspace dependencies behind symlinks. Be explicit for Metro so
// scoped packages used from app source always resolve from the mobile app.
config.resolver.unstable_enableSymlinks = true;
config.resolver.extraNodeModules = {
  ...(config.resolver.extraNodeModules || {}),
  "@clerk/clerk-expo": path.resolve(projectRoot, "node_modules/@clerk/clerk-expo"),
};

// Keep Metro's default hierarchical resolution so pnpm transitive
// dependencies remain reachable from symlinked workspace packages.

module.exports = withNativeWind(config, { input: "./global.css" });
