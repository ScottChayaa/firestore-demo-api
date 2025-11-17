#!/usr/bin/env node

/**
 * 統一索引收集腳本
 *
 * 功能：
 * 1. 一次收集所有 collection 的索引資訊（products, orders）
 * 2. 合併結果到單一檔案 missing-indexes.json
 * 3. 提供完整的索引缺失報告
 *
 * 使用方式：
 *   node scripts/collectAllIndexes.js
 *
 * 輸出格式（單一檔案，分區塊）：
 * {
 *   "generatedAt": "...",
 *   "summary": { "totalCollections": 2, ... },
 *   "collections": {
 *     "products": { ... },
 *     "orders": { ... }
 *   }
 * }
 */

const path = require("path");
const fs = require("fs");
const { Timestamp } = require("../src/config/firebase");

// 引用查詢配置
const { validQueryCombinations: productQueries } = require("../tests/queries/productQueryConfigurations");
const { validQueryCombinations: orderQueries } = require("../tests/queries/orderQueryConfigurations");

// 引用共用邏輯
const { collectIndexes, generateReport } = require("./utils/indexCollector");

/**
 * 商品查詢建構函數（與 collectProductIndexes.js 相同）
 */
function buildProductQuery(query, params) {
  const { category, minPrice, maxPrice, orderBy = "createdAt", order = "desc" } = params;

  if (category) {
    query = query.where("category", "==", category);
  }

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

  const orderDirection = order === "asc" ? "asc" : "desc";
  if (orderBy === "price") {
    query = query.orderBy("price", orderDirection);
  } else {
    query = query.orderBy("createdAt", orderDirection);
  }

  return query;
}

/**
 * 訂單查詢建構函數（與 collectOrderIndexes.js 相同）
 */
function buildOrderQuery(query, params) {
  const { memberId, status, startDate, endDate, minAmount, maxAmount, orderBy = "createdAt", order = "desc" } = params;

  if (memberId) {
    query = query.where("memberId", "==", memberId);
  }

  if (status) {
    query = query.where("status", "==", status);
  }

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
  console.log("===========================================");
  console.log("開始收集所有 Collection 的索引資訊");
  console.log("===========================================\n");

  // 收集 Products 索引
  console.log("📦 收集 Products 索引...\n");
  const productsData = await collectIndexes(productQueries, "products", buildProductQuery);
  const productsReport = generateReport(productsData, "products");

  // 收集 Orders 索引
  console.log("📦 收集 Orders 索引...\n");
  const ordersData = await collectIndexes(orderQueries, "orders", buildOrderQuery);
  const ordersReport = generateReport(ordersData, "orders");

  // 合併報告
  const totalIndexesNeeded = productsReport.summary.indexesNeeded + ordersReport.summary.indexesNeeded;
  const totalQueries = productsReport.summary.totalQueries + ordersReport.summary.totalQueries;
  const totalSuccessful = productsReport.summary.successfulQueries + ordersReport.summary.successfulQueries;
  const totalFailed = productsReport.summary.failedQueries + ordersReport.summary.failedQueries;

  const combinedReport = {
    generatedAt: new Date().toISOString(),
    summary: {
      totalCollections: 2,
      totalQueries: totalQueries,
      totalSuccessful: totalSuccessful,
      totalFailed: totalFailed,
      totalIndexesNeeded: totalIndexesNeeded,
      byCollection: {
        products: {
          queries: productsReport.summary.totalQueries,
          indexesNeeded: productsReport.summary.indexesNeeded,
        },
        orders: {
          queries: ordersReport.summary.totalQueries,
          indexesNeeded: ordersReport.summary.indexesNeeded,
        },
      },
    },
    collections: {
      products: {
        summary: productsReport.summary,
        missingIndexes: productsReport.missingIndexes,
      },
      orders: {
        summary: ordersReport.summary,
        missingIndexes: ordersReport.missingIndexes,
      },
    },
    instructions: [
      "請根據以下資訊建立缺失的索引：",
      "1. 點擊 Firestore 錯誤訊息中提供的連結，自動建立索引",
      "2. 或手動在 Firebase Console 中建立索引",
      "3. 建立完成後，執行 firebase firestore:indexes > firestore.indexes.json",
      "4. 或使用 npm run update:indexes 自動更新索引配置檔",
    ],
  };

  // 儲存合併報告
  const outputPath = path.join(__dirname, "..", "missing-indexes.json");
  fs.writeFileSync(outputPath, JSON.stringify(combinedReport, null, 2));
  console.log(`✅ 合併報告已儲存至: ${outputPath}\n`);

  // 顯示總結
  console.log("===========================================");
  console.log("總體統計");
  console.log("===========================================");
  console.log(`總 Collection 數: ${combinedReport.summary.totalCollections}`);
  console.log(`總查詢數: ${totalQueries}`);
  console.log(`成功: ${totalSuccessful}`);
  console.log(`失敗: ${totalFailed}`);
  console.log(`需要建立索引: ${totalIndexesNeeded}`);
  console.log("===========================================\n");

  if (totalIndexesNeeded > 0) {
    console.log("⚠️  發現缺失的索引！");
    console.log("請執行以下步驟：");
    console.log("  1. 查看 missing-indexes.json 了解詳情");
    console.log("  2. 點擊錯誤訊息中的連結建立索引");
    console.log("  3. 執行 npm run update:indexes 更新索引配置檔\n");
    process.exit(1);
  } else {
    console.log("✅ 所有 Collection 的查詢都有對應的索引！\n");
    process.exit(0);
  }
}

// 執行主函數
main().catch((error) => {
  console.error("執行失敗:", error);
  process.exit(1);
});
