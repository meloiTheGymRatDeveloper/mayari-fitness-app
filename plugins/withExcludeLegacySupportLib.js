const { withAppBuildGradle } = require('@expo/config-plugins');

const withExcludeLegacySupportLib = (config) => {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;

    if (contents.includes("exclude group: 'com.android.support'")) {
      return config;
    }

    // Insert before the dependencies block so it applies to all configurations
    config.modResults.contents = contents.replace(
      /^(dependencies \{)/m,
      `configurations.all {
    exclude group: 'com.android.support'
}

$1`
    );

    return config;
  });
};

module.exports = withExcludeLegacySupportLib;
