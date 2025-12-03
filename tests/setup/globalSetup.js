/**
 * Jest 全域設定 - 測試開始前執行
 *
 * 功能：
 * 1. 初始化全域變數來收集測試中的索引錯誤
 * 2. 用於替代 scripts/collect*.js 系列腳本
 */

module.exports = async () => {
  // 初始化全域收集器
  global.__INDEX_ERRORS__ = [];
  console.log('\n🔍 開始收集 Firestore 索引資訊...\n');
};
