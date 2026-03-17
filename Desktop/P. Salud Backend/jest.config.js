/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'jsdom',
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
    'node_modules/(?!(@adminjs|@babel|@testing-library|styled-components|@paralleldrive|d3-|react-d3-tree)/)',
  ],
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  moduleNameMapper: {
    '\\.(css|less|scss|sass)$': 'identity-obj-proxy',
    '^react-d3-tree$': '<rootDir>/tests/__mocks__/react-d3-tree.js',
    '^d3-.*': '<rootDir>/tests/__mocks__/d3-mock.js',
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
