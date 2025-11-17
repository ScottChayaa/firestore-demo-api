/**
 * Firestore 索引收集器 - 共用核心邏輯
 *
 * 提供通用的索引收集功能，讓不同的 collection 可以共用
 *
 * 設計理念：
 * - 將查詢邏輯抽象化為 queryBuilder 函數
 * - 提供標準化的測試、收集、報告功能
 * - 單一職責：只負責索引收集，不涉及業務邏輯
 */

const { db } = require("../../src/config/firebase");
const fs = require("fs");
const path = require("path");

/**
 * 執行單一查詢並檢查是否需要索引
 *
 * @param {Object} config - 查詢配置 { name, params }
 * @param {string} collectionName - Firestore collection 名稱
 * @param {Function} queryBuilder - 查詢建構函數 (query, params) => query
 * @returns {Promise<Object>} 測試結果
 */
async function testQuery(config, collectionName, queryBuilder) {
  const { name, params } = config;
  const collection = db.collection(collectionName);

  console.log(`測試查詢: ${name}`);

  try {
    // 使用注入的 queryBuilder 建構查詢
    let query = collection;
    query = queryBuilder(query, params);

    // 限制結果數量（只是測試，不需要取得所有資料）
    query = query.limit(1);

    // 執行查詢
    await query.get();

    console.log(`  ✅ 查詢成功\n`);
    return { success: true, config };
  } catch (error) {
    console.log(`  ❌ 查詢失敗: ${error.message}\n`);

    // 檢查是否為索引錯誤
    if (error.code === 9 || error.message.includes("index")) {
      return {
        success: false,
        config,
        error: error.message,
        needsIndex: true,
      };
    }

    return {
      success: false,
      config,
      error: error.message,
      needsIndex: false,
    };
  }
}

/**
 * 收集所有查詢的索引資訊
 *
 * @param {Array} queryConfigurations - 查詢組合陣列
 * @param {string} collectionName - Firestore collection 名稱
 * @param {Function} queryBuilder - 查詢建構函數
 * @returns {Promise<Object>} { results, missingIndexes }
 */
async function collectIndexes(queryConfigurations, collectionName, queryBuilder) {
  console.log("===========================================");
  console.log(`Firestore 索引檢查開始 - ${collectionName}`);
  console.log("===========================================\n");

  const results = [];
  const missingIndexes = [];

  // 執行所有查詢
  for (const config of queryConfigurations) {
    const result = await testQuery(config, collectionName, queryBuilder);
    results.push(result);

    if (!result.success && result.needsIndex) {
      missingIndexes.push({
        queryName: config.name,
        params: config.params,
        errorMessage: result.error,
      });
    }
  }

  return { results, missingIndexes };
}

/**
 * 生成索引報告
 *
 * @param {Object} data - { results, missingIndexes }
 * @param {string} collectionName - Collection 名稱
 * @returns {Object} 報告物件
 */
function generateReport(data, collectionName) {
  const { results, missingIndexes } = data;

  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const indexNeededCount = missingIndexes.length;

  console.log("===========================================");
  console.log(`測試結果統計 - ${collectionName}`);
  console.log("===========================================");
  console.log(`總查詢數: ${results.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`失敗: ${failCount}`);
  console.log(`需要建立索引: ${indexNeededCount}`);
  console.log("===========================================\n");

  return {
    collectionName,
    generatedAt: new Date().toISOString(),
    summary: {
      totalQueries: results.length,
      successfulQueries: successCount,
      failedQueries: failCount,
      indexesNeeded: indexNeededCount,
    },
    missingIndexes: missingIndexes,
    instructions: [
      "請根據以下資訊建立缺失的索引：",
      "1. 點擊 Firestore 錯誤訊息中提供的連結，自動建立索引",
      "2. 或手動在 Firebase Console 中建立索引",
      "3. 建立完成後，執行 firebase firestore:indexes > firestore.indexes.json",
      "4. 或使用 npm run update:indexes 自動更新索引配置檔",
    ],
  };
}

/**
 * 儲存報告到檔案
 *
 * @param {Object} report - 報告物件
 * @param {string} outputPath - 輸出檔案路徑
 */
function saveReport(report, outputPath) {
  fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
  console.log(`✅ 索引資訊已儲存至: ${outputPath}\n`);
}

/**
 * 顯示後續步驟提示
 *
 * @param {number} indexNeededCount - 需要建立的索引數量
 * @param {string} collectionName - Collection 名稱
 */
function showNextSteps(indexNeededCount, collectionName) {
  if (indexNeededCount > 0) {
    console.log("⚠️  發現缺失的索引！");
    console.log("請執行以下步驟：");
    console.log(`  1. 查看 missing-${collectionName}-indexes.json 了解詳情`);
    console.log("  2. 點擊錯誤訊息中的連結建立索引");
    console.log("  3. 執行 npm run update:indexes 更新索引配置檔\n");
    return false;
  } else {
    console.log(`✅ ${collectionName} 的所有查詢都有對應的索引！\n`);
    return true;
  }
}

module.exports = {
  testQuery,
  collectIndexes,
  generateReport,
  saveReport,
  showNextSteps,
};
