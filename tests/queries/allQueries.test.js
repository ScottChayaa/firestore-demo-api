/**
 * 統一的查詢測試檔案
 *
 * 功能：
 * - 測試所有 collection 的查詢組合
 * - 自動收集缺失的 Firestore 索引
 * - 支援公開和私有 API
 *
 * 新增 collection：
 * 只需在 QUERY_CONFIGS 中新增配置即可
 */

const request = require("supertest");
const app = require("../../src/app");
const { handleQueryTestResult } = require("../helpers/collectIndexesFromTests");
const { getAdminToken } = require("../helpers/authHelper");

// ===========================================
// 查詢配置（Single Source of Truth）
// ===========================================

const QUERY_CONFIGS = [
  {
    name: "訂單查詢測試",
    collectionName: "orders",
    endpoint: "/api/admin/orders",
    requiresAuth: true,
    validQueryCombinations: require("./orderQueryConfigurations").validQueryCombinations,
    paramClassification: require("./orderQueryConfigurations").paramClassification,
  },
  {
    name: "會員查詢測試",
    collectionName: "members",
    endpoint: "/api/admin/members",
    requiresAuth: true,
    validQueryCombinations: require("./memberQueryConfigurations").validQueryCombinations,
    paramClassification: require("./memberQueryConfigurations").paramClassification,
  },
  {
    name: "商品查詢測試",
    collectionName: "products",
    endpoint: "/api/public/products",
    requiresAuth: false,
    validQueryCombinations: require("./productQueryConfigurations").validQueryCombinations,
    paramClassification: require("./productQueryConfigurations").paramClassification,
  },
  {
    name: "管理員查詢測試",
    collectionName: "admins",
    endpoint: "/api/admin/admins",
    requiresAuth: true,
    validQueryCombinations: require("./adminQueryConfigurations").validQueryCombinations,
    paramClassification: require("./adminQueryConfigurations").paramClassification,
  },
];

// ===========================================
// 通用測試執行器
// ===========================================

// 全域 token（所有需要驗證的測試共用）
let globalAdminToken;

beforeAll(async () => {
  // 只取得一次 token，供所有測試使用
  const needsAuth = QUERY_CONFIGS.some(config => config.requiresAuth);
  if (needsAuth) {
    globalAdminToken = await getAdminToken();
  }
});

// 為每個 collection 建立測試套件
QUERY_CONFIGS.forEach(config => {
  describe(config.name, () => {
    // 參數化測試：測試該 collection 的所有查詢組合
    test.each(config.validQueryCombinations)(
      "$name",
      async ({ name, params }) => {
        // 1. 建立查詢字串
        const queryString = new URLSearchParams(params).toString();
        const url = `${config.endpoint}?limit=1&${queryString}`;

        console.log(`\n測試: ${name}`);
        console.log(`URL: ${url}`);

        // 2. 建立請求
        let req = request(app).get(url);

        // 3. 如果需要驗證，加上 Authorization header
        if (config.requiresAuth) {
          req = req.set("Authorization", `Bearer ${globalAdminToken}`);
        }

        // 4. 執行請求
        const res = await req;

        // 5. 處理結果（包含索引錯誤收集）
        const { shouldPass, isIndexError } = handleQueryTestResult({
          collection: config.collectionName,
          queryName: name,
          queryParams: params,
          paramClassification: config.paramClassification,
          url,
          response: res,
        });

        // 6. 驗證結果
        if (shouldPass) {
          expect(res.status).toBe(200);
          if (!isIndexError) {
            expect(res.body.data).toBeDefined();
            expect(Array.isArray(res.body.data)).toBe(true);
            expect(res.body.pagination).toBeDefined();
          }
        } else {
          // 非索引錯誤，測試應該失敗
          expect(res.status).toBe(200);
        }
      }
    );

    // 顯示該 collection 的統計資訊
    describe(`${config.collectionName} 查詢組合統計`, () => {
      test("顯示查詢組合統計", () => {
        console.log(`\n===========================================`);
        console.log(`${config.name}組合統計`);
        console.log(`===========================================`);
        console.log(`查詢組合總數: ${config.validQueryCombinations.length} 種`);
        console.log(`===========================================\n`);
        expect(true).toBe(true);
      });
    });
  });
});
