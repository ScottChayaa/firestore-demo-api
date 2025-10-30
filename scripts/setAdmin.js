/**
 * 管理員設定腳本
 * 用於新增或移除管理員
 *
 * 使用方式：
 * node scripts/setAdmin.js add <email>
 * node scripts/setAdmin.js remove <email>
 * node scripts/setAdmin.js list
 */

require('dotenv').config();
const { auth, db, FieldValue } = require('../src/config/firebase');

const ADMINS_COLLECTION = 'admins';

/**
 * 新增管理員
 */
async function addAdmin(email) {
  try {
    console.log(`🔍 正在查找用戶: ${email}`);

    // 透過 email 查找 Firebase Auth 用戶
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    console.log(`✅ 找到用戶: ${userRecord.email} (UID: ${uid})`);

    // 檢查是否已經是管理員
    const adminDoc = await db.collection(ADMINS_COLLECTION).doc(uid).get();

    if (adminDoc.exists) {
      console.log(`⚠️  ${email} 已經是管理員了`);
      return;
    }

    // 新增到 admins collection
    await db.collection(ADMINS_COLLECTION).doc(uid).set({
      uid,
      email: userRecord.email,
      displayName: userRecord.displayName || null,
      createdAt: FieldValue.serverTimestamp(),
    });

    console.log(`✅ 成功將 ${email} 設定為管理員`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ 找不到此 Email 的用戶: ${email}`);
      console.log('提示：用戶需要先透過 /api/auth/register 註冊');
    } else {
      console.error('❌ 設定管理員失敗:', error.message);
    }
    process.exit(1);
  }
}

/**
 * 移除管理員
 */
async function removeAdmin(email) {
  try {
    console.log(`🔍 正在查找用戶: ${email}`);

    // 透過 email 查找 Firebase Auth 用戶
    const userRecord = await auth.getUserByEmail(email);
    const uid = userRecord.uid;

    console.log(`✅ 找到用戶: ${userRecord.email} (UID: ${uid})`);

    // 檢查是否為管理員
    const adminDoc = await db.collection(ADMINS_COLLECTION).doc(uid).get();

    if (!adminDoc.exists) {
      console.log(`⚠️  ${email} 不是管理員`);
      return;
    }

    // 從 admins collection 移除
    await db.collection(ADMINS_COLLECTION).doc(uid).delete();

    console.log(`✅ 成功移除 ${email} 的管理員權限`);
  } catch (error) {
    if (error.code === 'auth/user-not-found') {
      console.error(`❌ 找不到此 Email 的用戶: ${email}`);
    } else {
      console.error('❌ 移除管理員失敗:', error.message);
    }
    process.exit(1);
  }
}

/**
 * 列出所有管理員
 */
async function listAdmins() {
  try {
    console.log('📋 管理員列表：\n');

    const snapshot = await db.collection(ADMINS_COLLECTION)
      .orderBy('createdAt', 'desc')
      .get();

    if (snapshot.empty) {
      console.log('目前沒有管理員');
      return;
    }

    snapshot.forEach((doc, index) => {
      const data = doc.data();
      console.log(`${index + 1}. ${data.email}`);
      console.log(`   UID: ${data.uid}`);
      console.log(`   姓名: ${data.displayName || 'N/A'}`);
      console.log(`   建立時間: ${data.createdAt ? data.createdAt.toDate().toLocaleString('zh-TW') : 'N/A'}`);
      console.log('');
    });

    console.log(`總計: ${snapshot.size} 位管理員`);
  } catch (error) {
    console.error('❌ 列出管理員失敗:', error.message);
    process.exit(1);
  }
}

/**
 * 主程式
 */
async function main() {
  const args = process.argv.slice(2);
  const command = args[0];
  const email = args[1];

  console.log('🔧 Firebase Admin 管理員設定工具\n');

  if (!command) {
    console.log('使用方式:');
    console.log('  node scripts/setAdmin.js add <email>     - 新增管理員');
    console.log('  node scripts/setAdmin.js remove <email>  - 移除管理員');
    console.log('  node scripts/setAdmin.js list            - 列出所有管理員');
    process.exit(0);
  }

  switch (command) {
    case 'add':
      if (!email) {
        console.error('❌ 請提供 Email');
        console.log('範例: node scripts/setAdmin.js add admin@example.com');
        process.exit(1);
      }
      await addAdmin(email);
      break;

    case 'remove':
      if (!email) {
        console.error('❌ 請提供 Email');
        console.log('範例: node scripts/setAdmin.js remove admin@example.com');
        process.exit(1);
      }
      await removeAdmin(email);
      break;

    case 'list':
      await listAdmins();
      break;

    default:
      console.error(`❌ 未知的指令: ${command}`);
      console.log('可用指令: add, remove, list');
      process.exit(1);
  }

  process.exit(0);
}

// 執行主程式
main().catch((error) => {
  console.error('❌ 執行失敗:', error);
  process.exit(1);
});
