const request = require("supertest");
const app = require("../../src/app");

// 引用共用的查詢組合配置（單一來源）
const { validQueryCombinations } = require("./queryConfigurations");

/**
 * 商品查詢測試
 *
 * 目的：
 * 1. 測試所有查詢組合，確保 API 正常運作
 * 2. 在測試過程中發現缺少的 Firestore 索引
 *
 * 重要：
 * - 這些測試完全共用 productController.js 的查詢邏輯
 * - 查詢組合定義在 queryConfigurations.js（單一來源）
 * - 不需要重複維護查詢程式碼！
 */

// ===========================================
// 測試套件
// ===========================================

describe("Product Queries", () => {
  test.each(validQueryCombinations)("$name", async ({ params, description }) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/public/products${queryString ? "?" + queryString : ""}`;

    console.log(`測試: ${description}`);
    console.log(`URL: ${url}`);

    const res = await request(app).get(url);

    // 如果測試失敗，顯示詳細錯誤資訊
    if (res.status !== 200) {
      console.error("查詢失敗:", {
        status: res.status,
        body: res.body,
        params: params,
      });

      // 檢查是否為 Firestore 索引錯誤
      if (res.body.error && res.body.error.includes("index")) {
        console.error("⚠️  缺少 Firestore 索引！");
        console.error("請執行: npm run collect:indexes");
      }
    }

    expect(res.status).toBe(200);
    expect(res.body.data).toBeDefined();
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.pagination).toBeDefined();
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
