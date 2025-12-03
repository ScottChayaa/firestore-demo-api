const request = require("supertest");
const app = require("../../src/app");

// 引用共用的查詢組合配置（單一來源）
const { validQueryCombinations } = require("./productQueryConfigurations");

// 引用索引收集工具
const { handleQueryTestResult } = require("../helpers/collectIndexesFromTests");

/**
 * 商品查詢測試
 *
 * 目的：
 * 1. 測試所有查詢組合，確保 API 正常運作
 * 2. 在測試過程中自動收集缺少的 Firestore 索引
 * 3. 測試結束後自動匯出至 missing-indexes.json
 *
 * 重要：
 * - 這些測試完全共用 productController.js 的查詢邏輯
 * - 查詢組合定義在 queryConfigurations.js（單一來源）
 * - 不需要重複維護查詢程式碼！
 * - 替代了舊的 scripts/collectProductIndexes.js
 */

// ===========================================
// 測試套件
// ===========================================

describe("Product Queries", () => {
  test.each(validQueryCombinations)("$name", async ({ name, params, description }) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/public/products${queryString ? "?" + queryString : ""}`;

    console.log(`\n測試: ${name}`);
    console.log(`描述: ${description}`);
    console.log(`URL: ${url}`);

    const res = await request(app).get(url);

    // 使用統一的結果處理函數（會自動收集索引錯誤）
    const { shouldPass, isIndexError } = handleQueryTestResult({
      collection: 'products',
      queryName: name,
      queryParams: params,
      url,
      response: res,
    });

    // 如果是索引錯誤，測試仍然通過（因為這正是我們要收集的）
    if (shouldPass) {
      expect(res.status).toBe(200);
      if (!isIndexError) {
        expect(res.body.data).toBeDefined();
        expect(Array.isArray(res.body.data)).toBe(true);
        expect(res.body.pagination).toBeDefined();
      }
    } else {
      // 非索引錯誤才導致測試失敗
      expect(res.status).toBe(200);
    }
  });
});

// ===========================================
// 統計資訊
// ===========================================

describe("Query Combinations Summary", () => {
  test("顯示查詢組合統計", () => {
    console.log("\n===========================================");
    console.log("查詢組合統計");
    console.log("===========================================");
    console.log(`查詢組合總數: ${validQueryCombinations.length} 種`);
    console.log("===========================================\n");

    // 此測試永遠通過，只是用來顯示統計資訊
    expect(true).toBe(true);
  });
});
