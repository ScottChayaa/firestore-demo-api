/**
 * Jest 全域清理 - 測試結束後執行
 *
 * 功能：
 * 1. 收集所有測試中發現的索引錯誤
 * 2. 匯出至 missing-indexes.json（覆蓋模式）
 * 3. 替代 scripts/collect*.js 系列腳本的功能
 */

const fs = require('fs');
const path = require('path');

module.exports = async () => {
  const indexErrors = global.__INDEX_ERRORS__ || [];

  // 依 collection 分類整理
  const collections = {};

  indexErrors.forEach(error => {
    const collectionName = error.collection;
    if (!collections[collectionName]) {
      collections[collectionName] = {
        summary: {
          totalQueries: 0,
          successfulQueries: 0,
          failedQueries: 0,
          indexesNeeded: 0,
        },
        missingIndexes: [],
      };
    }

    collections[collectionName].summary.totalQueries++;
    collections[collectionName].summary.failedQueries++;
    collections[collectionName].summary.indexesNeeded++;

    collections[collectionName].missingIndexes.push({
      queryName: error.queryName,
      params: error.params,
      errorMessage: error.errorMessage,
      url: error.url,
    });
  });

  // 計算總計
  const summary = {
    totalCollections: Object.keys(collections).length,
    totalQueries: 0,
    totalSuccessful: 0,
    totalFailed: indexErrors.length,
    totalIndexesNeeded: indexErrors.length,
    byCollection: {},
  };

  Object.entries(collections).forEach(([name, data]) => {
    summary.totalQueries += data.summary.totalQueries;
    summary.totalSuccessful += data.summary.successfulQueries;
    summary.byCollection[name] = {
      queries: data.summary.totalQueries,
      indexesNeeded: data.summary.indexesNeeded,
    };
  });

  // 建立報告
  const report = {
    generatedAt: new Date().toISOString(),
    summary,
    collections,
    instructions: [
      '請根據以下資訊建立缺失的索引：',
      '1. 點擊 Firestore 錯誤訊息中提供的連結，自動建立索引',
      '2. 或手動在 Firebase Console 中建立索引',
      '3. 建立完成後，執行 firebase firestore:indexes > firestore.indexes.json',
      '4. 或使用 npm run update:indexes 自動更新索引配置檔',
    ],
  };

  // 匯出至 missing-indexes.json（覆蓋模式）
  const outputPath = path.join(process.cwd(), 'missing-indexes.json');
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

  // 顯示統計資訊
  console.log('\n===========================================');
  console.log('Firestore 索引收集結果');
  console.log('===========================================');
  console.log(`總 Collection 數: ${summary.totalCollections}`);
  console.log(`總查詢數: ${summary.totalQueries}`);
  console.log(`失敗（需要索引）: ${summary.totalFailed}`);
  console.log(`已儲存至: ${outputPath}`);
  console.log('===========================================\n');

  if (indexErrors.length > 0) {
    console.log('⚠️  發現缺失的索引！');
    console.log('請執行以下步驟：');
    console.log('  1. 查看 missing-indexes.json 了解詳情');
    console.log('  2. 點擊錯誤訊息中的連結建立索引');
    console.log('  3. 執行 npm run update:indexes 更新索引配置檔\n');
  } else {
    console.log('✅ 所有查詢都有對應的索引！\n');
  }
};
