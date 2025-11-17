#!/usr/bin/env node

/**
 * Firestore 索引配置更新腳本
 *
 * 功能：
 * 1. 讀取 missing-indexes.json（由 collectMissingIndexes.js 生成）
 * 2. 讀取現有的 firestore.indexes.json
 * 3. 根據缺失索引資訊提供建議
 * 4. 可選：自動更新 firestore.indexes.json
 *
 * 使用方式：
 *   node scripts/updateIndexes.js
 *
 * 注意：
 * - 建議先手動點擊 Firestore 錯誤訊息中的連結建立索引
 * - 然後執行 firebase firestore:indexes > firestore.indexes.json
 * - 此腳本主要用於驗證和檢查索引配置
 */

const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const MISSING_INDEXES_PATH = path.join(__dirname, "..", "missing-indexes.json");
const INDEXES_CONFIG_PATH = path.join(__dirname, "..", "firestore.indexes.json");

/**
 * 檢查 Firebase CLI 是否已安裝
 */
function checkFirebaseCLI() {
  try {
    execSync("firebase --version", { stdio: "ignore" });
    return true;
  } catch (error) {
    return false;
  }
}

/**
 * 從 Firebase 匯出索引配置
 */
function exportIndexesFromFirebase() {
  console.log("正在從 Firebase 匯出索引配置...\n");

  try {
    const output = execSync("firebase firestore:indexes", { encoding: "utf8" });

    // 將輸出寫入 firestore.indexes.json
    fs.writeFileSync(INDEXES_CONFIG_PATH, output);

    console.log("✅ 索引配置已成功匯出到 firestore.indexes.json\n");
    return true;
  } catch (error) {
    console.error("❌ 匯出索引配置失敗:", error.message);
    console.error("請確保：");
    console.error("  1. Firebase CLI 已安裝 (npm install -g firebase-tools)");
    console.error("  2. 已登入 Firebase (firebase login)");
    console.error("  3. 已初始化專案 (firebase init firestore)\n");
    return false;
  }
}

/**
 * 讀取缺失的索引資訊
 */
function readMissingIndexes() {
  if (!fs.existsSync(MISSING_INDEXES_PATH)) {
    console.log("找不到 missing-indexes.json");
    console.log("請先執行: npm run collect:indexes\n");
    return null;
  }

  const content = fs.readFileSync(MISSING_INDEXES_PATH, "utf8");
  return JSON.parse(content);
}

/**
 * 讀取現有的索引配置
 */
function readExistingIndexes() {
  if (!fs.existsSync(INDEXES_CONFIG_PATH)) {
    console.log("找不到 firestore.indexes.json");
    console.log("將創建新的索引配置檔\n");
    return { indexes: [], fieldOverrides: [] };
  }

  const content = fs.readFileSync(INDEXES_CONFIG_PATH, "utf8");
  return JSON.parse(content);
}

/**
 * 顯示索引建立指南
 */
function showIndexCreationGuide(missingIndexes) {
  console.log("===========================================");
  console.log("缺失的索引清單");
  console.log("===========================================\n");

  missingIndexes.missingIndexes.forEach((index, i) => {
    console.log(`${i + 1}. ${index.queryName}`);
    console.log(`   篩選條件: ${JSON.stringify(index.filters)}`);
    console.log(`   排序: ${index.orderBy} ${index.order}`);
    console.log(`   錯誤訊息: ${index.indexInfo.errorMessage}\n`);
  });

  console.log("===========================================");
  console.log("建立索引步驟");
  console.log("===========================================\n");
  console.log("方案 A：自動建立（推薦）");
  console.log("  1. 執行 npm run collect:indexes");
  console.log("  2. 點擊錯誤訊息中的連結，自動建立索引");
  console.log("  3. 等待索引建立完成（可能需要數分鐘）");
  console.log("  4. 執行 npm run update:indexes");
  console.log();
  console.log("方案 B：手動建立");
  console.log("  1. 前往 Firebase Console > Firestore Database > Indexes");
  console.log("  2. 點擊「Create Index」");
  console.log("  3. 根據上述索引資訊手動配置");
  console.log("  4. 執行 npm run update:indexes");
  console.log();
  console.log("方案 C：使用 Firebase CLI");
  console.log("  1. 手動編輯 firestore.indexes.json");
  console.log("  2. 執行 firebase deploy --only firestore:indexes");
  console.log();
}

/**
 * 主函數
 */
function main() {
  console.log("===========================================");
  console.log("Firestore 索引更新工具");
  console.log("===========================================\n");

  // 1. 讀取缺失的索引資訊
  const missingIndexes = readMissingIndexes();

  if (!missingIndexes) {
    console.log("請先執行索引收集腳本：");
    console.log("  npm run collect:indexes\n");
    process.exit(1);
  }

  // 2. 檢查是否有缺失的索引
  if (missingIndexes.missingIndexes.length === 0) {
    console.log("✅ 沒有缺失的索引！\n");
    console.log("所有查詢都有對應的索引配置。\n");
    process.exit(0);
  }

  // 3. 顯示缺失索引的建立指南
  showIndexCreationGuide(missingIndexes);

  // 4. 檢查 Firebase CLI 是否可用
  const hasFirebaseCLI = checkFirebaseCLI();

  if (hasFirebaseCLI) {
    console.log("===========================================");
    console.log("自動更新索引配置");
    console.log("===========================================\n");
    console.log("偵測到 Firebase CLI 已安裝");
    console.log("正在嘗試從 Firebase 匯出最新的索引配置...\n");

    const success = exportIndexesFromFirebase();

    if (success) {
      console.log("✅ 索引配置已更新！");
      console.log("請查看 firestore.indexes.json 確認索引配置\n");

      // 讀取並顯示索引數量
      const indexes = readExistingIndexes();
      console.log(`目前索引數量: ${indexes.indexes.length} 個\n`);

      // 提示下一步
      console.log("下一步：");
      console.log("  1. 再次執行測試: npm run test:queries");
      console.log("  2. 部署索引: firebase deploy --only firestore:indexes\n");
    }
  } else {
    console.log("===========================================");
    console.log("注意");
    console.log("===========================================\n");
    console.log("未偵測到 Firebase CLI");
    console.log("請手動建立索引後，執行：");
    console.log("  firebase firestore:indexes > firestore.indexes.json\n");
    console.log("或安裝 Firebase CLI：");
    console.log("  npm install -g firebase-tools\n");
  }

  console.log("===========================================\n");
}

// 執行主函數
try {
  main();
} catch (error) {
  console.error("執行失敗:", error);
  process.exit(1);
}
