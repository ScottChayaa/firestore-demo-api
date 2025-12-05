module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,

  // 將 @/ 別名映射到 src/ 目錄
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  }

  // 注意：setup 相關配置已移除
  // 索引收集功能現已整合到 queryAndCollectIndexes.test.js 中
  // 該測試檔案是自包含的，包含完整的生命週期管理
};
