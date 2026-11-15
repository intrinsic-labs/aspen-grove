module.exports = function (api) {
  api.cache(true);
  return {
    // babel-preset-expo applies WatermelonDB's legacy decorators (its default
    // `decorators: { legacy: true }`), ordered after TypeScript stripping, and
    // adds the Worklets plugin Reanimated 4 needs. Don't add either here: a
    // project-level decorators plugin runs before the TypeScript strip and
    // fails on `field!: T` declarations.
    presets: ['babel-preset-expo'],
    plugins: [
      [
        'module-resolver',
        {
          alias: {
            '@': './src',
            '@domain': './src/domain',
            '@application': './src/application',
            '@infrastructure': './src/infrastructure',
            '@interface': './src/interface',
          },
        },
      ],
    ],
  };
};
