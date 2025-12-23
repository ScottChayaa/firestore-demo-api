/**
 * 訂單查詢組合配置
 *
 * 這是訂單查詢組合的唯一定義來源（Single Source of Truth）
 * 
 * 修改查詢條件時，只需要修改這個檔案！
 */

// ===========================================
// 測試用的固定值
// ===========================================

const TEST_VALUES = {
  memberId: "test_member_123",
  status: "pending",  // 其他值: "processing", "completed", "cancelled"
  minCreatedAt: "2025-01-01",
  maxCreatedAt: "2025-01-31",
  minAmount: 100,
  maxAmount: 1000,
};

// ===========================================
// 查詢組合列表（只包含需要複合索引的組合）
// ===========================================

const validQueryCombinations = [
  // ========================================
  // 1. 單一等值篩選 - memberId（4 種）
  // 等值查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "按會員ID，按時間降序（預設）",
    params: { memberId: TEST_VALUES.memberId },
  },
  {
    name: "按會員ID，按時間升序",
    params: { memberId: TEST_VALUES.memberId, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "按會員ID，按金額降序",
    params: { memberId: TEST_VALUES.memberId, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "按會員ID，按金額升序",
    params: { memberId: TEST_VALUES.memberId, orderBy: "totalAmount", order: "asc" },
  },

  // ========================================
  // 2. 單一等值篩選 - status（4 種）
  // 等值查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "按狀態，按時間降序",
    params: { status: TEST_VALUES.status, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "按狀態，按時間升序",
    params: { status: TEST_VALUES.status, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "按狀態，按金額降序",
    params: { status: TEST_VALUES.status, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "按狀態，按金額升序",
    params: { status: TEST_VALUES.status, orderBy: "totalAmount", order: "asc" },
  },

  // ========================================
  // 3. 複合篩選 - memberId + status（2 種）
  // 多個等值查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "會員ID + 狀態，按時間降序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "會員ID + 狀態，按時間升序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, orderBy: "createdAt", order: "asc" },
  },

  // ========================================
  // 4. 複合篩選 - memberId + 日期範圍（6 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "會員ID + 開始日期，按時間升序",
    params: { memberId: TEST_VALUES.memberId, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 開始日期，按時間降序",
    params: { memberId: TEST_VALUES.memberId, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "會員ID + 結束日期，按時間升序",
    params: { memberId: TEST_VALUES.memberId, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 結束日期，按時間降序",
    params: { memberId: TEST_VALUES.memberId, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "會員ID + 日期範圍，按時間升序",
    params: { memberId: TEST_VALUES.memberId, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 日期範圍，按時間降序",
    params: { memberId: TEST_VALUES.memberId, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },

  // ========================================
  // 5. 複合篩選 - memberId + 金額範圍（6 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "會員ID + 最低金額，按金額升序",
    params: { memberId: TEST_VALUES.memberId, minAmount: TEST_VALUES.minAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "會員ID + 最低金額，按金額降序",
    params: { memberId: TEST_VALUES.memberId, minAmount: TEST_VALUES.minAmount, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "會員ID + 最高金額，按金額升序",
    params: { memberId: TEST_VALUES.memberId, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "會員ID + 最高金額，按金額降序",
    params: { memberId: TEST_VALUES.memberId, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "會員ID + 金額範圍，按金額升序",
    params: { memberId: TEST_VALUES.memberId, minAmount: TEST_VALUES.minAmount, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "會員ID + 金額範圍，按金額降序",
    params: { memberId: TEST_VALUES.memberId, minAmount: TEST_VALUES.minAmount, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "desc" },
  },

  // ========================================
  // 6. 複合篩選 - status + 日期範圍（6 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "狀態 + 開始日期，按時間升序",
    params: { status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "狀態 + 開始日期，按時間降序",
    params: { status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "狀態 + 結束日期，按時間升序",
    params: { status: TEST_VALUES.status, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "狀態 + 結束日期，按時間降序",
    params: { status: TEST_VALUES.status, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "狀態 + 日期範圍，按時間升序",
    params: { status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "狀態 + 日期範圍，按時間降序",
    params: { status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },

  // ========================================
  // 7. 複合篩選 - status + 金額範圍（6 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "狀態 + 最低金額，按金額升序",
    params: { status: TEST_VALUES.status, minAmount: TEST_VALUES.minAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "狀態 + 最低金額，按金額降序",
    params: { status: TEST_VALUES.status, minAmount: TEST_VALUES.minAmount, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "狀態 + 最高金額，按金額升序",
    params: { status: TEST_VALUES.status, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "狀態 + 最高金額，按金額降序",
    params: { status: TEST_VALUES.status, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "desc" },
  },
  {
    name: "狀態 + 金額範圍，按金額升序",
    params: { status: TEST_VALUES.status, minAmount: TEST_VALUES.minAmount, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "asc" },
  },
  {
    name: "狀態 + 金額範圍，按金額降序",
    params: { status: TEST_VALUES.status, minAmount: TEST_VALUES.minAmount, maxAmount: TEST_VALUES.maxAmount, orderBy: "totalAmount", order: "desc" },
  },

  // ========================================
  // 8. 三重篩選 - memberId + status + 日期範圍（6 種）
  // 多個等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "會員ID + 狀態 + 開始日期，按時間升序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 狀態 + 開始日期，按時間降序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "會員ID + 狀態 + 結束日期，按時間升序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 狀態 + 結束日期，按時間降序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },
  {
    name: "會員ID + 狀態 + 日期範圍，按時間升序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "asc" },
  },
  {
    name: "會員ID + 狀態 + 日期範圍，按時間降序",
    params: { memberId: TEST_VALUES.memberId, status: TEST_VALUES.status, minCreatedAt: TEST_VALUES.minCreatedAt, maxCreatedAt: TEST_VALUES.maxCreatedAt, orderBy: "createdAt", order: "desc" },
  },
];

// ===========================================
// 已移除的組合（自動索引，無需測試）
// ===========================================

/**
 * ❌ 無篩選 + 排序（4 種）
 *    - 單一欄位排序 → Firestore 自動索引
 *
 * ❌ 日期範圍 + 同欄位排序（6 種）
 *    - createdAt >= minCreatedAt + orderBy createdAt → Firestore 自動索引
 *
 * ❌ 金額範圍 + 同欄位排序（6 種）
 *    - totalAmount >= minAmount + orderBy totalAmount → Firestore 自動索引
 *
 * ❌ 重複的 status 值（原本 4 個值產生的冗餘組合）
 *    - "pending", "processing", "completed", "cancelled" → 只保留 "pending"
 *    - 減少組合數：16 → 4, 8 → 2, 24 → 6, 24 → 6, 24 → 6
 */

// ===========================================
// 匯出配置
// ===========================================

module.exports = {
  validQueryCombinations,
  TEST_VALUES, // 供測試檔案使用
};
