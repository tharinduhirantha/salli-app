module.exports = {
  testEnvironment: 'node',
  transform: {
    '^.+\\.(ts|tsx|js|jsx)$': ['babel-jest', {
      configFile: false,
      presets: [
        'babel-preset-expo',
      ],
      caller: { name: 'jest', platform: 'ios' },
    }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/__tests__/**/*.test.ts', '**/__tests__/**/*.test.tsx'],
  transformIgnorePatterns: ['/node_modules/'],
  moduleNameMapper: {
    '@react-native-async-storage/async-storage': '<rootDir>/__mocks__/asyncStorage.js',
    'react-native-url-polyfill/auto': '<rootDir>/__mocks__/urlPolyfill.js',
  },
  collectCoverageFrom: [
    'src/utils/**/*.ts',
    'src/db/queries.ts',
    'src/screens/**/*.tsx',
    'src/context/**/*.tsx',
  ],
};
