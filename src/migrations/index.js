require('module-alias/register');
require('dotenv').config();

const { db, FieldValue, Timestamp } = require('@/config/firebase');
const fs = require('fs');
const path = require('path');

/**
 * 資料遷移執行器
 *
 * 使用方式：
 * - node src/migrations/index.js              執行所有未執行的遷移
 * - node src/migrations/index.js --dry-run    模擬執行（不實際修改資料）
 * - node src/migrations/index.js --only 001   執行特定遷移
 */

const MIGRATIONS_COLLECTION = '_migrations';
const isDryRun = process.argv.includes('--dry-run');
const onlyMigration = process.argv.includes('--only')
  ? process.argv[process.argv.indexOf('--only') + 1]
  : null;

/**
 * 載入所有遷移腳本
 */
function loadMigrations() {
  const migrationsDir = __dirname;
  const files = fs.readdirSync(migrationsDir)
    .filter(file => file.match(/^\d{3}_.*\.js$/))
    .sort();

  return files.map(file => {
    const migration = require(path.join(migrationsDir, file));
    return {
      file,
      ...migration
    };
  });
}

/**
 * 取得已執行的遷移記錄
 */
async function getExecutedMigrations() {
  const snapshot = await db.collection(MIGRATIONS_COLLECTION).get();
  return new Set(snapshot.docs.map(doc => doc.id));
}

/**
 * 記錄遷移執行結果
 */
async function recordMigration(migration, stats, status = 'completed') {
  if (isDryRun) {
    console.log(`  [DRY-RUN] 將記錄遷移: ${migration.id}`);
    return;
  }

  await db.collection(MIGRATIONS_COLLECTION).doc(migration.id).set({
    id: migration.id,
    name: migration.name,
    description: migration.description,
    executedAt: FieldValue.serverTimestamp(),
    executedBy: 'system',
    status,
    stats,
  });
}

/**
 * 執行單個遷移
 */
async function executeMigration(migration) {
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📦 遷移 #${migration.id}: ${migration.name}`);
  console.log(`   ${migration.description}`);
  console.log(`${'='.repeat(60)}`);

  if (isDryRun) {
    console.log(`\n🔍 [DRY-RUN 模式] 模擬執行中...\n`);
  }

  const startTime = Date.now();

  try {
    // 執行遷移
    const stats = await migration.up(db, FieldValue, isDryRun);

    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    // 記錄執行結果
    await recordMigration(migration, {
      ...stats,
      executionTime: `${executionTime}s`
    });

    console.log(`\n✅ 遷移 #${migration.id} 完成`);
    console.log(`   執行時間: ${executionTime}s`);

    if (stats) {
      console.log(`   統計資訊:`, stats);
    }

    return { success: true, stats };
  } catch (error) {
    const executionTime = ((Date.now() - startTime) / 1000).toFixed(2);

    console.error(`\n❌ 遷移 #${migration.id} 失敗`);
    console.error(`   錯誤訊息: ${error.message}`);
    console.error(`   執行時間: ${executionTime}s`);

    // 記錄失敗
    await recordMigration(migration, {
      error: error.message,
      executionTime: `${executionTime}s`
    }, 'failed');

    return { success: false, error };
  }
}

/**
 * 主執行函數
 */
async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║             🔄 Firestore 資料遷移系統                     ║
╚═══════════════════════════════════════════════════════════╝
`);

  if (isDryRun) {
    console.log(`⚠️  DRY-RUN 模式：將模擬執行但不會實際修改資料\n`);
  }

  // 載入遷移腳本
  const migrations = loadMigrations();
  console.log(`📂 找到 ${migrations.length} 個遷移腳本\n`);

  if (migrations.length === 0) {
    console.log(`ℹ️  沒有找到任何遷移腳本`);
    return;
  }

  // 取得已執行的遷移
  const executedMigrations = await getExecutedMigrations();
  console.log(`📋 已執行 ${executedMigrations.size} 個遷移\n`);

  // 過濾需要執行的遷移
  let pendingMigrations = migrations.filter(m => !executedMigrations.has(m.id));

  // 如果指定只執行特定遷移
  if (onlyMigration) {
    pendingMigrations = migrations.filter(m => m.id === onlyMigration);
    if (pendingMigrations.length === 0) {
      console.log(`❌ 找不到遷移 #${onlyMigration}`);
      return;
    }
    console.log(`🎯 僅執行遷移 #${onlyMigration}\n`);
  }

  if (pendingMigrations.length === 0) {
    console.log(`✅ 所有遷移都已執行，無需執行新的遷移`);
    return;
  }

  console.log(`📝 待執行 ${pendingMigrations.length} 個遷移:\n`);
  pendingMigrations.forEach(m => {
    console.log(`   - #${m.id}: ${m.name}`);
  });

  // 執行遷移
  const results = [];
  for (const migration of pendingMigrations) {
    const result = await executeMigration(migration);
    results.push({ migration, ...result });

    // 如果失敗則停止
    if (!result.success) {
      console.log(`\n⛔ 遷移失敗，停止執行後續遷移`);
      break;
    }
  }

  // 顯示總結
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 執行總結`);
  console.log(`${'='.repeat(60)}`);

  const successCount = results.filter(r => r.success).length;
  const failCount = results.filter(r => !r.success).length;

  console.log(`✅ 成功: ${successCount}`);
  console.log(`❌ 失敗: ${failCount}`);
  console.log(`📋 總計: ${results.length}`);

  if (isDryRun) {
    console.log(`\n⚠️  這是 DRY-RUN 模式，未實際修改任何資料`);
    console.log(`   移除 --dry-run 參數以實際執行遷移`);
  }

  console.log();
}

// 執行主程式
main()
  .then(() => {
    console.log(`\n👋 遷移系統執行完畢\n`);
    process.exit(0);
  })
  .catch(error => {
    console.error(`\n💥 遷移系統發生錯誤:`, error);
    process.exit(1);
  });
