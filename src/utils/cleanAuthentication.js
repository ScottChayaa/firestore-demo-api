/**
 * Firebase Authentication 用戶清理腳本
 * 刪除所有 Authentication 用戶
 *
 * 使用方式：
 * node src/utils/cleanAuthentication.js
 *
 * ⚠️ 警告：此操作無法復原，請謹慎使用！
 */

const { auth } = require('../config/firebase');
const readline = require('readline');

const BATCH_SIZE = 1000; // Firebase Auth deleteUsers() 最大支援 1000 個

/**
 * 詢問用戶確認
 */
async function askForConfirmation(userCount) {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

  return new Promise(resolve => {
    rl.question(
      '\n⚠️  警告：此操作將刪除 Firebase Authentication 中的所有用戶！\n' +
      `   - 目前用戶數量: ${userCount} 個\n\n` +
      '此操作無法復原！確定要繼續嗎？(yes/no): ',
      answer => {
        rl.close();
        resolve(answer.toLowerCase() === 'yes');
      }
    );
  });
}

/**
 * 列出所有用戶的 UIDs
 */
async function listAllUsers() {
  const uids = [];
  let pageToken;

  console.log('\n🔍 正在掃描所有用戶...');

  do {
    try {
      // 每次最多取得 1000 個用戶
      const listUsersResult = await auth.listUsers(1000, pageToken);

      // 收集 UIDs
      listUsersResult.users.forEach(userRecord => {
        uids.push(userRecord.uid);
      });

      console.log(`   已掃描 ${uids.length} 個用戶...`);

      pageToken = listUsersResult.pageToken;
    } catch (error) {
      console.error('❌ 列出用戶時發生錯誤:', error.message);
      throw error;
    }
  } while (pageToken);

  return uids;
}

/**
 * 批次刪除用戶
 */
async function deleteUsersBatch(uids) {
  let deletedCount = 0;
  let failedCount = 0;

  console.log(`\n🗑️  開始刪除 ${uids.length} 個用戶...`);

  // 將 UIDs 分批處理（每批最多 1000 個）
  for (let i = 0; i < uids.length; i += BATCH_SIZE) {
    const batch = uids.slice(i, i + BATCH_SIZE);

    try {
      const deleteUsersResult = await auth.deleteUsers(batch);

      deletedCount += deleteUsersResult.successCount;
      failedCount += deleteUsersResult.failureCount;

      console.log(`   已刪除 ${deletedCount} 個用戶...`);

      // 如果有失敗的，顯示錯誤
      if (deleteUsersResult.failureCount > 0) {
        console.warn(`   ⚠️  本批次失敗: ${deleteUsersResult.failureCount} 個`);
        deleteUsersResult.errors.forEach(error => {
          console.warn(`      - UID: ${error.index}, 錯誤: ${error.error.message}`);
        });
      }
    } catch (error) {
      console.error('❌ 刪除用戶時發生錯誤:', error.message);
      throw error;
    }
  }

  return { deletedCount, failedCount };
}

/**
 * 清理所有用戶
 */
async function cleanAll() {
  try {
    console.log('\n🚀 開始清理 Firebase Authentication 用戶...');
    const startTime = Date.now();

    // 列出所有用戶
    const uids = await listAllUsers();

    if (uids.length === 0) {
      console.log('\n✅ 沒有用戶需要刪除');
      return {
        success: true,
        deletedCount: 0,
        failedCount: 0,
      };
    }

    // 刪除所有用戶
    const { deletedCount, failedCount } = await deleteUsersBatch(uids);

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 用戶清理完成！');
    console.log('📊 統計資訊：');
    console.log(`   - 成功刪除: ${deletedCount} 個用戶`);
    if (failedCount > 0) {
      console.log(`   - 刪除失敗: ${failedCount} 個用戶`);
    }
    console.log(`   - 總耗時: ${duration} 秒\n`);

    return {
      success: true,
      deletedCount,
      failedCount,
    };
  } catch (error) {
    console.error('\n❌ 清理用戶失敗:', error.message);
    throw error;
  }
}

/**
 * 主函數
 */
async function main() {
  try {
    // 先掃描用戶數量
    const uids = await listAllUsers();

    if (uids.length === 0) {
      console.log('\n✅ 沒有用戶需要刪除');
      process.exit(0);
    }

    // 詢問用戶確認
    const confirmed = await askForConfirmation(uids.length);

    if (!confirmed) {
      console.log('\n❌ 操作已取消');
      process.exit(0);
    }

    // 執行清理（重新掃描並刪除）
    await cleanAll();

    console.log('🎉 腳本執行完成');
    process.exit(0);
  } catch (error) {
    console.error('💥 腳本執行失敗:', error);
    process.exit(1);
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  main();
}

module.exports = {
  cleanAll,
  listAllUsers,
  deleteUsersBatch,
};
