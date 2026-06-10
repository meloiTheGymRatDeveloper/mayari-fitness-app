const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const webMocks = {
  'react-native-linear-gradient': path.resolve(__dirname, 'mocks/LinearGradient.web.js'),
  'react-native-maps': path.resolve(__dirname, 'mocks/ReactNativeMaps.web.js'),
};

const originalResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web' && webMocks[moduleName]) {
    return { filePath: webMocks[moduleName], type: 'sourceFile' };
  }
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
