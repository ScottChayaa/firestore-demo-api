/**
 * Jest 全域清理 - 測試結束後執行
 *
 * 功能：
 * 1. 收集所有測試中發現的索引錯誤
 * 2. 匯出至 missing-indexes.json（覆蓋模式）
 * 3. 替代 scripts/collect*.js 系列腳本的功能
 * 4. 自動產生符合 firestore.indexes.json 格式的索引定義
 */

const fs = require('fs');
const path = require('path');

// ===========================================
// 索引定義生成相關常數和函數
// ===========================================

/**
 * 參數分類常數
 * 用於區分查詢參數的類型和用途
 */
const PARAM_CLASSIFICATION = {
  // 等值查詢參數（順序不重要）
  equality: ['memberId', 'status'],

  // 範圍查詢參數（映射到實際欄位）
  range: {
    startDate: 'createdAt',
    endDate: 'createdAt',
    minAmount: 'totalAmount',
    maxAmount: 'totalAmount'
  },

  // 排序參數（特殊處理）
  orderBy: ['orderBy', 'order'],

  // 非索引參數（忽略）
  ignored: ['limit', 'cursor']
};

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
 * @returns {Array} 索引欄位陣列
 */
function extractIndexFields(params) {
  const fields = [];
  const fieldSet = new Set(); // 用於去重

  // 預設值處理
  const orderByField = params.orderBy || 'createdAt';
  const orderDirection = params.order || 'desc';

  // Step 1: 收集等值查詢欄位
  PARAM_CLASSIFICATION.equality.forEach(param => {
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
  Object.entries(PARAM_CLASSIFICATION.range).forEach(([param, fieldName]) => {
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
 * @returns {Object} Firestore 索引定義物件
 */
function buildIndexDefinition(collectionName, params) {
  return {
    collectionGroup: collectionName,
    queryScope: 'COLLECTION',
    fields: extractIndexFields(params),
    density: 'SPARSE_ALL'
  };
}

module.exports = async () => {
  const indexErrors = global.__INDEX_ERRORS__ || [];

  // 除錯資訊：顯示收集到的錯誤數量
  console.log(`\n📊 收集到 ${indexErrors.length} 個索引錯誤`);

  // 依 collection 分類整理
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

    collections[collectionName].missingIndexes.push({
      queryName: error.queryName,
      params: error.params,
      errorMessage: error.errorMessage,
      url: error.url,
      indexDefinition: buildIndexDefinition(error.collection, error.params),
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

  // 建立報告
  const report = {
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

  // 匯出至 missing-indexes.json（覆蓋模式）
  const outputPath = path.join(process.cwd(), 'missing-indexes.json');
  try {
    fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));
    console.log(`✅ 成功寫入 ${outputPath}`);
  } catch (error) {
    console.error(`❌ 寫入失敗: ${error.message}`);
    throw error;  // 確保測試失敗時能看到錯誤
  }

  // 顯示統計資訊
  console.log('\n===========================================');
  console.log('Firestore 索引收集結果');
  console.log('===========================================');
  console.log(`總 Collection 數: ${summary.totalCollections}`);
  console.log(`總查詢數: ${summary.totalQueries}`);
  console.log(`失敗（需要索引）: ${summary.totalFailed}`);
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
};
