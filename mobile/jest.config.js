module.exports = {
  preset: 'jest-expo',
  // Jest 30 workers carry a much larger React Native 0.88 module graph than
  // Jest 29 did. At the default worker count they are killed for memory on a
  // 14 GB machine before any suite reports.
  maxWorkers: '50%',
  setupFiles: ['<rootDir>/jest.setup.js'],
  testMatch: ['**/__tests__/**/*.test.[jt]s?(x)'],
  transformIgnorePatterns: [
    'node_modules/(?!((jest-)?react-native|@react-native(-community)?)|expo(nent)?|@expo(nent)?/.*|@expo-google-fonts/.*|react-navigation|@react-navigation/.*|@unimodules/.*|unimodules|sentry-expo|native-base|react-native-svg|@ronradtke/react-native-markdown-display)',
  ],
  moduleNameMapper: {
    '^react$': '<rootDir>/node_modules/react',
    '^react/(.*)$': '<rootDir>/node_modules/react/$1',
  },
};

