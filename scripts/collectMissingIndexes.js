#!/usr/bin/env node

/**
 * Firestore 缺失索引收集腳本（方案 B）
 *
 * 功能：
 * 1. 執行所有可能的商品查詢組合
 * 2. 捕獲 Firestore 索引錯誤
 * 3. 解析錯誤訊息，提取索引定義
 * 4. 儲存到 missing-indexes.json
 *
 * 使用方式：
 *   node scripts/collectMissingIndexes.js
 *
 * 重要：
 * - 查詢組合定義在 tests/queries/queryConfigurations.js（單一來源）
 * - 此腳本直接查詢 Firestore 以捕獲索引錯誤
 * - 不需要重複維護查詢程式碼！
 */

const { db } = require("../src/config/firebase");
const fs = require("fs");
const path = require("path");

// 引用共用的查詢組合配置（單一來源）
const { validQueryCombinations } = require("../tests/queries/queryConfigurations");

// 商品集合名稱
const COLLECTION_NAME = "products";

/**
 * 執行單一查詢並檢查是否需要索引
 *
 * 注意：config 格式來自 queryConfigurations.js
 * { name, params: { category, minPrice, maxPrice, orderBy, order }, description }
 */
async function testQuery(config) {
  const { name, params } = config;
  const collection = db.collection(COLLECTION_NAME);

  console.log(`測試查詢: ${name}`);

  try {
    let query = collection;

    // 從 params 中提取查詢條件
    const { category, minPrice, maxPrice, orderBy = "createdAt", order = "desc" } = params;

    // 應用篩選條件
    if (category) {
      query = query.where("category", "==", category);
    }
    if (minPrice) {
      query = query.where("price", ">=", minPrice);
    }
    if (maxPrice) {
      query = query.where("price", "<=", maxPrice);
    }

    // 應用排序
    query = query.orderBy(orderBy, order);

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
 * 主函數
 */
async function main() {
  console.log("===========================================");
  console.log("Firestore 索引檢查開始");
  console.log("===========================================\n");

  const results = [];
  const missingIndexes = [];

  // 執行所有查詢（使用共用配置）
  for (const config of validQueryCombinations) {
    const result = await testQuery(config);
    results.push(result);

    if (!result.success && result.needsIndex) {
      missingIndexes.push({
        queryName: config.name,
        params: config.params,
        errorMessage: result.error,
      });
    }
  }

  // 統計結果
  const successCount = results.filter((r) => r.success).length;
  const failCount = results.filter((r) => !r.success).length;
  const indexNeededCount = missingIndexes.length;

  console.log("===========================================");
  console.log("測試結果統計");
  console.log("===========================================");
  console.log(`總查詢數: ${results.length}`);
  console.log(`成功: ${successCount}`);
  console.log(`失敗: ${failCount}`);
  console.log(`需要建立索引: ${indexNeededCount}`);
  console.log("===========================================\n");

  // 儲存缺失的索引資訊
  const outputPath = path.join(__dirname, "..", "missing-indexes.json");

  const output = {
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

  fs.writeFileSync(outputPath, JSON.stringify(output, null, 2));

  console.log(`✅ 缺失索引資訊已儲存至: ${outputPath}\n`);

  if (indexNeededCount > 0) {
    console.log("⚠️  發現缺失的索引！");
    console.log("請執行以下步驟：");
    console.log("  1. 查看 missing-indexes.json 了解詳情");
    console.log("  2. 點擊錯誤訊息中的連結建立索引");
    console.log("  3. 執行 npm run update:indexes 更新索引配置檔\n");
    process.exit(1); // 以錯誤碼退出，表示需要建立索引
  } else {
    console.log("✅ 所有查詢都有對應的索引！\n");
    process.exit(0);
  }
}

// 執行主函數
main().catch((error) => {
  console.error("執行失敗:", error);
  process.exit(1);
});
