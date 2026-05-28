module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/lib/__tests__/**/*.test.ts'],
  transform: {
    '^.+\\.[jt]sx?$': ['ts-jest', {
      tsconfig: {
        jsx: 'react-jsx',
      },
    }],
  },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/$1',
    '^react-native-svg$': '<rootDir>/lib/__mocks__/react-native-svg.ts',
    '^react-native-reanimated$': '<rootDir>/lib/__mocks__/react-native-reanimated.ts',
    '^react-native$': '<rootDir>/lib/__mocks__/react-native.ts',
  },
};
