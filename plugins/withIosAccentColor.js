// Gives the iOS app a global accent color, as Latent Spaces' `AccentColor`
// asset does. On iOS 26 the text caret and selection follow the app's accent
// and ignore a field's own tint (React Native's `selectionColor`), so this is
// what turns every caret gold. Writes `AccentColor.colorset` into the app's
// asset catalog and points ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME at it.
//
// Options: { displayP3: [red, green, blue] } in 0...1.
const fs = require('fs');
const path = require('path');
const { withDangerousMod, withXcodeProject } = require('expo/config-plugins');

const ASSET_NAME = 'AccentColor';

const colorsetContents = ([red, green, blue]) => ({
  colors: [
    {
      color: {
        'color-space': 'display-p3',
        components: {
          alpha: '1.000',
          blue: blue.toFixed(3),
          green: green.toFixed(3),
          red: red.toFixed(3),
        },
      },
      idiom: 'universal',
    },
  ],
  info: { author: 'xcode', version: 1 },
});

const withAccentColorset = (config, displayP3) =>
  withDangerousMod(config, [
    'ios',
    (modConfig) => {
      const { platformProjectRoot, projectName } = modConfig.modRequest;
      const dir = path.join(
        platformProjectRoot,
        projectName,
        'Images.xcassets',
        `${ASSET_NAME}.colorset`
      );
      fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(
        path.join(dir, 'Contents.json'),
        `${JSON.stringify(colorsetContents(displayP3), null, 2)}\n`
      );
      return modConfig;
    },
  ]);

const withAccentBuildSetting = (config) =>
  withXcodeProject(config, (modConfig) => {
    const configurations =
      modConfig.modResults.pbxXCBuildConfigurationSection();
    for (const entry of Object.values(configurations)) {
      const settings = entry && entry.buildSettings;
      // The app target's configurations: the ones that name its icon.
      if (settings && settings.ASSETCATALOG_COMPILER_APPICON_NAME) {
        settings.ASSETCATALOG_COMPILER_GLOBAL_ACCENT_COLOR_NAME = ASSET_NAME;
      }
    }
    return modConfig;
  });

module.exports = (config, { displayP3 }) =>
  withAccentBuildSetting(withAccentColorset(config, displayP3));
