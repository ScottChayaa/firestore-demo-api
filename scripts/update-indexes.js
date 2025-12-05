/**
 * Firestore 索引自動更新腳本
 *
 * 功能：
 * 1. 讀取 missing-indexes.json
 * 2. 提取索引定義
 * 3. 過濾重複的索引
 * 4. 合併並更新 firestore.indexes.json
 *
 * 使用方式：
 * node scripts/update-indexes.js
 *
 * 或透過 npm script：
 * npm run update:indexes
 */

const fs = require('fs');
const path = require('path');

// 檔案路徑
const MISSING_INDEXES_PATH = path.join(process.cwd(), 'missing-indexes.json');
const FIRESTORE_INDEXES_PATH = path.join(process.cwd(), 'firestore.indexes.json');

/**
 * 生成索引的唯一識別鍵
 * @param {Object} indexDef - 索引定義物件
 * @returns {string} - 索引的唯一識別字串
 */
function generateIndexKey(indexDef) {
  return JSON.stringify({
    collectionGroup: indexDef.collectionGroup,
    queryScope: indexDef.queryScope,
    fields: indexDef.fields,
    density: indexDef.density
  });
}

/**
 * 從 missing-indexes.json 提取索引定義
 * @param {Object} missingIndexes - missing-indexes.json 的內容
 * @returns {Array} - 索引定義陣列
 */
function extractIndexDefinitions(missingIndexes) {
  const indexDefs = [];

  // 遍歷所有 collection
  Object.values(missingIndexes.collections || {}).forEach(collection => {
    collection.missingIndexes?.forEach(item => {
      if (item.indexDefinition) {
        indexDefs.push(item.indexDefinition);
      }
    });
  });

  return indexDefs;
}

/**
 * 過濾重複的索引
 * @param {Array} existingIndexes - 現有的索引陣列
 * @param {Array} newIndexes - 新的索引陣列
 * @returns {Object} - { uniqueNewIndexes, skippedCount }
 */
function deduplicateIndexes(existingIndexes, newIndexes) {
  const existingKeys = new Set(
    existingIndexes.map(idx => generateIndexKey(idx))
  );

  const uniqueNewIndexes = [];
  let skippedCount = 0;

  newIndexes.forEach(newIdx => {
    const key = generateIndexKey(newIdx);
    if (!existingKeys.has(key)) {
      uniqueNewIndexes.push(newIdx);
      existingKeys.add(key);
    } else {
      skippedCount++;
    }
  });

  return { uniqueNewIndexes, skippedCount };
}

/**
 * 主函數
 */
async function main() {
  console.log('\n🔍 開始更新 Firestore 索引配置...\n');

  // 1. 檢查 missing-indexes.json 是否存在
  if (!fs.existsSync(MISSING_INDEXES_PATH)) {
    console.log('❌ 找不到 missing-indexes.json');
    console.log('   請先執行: npm run collect:indexes\n');
    process.exit(1);
  }

  try {
    // 2. 讀取檔案
    const missingIndexes = JSON.parse(fs.readFileSync(MISSING_INDEXES_PATH, 'utf8'));
    const firestoreIndexes = JSON.parse(fs.readFileSync(FIRESTORE_INDEXES_PATH, 'utf8'));

    // 3. 提取索引定義
    const newIndexDefs = extractIndexDefinitions(missingIndexes);

    if (newIndexDefs.length === 0) {
      console.log('✅ 沒有需要更新的索引');
      console.log('   所有查詢都已有對應的索引配置\n');
      process.exit(0);
    }

    // 4. 去重
    const { uniqueNewIndexes, skippedCount } = deduplicateIndexes(
      firestoreIndexes.indexes || [],
      newIndexDefs
    );

    if (uniqueNewIndexes.length === 0) {
      console.log('✅ 沒有需要新增的索引');
      console.log(`   ${skippedCount} 個索引已存在於 firestore.indexes.json 中\n`);
      process.exit(0);
    }

    // 5. 合併索引
    firestoreIndexes.indexes = [
      ...(firestoreIndexes.indexes || []),
      ...uniqueNewIndexes
    ];

    // 6. 寫入檔案
    fs.writeFileSync(
      FIRESTORE_INDEXES_PATH,
      JSON.stringify(firestoreIndexes, null, 2) + '\n'
    );

    // 7. 顯示統計
    console.log('✅ 索引配置更新完成！');
    console.log('\n📊 統計資訊：');
    console.log(`   - 新增索引數量: ${uniqueNewIndexes.length}`);
    if (skippedCount > 0) {
      console.log(`   - 已存在（跳過）: ${skippedCount}`);
    }
    console.log(`   - 總索引數量: ${firestoreIndexes.indexes.length}`);
    console.log('\n📝 下一步：');
    console.log('   執行以下指令部署索引到 Firebase:');
    console.log('   firebase deploy --only firestore:indexes\n');
  } catch (error) {
    if (error.code === 'ENOENT') {
      console.error(`\n❌ 找不到檔案: ${error.path}`);
    } else if (error instanceof SyntaxError) {
      console.error('\n❌ JSON 格式錯誤');
      console.error(`   檔案可能損壞或格式不正確`);
    } else if (error.code === 'EACCES') {
      console.error('\n❌ 權限錯誤：無法寫入檔案');
      console.error(`   請檢查檔案權限: ${FIRESTORE_INDEXES_PATH}`);
    } else {
      console.error('\n❌ 更新索引失敗:', error.message);
    }
    process.exit(1);
  }
}

// 執行
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ 更新索引失敗:', error.message);
    process.exit(1);
  });
}

module.exports = {
  generateIndexKey,
  extractIndexDefinitions,
  deduplicateIndexes
};
