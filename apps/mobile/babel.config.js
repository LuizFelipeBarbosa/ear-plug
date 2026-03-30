module.exports = function (api) {
  api.cache(true);
  return {
    // NativeWind v4 works with the automatic JSX runtime via jsxImportSource.
    // Avoid the wrapper babel preset because it pulls in react-native-worklets,
    // which is only needed for Reanimated 4+ and breaks this Expo 51 setup.
    presets: [["babel-preset-expo", { jsxImportSource: "nativewind" }]],
    plugins: ["react-native-reanimated/plugin"],
  };
};
