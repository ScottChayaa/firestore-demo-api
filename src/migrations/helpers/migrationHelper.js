/**
 * 遷移工具函數庫
 *
 * 提供通用的批次處理、進度追蹤、統計功能
 */

const BATCH_SIZE = 500;

/**
 * 批次處理 Collection 的通用框架
 *
 * @param {FirebaseFirestore.Firestore} db - Firestore 實例
 * @param {string} collectionName - Collection 名稱
 * @param {Function} filterFn - 過濾函數 (doc, data) => boolean，決定哪些文檔需要更新
 * @param {Function} transformFn - 轉換函數 (doc, data) => updateData，決定如何更新文檔
 * @param {boolean} isDryRun - 是否為 Dry-run 模式
 * @param {object} options - 額外選項
 * @returns {object} 統計資訊 { total, updated, skipped }
 */
async function processCollection(
  db,
  collectionName,
  filterFn,
  transformFn,
  isDryRun = false,
  options = {}
) {
  const { batchSize = BATCH_SIZE, showProgress = true } = options;

  const stats = { total: 0, updated: 0, skipped: 0 };

  // 1. 掃描 Collection
  console.log(`📋 處理 ${collectionName} collection...`);
  const snapshot = await db.collection(collectionName).get();
  stats.total = snapshot.size;

  console.log(`  找到 ${stats.total} 個文檔`);

  if (stats.total === 0) {
    console.log(`  ⚠️  ${collectionName} collection 為空，跳過`);
    return stats;
  }

  // 2. 過濾需要更新的文檔
  const docsToUpdate = [];

  snapshot.docs.forEach((doc) => {
    const data = doc.data();
    if (filterFn(doc, data)) {
      docsToUpdate.push(doc);
    } else {
      stats.skipped++;
    }
  });

  console.log(`  需要更新 ${docsToUpdate.length} 個文檔`);

  if (docsToUpdate.length === 0) {
    console.log(`  ✅ 無需更新任何文檔`);
    return stats;
  }

  // 3. 批次更新
  for (let i = 0; i < docsToUpdate.length; i += batchSize) {
    const batch = db.batch();
    const batchDocs = docsToUpdate.slice(i, i + batchSize);

    batchDocs.forEach((doc) => {
      const data = doc.data();
      const updateData = transformFn(doc, data);
      batch.update(doc.ref, updateData);
    });

    if (isDryRun) {
      console.log(
        `  [DRY-RUN] 將更新批次 ${Math.floor(i / batchSize) + 1} (${batchDocs.length} 個文檔)`
      );
      stats.updated += batchDocs.length;
    } else {
      await batch.commit();
      stats.updated += batchDocs.length;

      if (showProgress) {
        const progress = Math.floor((stats.updated / docsToUpdate.length) * 100);
        console.log(`  進度: ${stats.updated}/${docsToUpdate.length} (${progress}%)`);
      }
    }
  }

  console.log(`  ✅ ${collectionName}: 成功更新 ${stats.updated} 個文檔`);

  return stats;
}

/**
 * 顯示遷移統計總結
 *
 * @param {object} statsMap - 統計資訊對照表 { collectionName: { total, updated, skipped } }
 */
function printMigrationSummary(statsMap) {
  console.log('\n' + '─'.repeat(60));
  console.log('📊 遷移統計');
  console.log('─'.repeat(60));

  Object.entries(statsMap).forEach(([name, stats]) => {
    const label = name.padEnd(10);
    console.log(`${label}: ${stats.updated}/${stats.total} 更新 (跳過 ${stats.skipped})`);
  });

  console.log('─'.repeat(60));
}

module.exports = {
  processCollection,
  printMigrationSummary,
  BATCH_SIZE,
};
