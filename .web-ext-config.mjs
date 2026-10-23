export default {
  sourceDir: "dist",
  artifactsDir: "web-ext-artifacts",
  ignoreFiles: ["**/*.map", "**/*.ts"],
  build: {
    overwriteDest: true,
  },
};
