const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Base SQLite des rues embarquée comme asset (assets/streets.db).
config.resolver.assetExts.push('db');

module.exports = config;
