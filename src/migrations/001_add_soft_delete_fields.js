/**
 * 遷移 #001: 為 members 和 admins 補上軟刪除欄位
 *
 * 目的：
 * 為所有現有的 members 和 admins 文檔補上軟刪除和啟用/停用相關欄位
 * 確保舊資料與新建立的資料結構一致
 *
 * 新增欄位：
 * - isActive: true (預設啟用)
 * - deletedAt: null (預設未刪除)
 * - deletedBy: null (預設無刪除者)
 */

const { processCollection, printMigrationSummary } = require('./helpers/migrationHelper');

module.exports = {
  id: '001',
  name: 'add_soft_delete_fields',
  description: '為 members 和 admins 補上軟刪除欄位 (isActive, deletedAt, deletedBy)',

  /**
   * 執行遷移
   */
  async up(db, FieldValue, isDryRun = false) {
    console.log('\n🔄 開始遷移...\n');

    const stats = {
      members: { total: 0, updated: 0, skipped: 0 },
      admins: { total: 0, updated: 0, skipped: 0 },
    };

    // 定義過濾邏輯：檢查是否缺少任何軟刪除欄位
    const filterFn = (doc, data) => {
      return (
        data.isActive === undefined ||
        data.deletedAt === undefined ||
        data.deletedBy === undefined
      );
    };

    // 定義轉換邏輯：只新增不存在的欄位
    const transformFn = (doc, data) => {
      const updateData = {};

      if (data.isActive === undefined) {
        updateData.isActive = true;
      }
      if (data.deletedAt === undefined) {
        updateData.deletedAt = null;
      }
      if (data.deletedBy === undefined) {
        updateData.deletedBy = null;
      }

      return updateData;
    };

    // 1. 處理 members collection
    stats.members = await processCollection(db, 'members', filterFn, transformFn, isDryRun);

    // 2. 處理 admins collection
    console.log(''); // 空行分隔
    stats.admins = await processCollection(db, 'admins', filterFn, transformFn, isDryRun);

    // 顯示總結
    printMigrationSummary(stats);

    return stats;
  },

  /**
   * 回滾遷移（可選）
   */
  async down(db, FieldValue, isDryRun = false) {
    console.log('\n⚠️  回滾功能未實作');
    console.log('   如需移除欄位，請手動處理或建立新的遷移腳本');

    return {
      message: '回滾功能未實作',
    };
  },
};
