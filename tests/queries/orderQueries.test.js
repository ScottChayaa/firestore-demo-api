const request = require("supertest");
const app = require("../../src/app");

// 引用共用的查詢組合配置（單一來源）
const { validQueryCombinations } = require("./orderQueryConfigurations");

/**
 * 訂單查詢測試
 *
 * 目的：
 * 1. 測試所有查詢組合，確保 API 正常運作
 * 2. 在測試過程中發現缺少的 Firestore 索引
 *
 * 重要：
 * - 這些測試完全共用 orderController.js 的查詢邏輯
 * - 查詢組合定義在 orderQueryConfigurations.js（單一來源）
 * - 不需要重複維護查詢程式碼！
 *
 * 注意：
 * - 訂單 API 路由: /api/orders
 * - 目前認證中間件已註解，所以測試不需要 token
 * - 若未來啟用認證，需修改測試加入 Authorization header
 */

// ===========================================
// 測試套件
// ===========================================

describe("Order Queries", () => {
  test.each(validQueryCombinations)("$name", async ({ params }) => {
    const queryString = new URLSearchParams(params).toString();
    const url = `/api/orders${queryString ? "?" + queryString : ""}`;

    console.log(`測試: $name`);
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
        console.error("請執行: npm run collect:indexes:orders");
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

describe("Order Query Combinations Summary", () => {
  test("顯示查詢組合統計", () => {
    console.log("\n===========================================");
    console.log("訂單查詢組合統計");
    console.log("===========================================");
    console.log(`查詢組合總數: ${validQueryCombinations.length} 種`);
    console.log("===========================================\n");

    // 此測試永遠通過，只是用來顯示統計資訊
    expect(true).toBe(true);
  });
});
