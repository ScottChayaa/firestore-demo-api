/**
 * 商品查詢組合配置
 *
 * 這是查詢組合的唯一定義來源（Single Source of Truth）
 * 被以下檔案共用：
 * - tests/queries/productQueries.test.js（測試 API）
 * - scripts/collectProductIndexes.js（收集索引）
 * - scripts/collectAllIndexes.js（收集所有索引）
 *
 * 修改查詢條件時，只需要修改這個檔案！
 */

// ===========================================
// Firestore 索引建立原則
// ===========================================

/**
 * 自動索引（Firestore 自動建立，無需手動配置）：
 * 1. 無篩選 + 單一欄位排序
 * 2. 單一欄位等值查詢 + 同欄位排序
 * 3. 單一欄位範圍查詢 + 同欄位排序
 *
 * 複合索引（需要手動建立）：
 * 1. 多個等值查詢
 * 2. 等值查詢 + 不同欄位排序
 * 3. 範圍查詢 + 不同欄位排序
 * 4. 等值查詢 + 範圍查詢
 *
 * 查詢值優化：
 * - category 只測試一個值（"electronics"）
 * - 索引不關心具體值，只關心欄位結構
 * - "electronics" 和 "books" 使用同一個索引
 */

// ===========================================
// 查詢組合列表（只包含需要複合索引的組合）
// ===========================================

const validQueryCombinations = [
  // ========================================
  // 1. 分類查詢（4 種）
  // 等值查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "按分類，按時間降序（預設）",
    params: { category: "electronics" },  // 其他值: "books", "clothing", etc.
    description: "篩選特定分類，使用預設排序",
  },
  {
    name: "按分類，按時間升序",
    params: { category: "electronics", orderBy: "createdAt", order: "asc" },
    description: "篩選特定分類，按時間升序",
  },
  {
    name: "按分類，按價格降序",
    params: { category: "electronics", orderBy: "price", order: "desc" },
    description: "篩選特定分類，按價格降序",
  },
  {
    name: "按分類，按價格升序",
    params: { category: "electronics", orderBy: "price", order: "asc" },
    description: "篩選特定分類，按價格升序",
  },

  // ========================================
  // 2. 分類 + 價格範圍查詢（4 種）
  // 等值查詢 + 範圍查詢 + 排序 → 需要複合索引
  // ========================================
  {
    name: "分類 + 最低價格，按價格升序",
    params: { category: "electronics", minPrice: 100, orderBy: "price", order: "asc" },
    description: "篩選分類並設定最低價格",
  },
  {
    name: "分類 + 最高價格，按價格降序",
    params: { category: "electronics", maxPrice: 1000, orderBy: "price", order: "desc" },
    description: "篩選分類並設定最高價格",
  },
  {
    name: "分類 + 價格範圍，按價格升序",
    params: { category: "electronics", minPrice: 100, maxPrice: 1000, orderBy: "price", order: "asc" },
    description: "篩選分類並設定價格範圍，升序",
  },
  {
    name: "分類 + 價格範圍，按價格降序",
    params: { category: "electronics", minPrice: 100, maxPrice: 1000, orderBy: "price", order: "desc" },
    description: "篩選分類並設定價格範圍，降序",
  },
];

// ===========================================
// 已移除的組合（自動索引，無需測試）
// ===========================================

/**
 * ❌ 無篩選 + 排序（4 種）
 *    - 單一欄位排序 → Firestore 自動索引
 *
 * ❌ 價格範圍 + 同欄位排序（6 種）
 *    - price >= 100 + orderBy price → Firestore 自動索引
 *    - price <= 1000 + orderBy price → Firestore 自動索引
 *    - price 範圍 + orderBy price → Firestore 自動索引
 */

// ===========================================
// 匯出配置
// ===========================================

module.exports = {
  validQueryCombinations,
};
