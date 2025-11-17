#!/usr/bin/env node

/**
 * 訂單索引收集腳本
 *
 * 功能：
 * 1. 執行所有訂單查詢組合
 * 2. 捕獲 Firestore 索引錯誤
 * 3. 儲存到 missing-order-indexes.json
 *
 * 使用方式：
 *   node scripts/collectOrderIndexes.js
 *
 * 重要：
 * - 查詢組合定義在 tests/queries/orderQueryConfigurations.js（單一來源）
 * - 使用共用的 indexCollector 邏輯
 */

const path = require("path");
const { Timestamp } = require("../src/config/firebase");
const { validQueryCombinations } = require("../tests/queries/orderQueryConfigurations");
const { collectIndexes, generateReport, saveReport, showNextSteps } = require("./utils/indexCollector");

const COLLECTION_NAME = "orders";

/**
 * 訂單查詢建構函數
 *
 * 將查詢參數轉換為 Firestore 查詢
 * 此邏輯需與 orderController.js 保持一致
 *
 * @param {Query} query - Firestore Query 物件
 * @param {Object} params - 查詢參數
 * @returns {Query} 建構好的查詢
 */
function buildOrderQuery(query, params) {
  const { memberId, status, startDate, endDate, minAmount, maxAmount, orderBy = "createdAt", order = "desc" } = params;

  // 篩選：會員 ID
  if (memberId) {
    query = query.where("memberId", "==", memberId);
  }

  // 篩選：訂單狀態
  if (status) {
    query = query.where("status", "==", status);
  }

  // 篩選：日期範圍
  if (startDate) {
    const date = new Date(startDate);
    if (!isNaN(date.getTime())) {
      query = query.where("createdAt", ">=", Timestamp.fromDate(date));
    }
  }
  if (endDate) {
    const date = new Date(endDate);
    if (!isNaN(date.getTime())) {
      query = query.where("createdAt", "<=", Timestamp.fromDate(date));
    }
  }

  // 篩選：金額範圍
  if (minAmount) {
    const min = parseFloat(minAmount);
    if (!isNaN(min)) {
      query = query.where("totalAmount", ">=", min);
    }
  }
  if (maxAmount) {
    const max = parseFloat(maxAmount);
    if (!isNaN(max)) {
      query = query.where("totalAmount", "<=", max);
    }
  }

  // 排序
  const orderDirection = order === "asc" ? "asc" : "desc";
  if (orderBy === "totalAmount") {
    query = query.orderBy("totalAmount", orderDirection);
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
  const { results, missingIndexes } = await collectIndexes(validQueryCombinations, COLLECTION_NAME, buildOrderQuery);

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
