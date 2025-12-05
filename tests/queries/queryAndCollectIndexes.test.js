/**
 * Firestore 索引收集測試
 *
 * 功能：
 * 1. 測試所有 collection 的查詢組合
 * 2. 自動收集缺失的索引錯誤
 * 3. 生成 missing-indexes.json 報告
 *
 * 這是一個自包含的測試模組，包含完整的生命週期管理
 *
 * 新增 collection：
 * 只需在 QUERY_CONFIGS 中新增配置即可
 */

const request = require("supertest");
const app = require("../../src/app");
const { handleQueryTestResult } = require("../helpers/collectIndexesFromTests");
const { getAdminToken } = require("../helpers/authHelper");
const fs = require('fs');
const path = require('path');

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
// 索引錯誤收集器（本地變數，不使用 global）
// ===========================================
let indexErrors = [];

// ===========================================
// 索引定義生成邏輯（從 globalTeardown.js 移入）
// ===========================================

/**
 * 轉換排序方向：asc/desc → ASCENDING/DESCENDING
 * @param {string} order - 排序方向 ('asc' 或 'desc')
 * @returns {string} Firestore 索引格式的排序方向
 */
function convertOrderDirection(order) {
  return order === 'asc' ? 'ASCENDING' : 'DESCENDING';
}

/**
 * 提取索引欄位
 * @param {Object} params - 查詢參數
 * @param {Object} paramClassification - 參數分類配置
 * @returns {Array} 索引欄位陣列
 */
function extractIndexFields(params, paramClassification) {
  const fields = [];
  const fieldSet = new Set(); // 用於去重

  // 預設值處理
  const orderByField = params.orderBy || 'createdAt';
  const orderDirection = params.order || 'desc';

  // Step 1: 收集等值查詢欄位
  paramClassification.equality.forEach(param => {
    if (params[param] !== undefined) {
      if (!fieldSet.has(param)) {
        fields.push({
          fieldPath: param,
          order: 'ASCENDING' // 等值欄位固定 ASCENDING
        });
        fieldSet.add(param);
      }
    }
  });

  // Step 2: 收集範圍查詢欄位
  Object.entries(paramClassification.range).forEach(([param, fieldName]) => {
    if (params[param] !== undefined) {
      // 範圍查詢欄位可能與排序欄位重複，先記錄
      if (!fieldSet.has(fieldName)) {
        // 如果範圍欄位與排序欄位相同，使用排序方向
        if (fieldName === orderByField) {
          fields.push({
            fieldPath: fieldName,
            order: convertOrderDirection(orderDirection)
          });
        } else {
          fields.push({
            fieldPath: fieldName,
            order: 'ASCENDING'
          });
        }
        fieldSet.add(fieldName);
      }
    }
  });

  // Step 3: 處理排序欄位
  if (!fieldSet.has(orderByField)) {
    fields.push({
      fieldPath: orderByField,
      order: convertOrderDirection(orderDirection)
    });
    fieldSet.add(orderByField);
  } else {
    // 如果排序欄位已存在（範圍查詢欄位），更新其 order
    const existingField = fields.find(f => f.fieldPath === orderByField);
    if (existingField) {
      existingField.order = convertOrderDirection(orderDirection);
    }
  }

  // Step 4: 添加 __name__ 欄位（固定最後）
  fields.push({
    fieldPath: '__name__',
    order: convertOrderDirection(orderDirection) // 與排序方向一致
  });

  return fields;
}

/**
 * 建立索引定義
 * @param {string} collectionName - Collection 名稱
 * @param {Object} params - 查詢參數
 * @param {Object} paramClassification - 參數分類配置
 * @returns {Object} Firestore 索引定義物件
 */
function buildIndexDefinition(collectionName, params, paramClassification) {
  return {
    collectionGroup: collectionName,
    queryScope: 'COLLECTION',
    fields: extractIndexFields(params, paramClassification),
    density: 'SPARSE_ALL'
  };
}

/**
 * 生成並寫入報告
 * @param {Array} errors - 索引錯誤陣列
 * @returns {Object} 報告物件
 */
function generateReport(errors) {
  // 依 collection 分類整理
  const collections = {};

  errors.forEach(error => {
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
      indexDefinition: buildIndexDefinition(error.collection, error.params, error.paramClassification),
    });
  });

  // 計算總計
  const summary = {
    totalCollections: Object.keys(collections).length,
    totalQueries: 0,
    totalSuccessful: 0,
    totalFailed: errors.length,
    totalIndexesNeeded: errors.length,
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
  return {
    generatedAt: new Date().toISOString(),
    summary,
    collections,
    instructions: [
      '請根據以下資訊建立缺失的索引：',
      '',
      '【方式一：直接複製索引定義（推薦）】',
      '1. 查看各查詢的 indexDefinition 欄位',
      '2. 複製 indexDefinition 物件',
      '3. 貼上到 firestore.indexes.json 的 indexes 陣列中',
      '4. 執行 firebase deploy --only firestore:indexes 部署索引',
      '',
      '【方式二：透過 Firebase Console】',
      '1. 點擊 errorMessage 中提供的連結',
      '2. 在 Firebase Console 中自動建立索引',
      '3. 建立完成後，執行 firebase firestore:indexes > firestore.indexes.json',
      '',
      '【方式三：使用自動更新腳本】',
      '1. 執行 npm run update:indexes',
      '2. 依照腳本指示操作',
    ],
  };
}

// ===========================================
// 通用測試執行器
// ===========================================

// 全域 token（所有需要驗證的測試共用）
let globalAdminToken;

beforeAll(async () => {
  // 1. 初始化索引錯誤收集器
  indexErrors = [];
  console.log('\n🔍 開始收集 Firestore 索引資訊...\n');

  // 2. 預先載入 Firebase 和 Express
  require('../../src/config/firebase');

  // 3. Firestore warmup（減少冷啟動延遲）
  const { warmupFirestore } = require('../../src/config/firebase');
  try {
    const originalValue = process.env.ENABLE_FIRESTORE_WARMUP;
    process.env.ENABLE_FIRESTORE_WARMUP = 'true';
    await warmupFirestore();
    if (originalValue !== undefined) {
      process.env.ENABLE_FIRESTORE_WARMUP = originalValue;
    } else {
      delete process.env.ENABLE_FIRESTORE_WARMUP;
    }
    console.log('✅ Firestore 連線預熱完成\n');
  } catch (error) {
    console.warn('⚠️  Firestore warmup failed (tests will continue):', error.message);
  }

  // 4. 取得認證 token（只取得一次，供所有測試使用）
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
        const { shouldPass, isIndexError, errorData } = handleQueryTestResult({
          collection: config.collectionName,
          queryName: name,
          queryParams: params,
          paramClassification: config.paramClassification,
          url,
          response: res,
        });

        // 6. 收集索引錯誤（不使用 global 變數）
        if (isIndexError && errorData) {
          indexErrors.push(errorData);
        }

        // 7. 驗證結果
        if (shouldPass) {
          if (isIndexError) {
            // 索引錯誤：狀態碼是 500，但我們視為成功（已收集）
            expect(res.status).toBe(500);
          } else {
            // 正常成功：狀態碼應該是 200
            expect(res.status).toBe(200);
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

// ===========================================
// 測試結束後的清理和報告生成
// ===========================================

afterAll(async () => {
  // 生成並匯出索引報告
  console.log(`\n📊 收集到 ${indexErrors.length} 個索引錯誤`);

  const report = generateReport(indexErrors);

  const outputPath = path.join(process.cwd(), 'missing-indexes.json');
  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ 成功寫入 ${outputPath}`);
  } catch (error) {
    console.error(`❌ 寫入失敗: ${error.message}`);
    throw error;
  }

  // 顯示統計資訊
  console.log('\n===========================================');
  console.log('Firestore 索引收集結果');
  console.log('===========================================');
  console.log(`總 Collection 數: ${report.summary.totalCollections}`);
  console.log(`總查詢數: ${report.summary.totalQueries}`);
  console.log(`失敗（需要索引）: ${report.summary.totalFailed}`);
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
});
