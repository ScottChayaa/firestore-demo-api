module.exports = {
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.js'],
  coveragePathIgnorePatterns: ['/node_modules/'],
  testTimeout: 30000,

  // 將 @/ 別名映射到 src/ 目錄
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1'
  },

  // 全域設定和清理（用於收集索引資訊）
  globalSetup: '<rootDir>/tests/setup/globalSetup.js',
  globalTeardown: '<rootDir>/tests/setup/globalTeardown.js',

  // 測試環境設定：預先載入 Firebase 和 Firestore warmup
  setupFilesAfterEnv: ['<rootDir>/tests/setup/setupAfterEnv.js']
};
