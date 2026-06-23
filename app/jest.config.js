/** @type {import('jest').Config} */
module.exports = {
  // Backend tests use Node environment; React component tests override with @jest-environment jsdom
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.js', '<rootDir>/tests/test-setup.js'],
  testTimeout: 30000,
  transform: {
    '^.+\\.jsx?$': 'babel-jest',
    '^.+\\.tsx?$': [
      'ts-jest',
      { 
        tsconfig: '<rootDir>/tsconfig.json',
        isolatedModules: true,
      }
    ],
  },
  transformIgnorePatterns: [
    'node_modules/(?!(@babel|@testing-library|styled-components|@paralleldrive)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
  },
  collectCoverageFrom: [
    'src/**/*.{js,jsx,ts,tsx}',
    '!src/**/*.d.ts',
    '!src/**/index.js',
  ],
  testPathIgnorePatterns: [
    '<rootDir>/node_modules/',
  ],
};
