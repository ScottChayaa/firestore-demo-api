#!/usr/bin/env node

/**
 * 商品索引收集腳本
 *
 * 功能：
 * 1. 執行所有商品查詢組合
 * 2. 捕獲 Firestore 索引錯誤
 * 3. 儲存到 missing-product-indexes.json
 *
 * 使用方式：
 *   node scripts/collectProductIndexes.js
 *
 * 重要：
 * - 查詢組合定義在 tests/queries/productQueryConfigurations.js（單一來源）
 * - 使用共用的 indexCollector 邏輯
 */

const path = require("path");
const { validQueryCombinations } = require("../tests/queries/productQueryConfigurations");
const { collectIndexes, generateReport, saveReport, showNextSteps } = require("./utils/indexCollector");

const COLLECTION_NAME = "products";

/**
 * 商品查詢建構函數
 *
 * 將查詢參數轉換為 Firestore 查詢
 * 此邏輯需與 productController.js 保持一致
 *
 * @param {Query} query - Firestore Query 物件
 * @param {Object} params - 查詢參數
 * @returns {Query} 建構好的查詢
 */
function buildProductQuery(query, params) {
  const { category, minPrice, maxPrice, orderBy = "createdAt", order = "desc" } = params;

  // 篩選：商品分類
  if (category) {
    query = query.where("category", "==", category);
  }

  // 篩選：價格範圍
  if (minPrice) {
    const min = parseFloat(minPrice);
    if (!isNaN(min)) {
      query = query.where("price", ">=", min);
    }
  }

  if (maxPrice) {
    const max = parseFloat(maxPrice);
    if (!isNaN(max)) {
      query = query.where("price", "<=", max);
    }
  }

  // 排序欄位 + 排序方向
  const orderDirection = order === "asc" ? "asc" : "desc";
  if (orderBy === "price") {
    query = query.orderBy("price", orderDirection);
  } else {
    query = query.orderBy("createdAt", orderDirection);
  }

  return query;
}

/**
 * 主函數
 */
async function main() {
  // 收集索引
  const { results, missingIndexes } = await collectIndexes(validQueryCombinations, COLLECTION_NAME, buildProductQuery);

  // 生成報告
  const report = generateReport({ results, missingIndexes }, COLLECTION_NAME);

  // 儲存報告
  const outputPath = path.join(__dirname, "..", `missing-${COLLECTION_NAME}-indexes.json`);
  saveReport(report, outputPath);

  // 顯示後續步驟
  const allPassed = showNextSteps(report.summary.indexesNeeded, COLLECTION_NAME);

  // 以錯誤碼退出，表示需要建立索引
  process.exit(allPassed ? 0 : 1);
}

// 執行主函數
main().catch((error) => {
  console.error("執行失敗:", error);
  process.exit(1);
});
