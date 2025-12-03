module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,

  // 將 @/ 別名映射到 src/ 目錄
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }
};
