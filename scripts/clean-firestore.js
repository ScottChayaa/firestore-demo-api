/**
 * Firestore 資料清理腳本
 * 刪除所有 collections 資料
 *
 * 使用方式：
 * node scripts/clean-firestore.js
 *
 * ⚠️ 警告：此操作無法復原，請謹慎使用！
 */

require('module-alias/register');
const { db } = require("../src/config/firebase");
const readline = require("readline");

const BATCH_SIZE = 500;

/**
 * 動態取得要清理的 collections
 *
 * @param {Object} options - 過濾選項
 * @param {boolean} options.excludeSystem - 排除系統 collections (預設: true)
 * @param {string[]} options.whitelist - 僅包含指定的 collections
 * @param {string[]} options.blacklist - 排除指定的 collections
 * @returns {Promise<string[]>} Collection 名稱列表
 */
async function getCollectionsToClean(options = {}) {
  const collections = await db.listCollections();
  let collectionNames = collections.map(col => col.id);

  // 選項 1: 排除系統 collections (預設開啟)
  if (options.excludeSystem !== false) {
    collectionNames = collectionNames.filter(name =>
      !name.startsWith('_')  // 排除 _migrations 等系統 collections
    );
  }

  // 選項 2: 白名單模式（僅刪除指定的）
  if (options.whitelist) {
    collectionNames = collectionNames.filter(name =>
      options.whitelist.includes(name)
    );
  }

  // 選項 3: 黑名單模式（排除指定的）
  if (options.blacklist) {
    collectionNames = collectionNames.filter(name =>
      !options.blacklist.includes(name)
    );
  }

  return collectionNames;
}

/**
 * 詢問用戶確認
 */
function askForConfirmation(collectionNames) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "\n⚠️  警告：此操作將刪除以下集合的所有資料：\n" +
        `  - ${collectionNames.join("\n  - ")}\n\n` +
        "此操作無法復原！確定要繼續嗎？(yes/no): ",
      (answer) => {
        rl.close();
        resolve(answer.toLowerCase() === "yes");
      }
    );
  });
}

/**
 * 刪除集合中的所有文檔（批次處理）
 */
async function deleteCollection(collectionName) {
  const collectionRef = db.collection(collectionName);
  let deletedCount = 0;

  console.log(`\n🗑️  開始刪除集合: ${collectionName}`);

  while (true) {
    // 每次查詢 BATCH_SIZE 筆資料
    const snapshot = await collectionRef.limit(BATCH_SIZE).get();

    if (snapshot.empty) {
      break;
    }

    // 使用 batch 刪除
    const batch = db.batch();
    snapshot.docs.forEach((doc) => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    deletedCount += snapshot.size;

    console.log(`   已刪除 ${deletedCount} 筆文檔...`);

    // 如果這次刪除的數量少於 BATCH_SIZE，表示已經全部刪除完成
    if (snapshot.size < BATCH_SIZE) {
      break;
    }
  }

  console.log(`✅ 集合 ${collectionName} 清理完成，共刪除 ${deletedCount} 筆資料`);

  return deletedCount;
}

/**
 * 清理所有指定的集合
 *
 * @param {Object} options - 過濾選項
 * @param {boolean} options.excludeSystem - 排除系統 collections (預設: true)
 * @param {string[]} options.whitelist - 僅包含指定的 collections
 * @param {string[]} options.blacklist - 排除指定的 collections
 */
async function cleanAll(options = {}) {
  try {
    console.log("\n🚀 開始清理 Firestore 資料...");

    // 動態取得要清理的 collections
    const collectionNames = await getCollectionsToClean(options);

    if (collectionNames.length === 0) {
      console.log("\n📦 沒有找到需要清理的 collections");
      return {
        deletedCount: 0,
        collections: [],
      };
    }

    console.log(`📦 發現 ${collectionNames.length} 個 collections: ${collectionNames.join(', ')}\n`);

    const startTime = Date.now();
    let totalDeleted = 0;

    for (const collectionName of collectionNames) {
      const count = await deleteCollection(collectionName);
      totalDeleted += count;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ 所有資料清理完成！");
    console.log(`📊 統計資訊：`);
    console.log(`   - 總共刪除: ${totalDeleted} 筆資料`);
    console.log(`   - 清理的 collections: ${collectionNames.join(', ')}`);
    console.log(`   - 總耗時: ${duration} 秒\n`);

    return {
      deletedCount: totalDeleted,
      collections: collectionNames,
    };
  } catch (error) {
    console.error("\n❌ 清理資料失敗:", error.message);
    throw error;
  }
}

/**
 * 主函數
 */
async function main() {
  try {
    // 先取得要清理的 collections 列表
    const collectionNames = await getCollectionsToClean();

    if (collectionNames.length === 0) {
      console.log("\n📦 沒有找到需要清理的 collections");
      console.log("🎉 腳本執行完成");
      process.exit(0);
    }

    // 詢問用戶確認
    const confirmed = await askForConfirmation(collectionNames);

    if (!confirmed) {
      console.log("\n❌ 操作已取消");
      process.exit(0);
    }

    // 執行清理（使用相同的選項）
    await cleanAll();

    console.log("🎉 腳本執行完成");
    process.exit(0);
  } catch (error) {
    console.error("💥 腳本執行失敗:", error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  cleanAll,
  deleteCollection,
  getCollectionsToClean,
};
