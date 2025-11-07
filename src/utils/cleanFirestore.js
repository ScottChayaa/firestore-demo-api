/**
 * Firestore 資料清理腳本
 * 刪除所有測試資料
 *
 * 使用方式：
 * node src/utils/cleanFirestore.js
 *
 * ⚠️ 警告：此操作無法復原，請謹慎使用！
 */

const { db } = require("../config/firebase");
const readline = require("readline");

const COLLECTIONS = ["admins", "members", "orders", "products"];
const BATCH_SIZE = 500;

/**
 * 詢問用戶確認
 */
function askForConfirmation() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise((resolve) => {
    rl.question(
      "\n⚠️  警告：此操作將刪除以下集合的所有資料：\n" +
        `  - ${COLLECTIONS.join("\n  - ")}\n\n` +
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
 */
async function cleanAll() {
  try {
    console.log("\n🚀 開始清理 Firestore 資料...");

    const startTime = Date.now();
    let totalDeleted = 0;

    for (const collectionName of COLLECTIONS) {
      const count = await deleteCollection(collectionName);
      totalDeleted += count;
    }

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ 所有資料清理完成！");
    console.log(`📊 統計資訊：`);
    console.log(`   - 總共刪除: ${totalDeleted} 筆資料`);
    console.log(`   - 總耗時: ${duration} 秒\n`);

    return {
      deletedCount: totalDeleted,
      collections: COLLECTIONS,
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
    // 詢問用戶確認
    const confirmed = await askForConfirmation();

    if (!confirmed) {
      console.log("\n❌ 操作已取消");
      process.exit(0);
    }

    // 執行清理
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
};
