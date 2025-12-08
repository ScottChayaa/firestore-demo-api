/**
 * Firestore 索引收集工具
 *
 * 功能：
 * 1. 執行所有查詢組合
 * 2. 自動收集缺失的索引錯誤
 * 3. 生成 missing-indexes.json 報告
 *
 * 使用方式：
 * node scripts/collect-indexes.js
 *
 * 或透過 npm script：
 * npm run collect:indexes
 */

// 載入 module-alias（必須在最前面）
require('module-alias/register');

const request = require('supertest');
const app = require('@/app');
const { getAdminToken } = require('@/utils/auth');
const fs = require('fs');
const path = require('path');
const { parseFirebaseIndexUrl, convertToFirestoreIndexDefinition } = require('@/utils/parseIndexUrl');

// ===========================================
// 查詢配置
// ===========================================

const QUERY_CONFIGS = [
  {
    name: "訂單查詢",
    collectionName: "orders",
    endpoint: "/api/admin/orders",
    requiresAuth: true,
    validQueryCombinations: require("@/config/queryConfigurations/orderQueryConfigurations").validQueryCombinations,
  },
  {
    name: "會員查詢",
    collectionName: "members",
    endpoint: "/api/admin/members",
    requiresAuth: true,
    validQueryCombinations: require("@/config/queryConfigurations/memberQueryConfigurations").validQueryCombinations,
  },
  {
    name: "商品查詢",
    collectionName: "products",
    endpoint: "/api/products",
    requiresAuth: false,
    validQueryCombinations: require("@/config/queryConfigurations/productQueryConfigurations").validQueryCombinations,
  },
  {
    name: "管理員查詢",
    collectionName: "admins",
    endpoint: "/api/admin/admins",
    requiresAuth: true,
    validQueryCombinations: require("@/config/queryConfigurations/adminQueryConfigurations").validQueryCombinations,
  },
];

// ===========================================
// 索引定義生成邏輯
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
 * 從 Firebase 錯誤訊息中提取 Console URL
 * @param {string} errorMessage - Firebase 錯誤訊息
 * @returns {string|null} 索引創建 URL，或 null 如果未找到
 *
 * @example
 * const errorMsg = "Error: 9 FAILED_PRECONDITION: The query requires an index. You can create it here: https://console.firebase.google.com/...";
 * const url = extractIndexUrl(errorMsg);
 * // Returns: "https://console.firebase.google.com/..."
 */
function extractIndexUrl(errorMessage) {
  const match = errorMessage.match(/https:\/\/console\.firebase\.google\.com[^\s]+/);
  return match ? match[0] : null;
}

/**
 * 從 Firebase 錯誤 URL 建立索引定義
 * @param {string} errorMessage - Firebase 錯誤訊息
 * @returns {Object} Firestore 索引定義
 * @throws {Error} 如果無法提取 URL 或解析失敗
 */
function buildIndexDefinitionFromUrl(errorMessage) {
  const url = extractIndexUrl(errorMessage);
  if (!url) {
    throw new Error('無法從錯誤訊息提取 Firebase Console URL');
  }

  const parsed = parseFirebaseIndexUrl(url);
  return convertToFirestoreIndexDefinition(parsed);
}

// ===========================================
// 錯誤檢查邏輯
// ===========================================

/**
 * 檢查回應是否為索引錯誤
 * @param {Object} res - HTTP 回應物件
 * @returns {boolean}
 */
function isIndexError(res) {
  if (res.status !== 200 && res.body.error) {
    return res.body.error === 'FirestoreIndexError';
  }
  return false;
}

// ===========================================
// 初始化
// ===========================================

async function initialize() {
  console.log('\n🔍 開始收集 Firestore 索引資訊...\n');

  // 預先載入 Firebase
  require('@/config/firebase');

  // Firestore warmup（減少冷啟動延遲）
  const { warmupFirestore } = require('@/config/firebase');
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
    console.warn('⚠️  Firestore warmup failed (script will continue):', error.message);
  }

  // 取得認證 token（如有需要）
  const needsAuth = QUERY_CONFIGS.some(config => config.requiresAuth);
  if (needsAuth) {
    const token = await getAdminToken();
    console.log('✅ 已取得管理員 Token\n');
    return token;
  }

  return null;
}

// ===========================================
// 查詢執行與錯誤收集
// ===========================================

async function collectIndexes(adminToken) {
  const indexErrors = [];
  let totalQueries = 0;
  let successfulQueries = 0;

  for (const config of QUERY_CONFIGS) {
    console.log(`\n========================================`);
    console.log(`${config.name}測試`);
    console.log(`========================================\n`);

    for (const { name, params } of config.validQueryCombinations) {
      totalQueries++;

      // 建立查詢字串
      const queryString = new URLSearchParams(params).toString();
      const url = `${config.endpoint}?limit=1&${queryString}`;

      console.log(`測試: ${name}`);
      console.log(`URL: ${url}`);

      // 建立請求
      let req = request(app).get(url);

      // 如果需要驗證，加上 Authorization header
      if (config.requiresAuth) {
        req = req.set("Authorization", `Bearer ${adminToken}`);
      }

      // 執行請求
      const res = await req;

      // 處理結果
      if (res.status === 200) {
        console.log(`  ✅ 查詢成功\n`);
        successfulQueries++;
      } else if (isIndexError(res)) {
        const errorMessage = res.body.stack[0] || 'Unknown error';

        indexErrors.push({
          collection: config.collectionName,
          queryName: name,
          params,
          url,
          errorMessage,
        });

        console.log(`  ❌ 缺少索引`);
        console.log(`     錯誤: ${errorMessage}\n`);
      } else {
        console.log(`  ❌ 查詢失敗（非索引錯誤）`);
        console.log(`     狀態碼: ${res.status}`);
        console.log(`     錯誤: ${res.body.error || 'Unknown error'}\n`);
      }
    }

    console.log(`${config.collectionName} 查詢組合統計`);
    console.log(`查詢組合總數: ${config.validQueryCombinations.length} 種\n`);
  }

  return { indexErrors, totalQueries, successfulQueries };
}

// ===========================================
// 報告生成
// ===========================================

function generateReport(indexErrors) {
  const collections = {};

  indexErrors.forEach(error => {
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

    // 從 Firebase 錯誤 URL 解析精確的索引定義
    const indexDefinition = buildIndexDefinitionFromUrl(error.errorMessage);

    collections[collectionName].missingIndexes.push({
      queryName: error.queryName,
      params: error.params,
      errorMessage: error.errorMessage,
      url: error.url,
      indexDefinition,
    });
  });

  // 計算總計
  const summary = {
    totalCollections: Object.keys(collections).length,
    totalQueries: 0,
    totalSuccessful: 0,
    totalFailed: indexErrors.length,
    totalIndexesNeeded: indexErrors.length,
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
// 主函數
// ===========================================

async function main() {
  try {
    // Step 1: 初始化
    const adminToken = await initialize();

    // Step 2: 收集索引錯誤
    const { indexErrors, totalQueries, successfulQueries } = await collectIndexes(adminToken);

    // Step 3: 生成報告
    console.log(`\n📊 收集到 ${indexErrors.length} 個索引錯誤`);

    const report = generateReport(indexErrors);

    // Step 4: 寫入檔案
    const outputPath = path.join(process.cwd(), 'missing-indexes.json');
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ 成功寫入 ${outputPath}`);

    // Step 5: 顯示統計
    console.log('\n===========================================');
    console.log('Firestore 索引收集結果');
    console.log('===========================================');
    console.log(`總 Collection 數: ${report.summary.totalCollections}`);
    console.log(`總查詢數: ${totalQueries}`);
    console.log(`成功查詢: ${successfulQueries}`);
    console.log(`失敗（需要索引）: ${report.summary.totalFailed}`);
    console.log(`已儲存至: ${outputPath}`);
    console.log('===========================================\n');

    if (indexErrors.length > 0) {
      console.log('⚠️  發現缺失的索引！');
      console.log('請執行以下步驟：');
      console.log('  1. 查看 missing-indexes.json 了解詳情');
      console.log('  2. 執行 npm run update:indexes 更新索引配置檔');
      console.log('  3. 執行 firebase deploy --only firestore:indexes 部署索引\n');
    } else {
      console.log('✅ 所有查詢都有對應的索引！\n');
    }

    process.exit(0);
  } catch (error) {
    console.error('\n❌ 收集索引失敗:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

// 執行
if (require.main === module) {
  main();
}

module.exports = {
  collectIndexes,
  generateReport,
  buildIndexDefinitionFromUrl,
  extractIndexUrl,
};
