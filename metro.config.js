// Learn more https://docs.expo.io/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(__dirname);

// --- ADD THIS SECTION ---
// This tells Expo to include TensorFlow model weight files (.bin) in your app bundle
config.resolver.assetExts.push('bin');
// ------------------------

module.exports = config;