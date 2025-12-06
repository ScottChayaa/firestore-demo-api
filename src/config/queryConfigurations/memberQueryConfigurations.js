/**
 * 會員查詢組合配置
 *
 * 這是會員查詢組合的唯一定義來源（Single Source of Truth）
 * 被以下檔案共用：
 * - tests/queries/memberQueries.test.js（測試 API）
 *
 * 注意：會員集合的查詢相對簡單，主要是：
 * 1. 分頁查詢（無特殊篩選條件）
 * 2. 日期範圍篩選（startDate, endDate）
 * 3. isActive 狀態篩選
 * 4. includeDeleted 參數（是否包含已刪除會員）
 */

// ===========================================
// 測試用的固定值
// ===========================================

const TEST_VALUES = {
  startDate: "2025-01-01",
  endDate: "2025-12-31",
};

// ===========================================
// 查詢組合列表
// ===========================================

const validQueryCombinations = [
  // ========================================
  // 1. 基本查詢（2 種）
  // 單一欄位排序 → Firestore 自動索引
  // ========================================
  {
    name: "基本查詢（預設排序）",
    params: {},
    description: "查詢所有會員，按 createdAt 降序",
  },

  // ========================================
  // 2. 日期範圍篩選（3 種）
  // 範圍查詢 + 同欄位排序 → 可能需要索引
  // ========================================
  {
    name: "按開始日期篩選",
    params: { startDate: TEST_VALUES.startDate },
    description: "查詢指定日期後建立的會員",
  },
  {
    name: "按結束日期篩選",
    params: { endDate: TEST_VALUES.endDate },
    description: "查詢指定日期前建立的會員",
  },
  {
    name: "按日期範圍篩選",
    params: { startDate: TEST_VALUES.startDate, endDate: TEST_VALUES.endDate },
    description: "查詢指定日期範圍內建立的會員",
  },

  // ========================================
  // 3. 狀態篩選（2 種）
  // 等值查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "僅查詢啟用會員",
    params: { isActive: true },
    description: "查詢所有啟用狀態的會員",
  },
  {
    name: "僅查詢停用會員",
    params: { isActive: false },
    description: "查詢所有停用狀態的會員",
  },

  // ========================================
  // 4. 包含已刪除（1 種）
  // 等值查詢 → 需要複合索引
  // ========================================
  {
    name: "包含已刪除會員",
    params: { includeDeleted: true },
    description: "查詢所有會員（包含已刪除）",
  },

  // ========================================
  // 5. 複合條件（2 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "啟用會員 + 日期範圍",
    params: { isActive: true, startDate: TEST_VALUES.startDate, endDate: TEST_VALUES.endDate },
    description: "查詢指定日期範圍內建立的啟用會員",
  },
  {
    name: "包含已刪除 + 日期範圍",
    params: { includeDeleted: true, startDate: TEST_VALUES.startDate, endDate: TEST_VALUES.endDate },
    description: "查詢指定日期範圍內建立的所有會員（包含已刪除）",
  },
];

// ===========================================
// 參數分類配置（用於索引定義生成）
// ===========================================

const paramClassification = {
  // 等值查詢參數（映射到實際欄位）
  equality: {
    isActive: 'isActive',          // 查詢參數 → 實際欄位（相同）
    includeDeleted: 'deletedAt'    // 查詢參數 → 實際欄位（不同）
  },

  // 範圍查詢參數（映射到實際欄位）
  range: {
    startDate: 'createdAt',
    endDate: 'createdAt'
  },

  // 排序參數（特殊處理）
  orderBy: ['orderBy', 'order'],

  // 非索引參數（忽略）
  ignored: ['limit', 'cursor']
};

// ===========================================
// 匯出配置
// ===========================================

module.exports = {
  validQueryCombinations,
  paramClassification,
  TEST_VALUES,
};
