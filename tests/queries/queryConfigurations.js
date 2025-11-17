/**
 * 商品查詢組合配置
 *
 * 這是查詢組合的唯一定義來源（Single Source of Truth）
 * 被以下檔案共用：
 * - tests/queries/productQueries.test.js（測試 API）
 * - scripts/collectMissingIndexes.js（收集索引）
 *
 * 修改查詢條件時，只需要修改這個檔案！
 */

// ===========================================
// 查詢組合列表
// ===========================================

const validQueryCombinations = [
  // 基本查詢 - 無篩選
  {
    name: "無篩選，按時間降序（預設）",
    params: {},
    description: "最基本的查詢，使用預設排序",
  },
  {
    name: "無篩選，按時間升序",
    params: { orderBy: "createdAt", order: "asc" },
    description: "按建立時間升序排列",
  },
  {
    name: "無篩選，按價格降序",
    params: { orderBy: "price", order: "desc" },
    description: "按價格降序排列",
  },
  {
    name: "無篩選，按價格升序",
    params: { orderBy: "price", order: "asc" },
    description: "按價格升序排列",
  },

  // 分類查詢
  {
    name: "按分類，按時間降序（預設）",
    params: { category: "electronics" },
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

  // 價格範圍查詢（必須按價格排序）
  {
    name: "最低價格，按價格升序",
    params: { minPrice: 100, orderBy: "price", order: "asc" },
    description: "設定最低價格，按價格升序",
  },
  {
    name: "最低價格，按價格降序",
    params: { minPrice: 100, orderBy: "price", order: "desc" },
    description: "設定最低價格，按價格降序",
  },
  {
    name: "最高價格，按價格升序",
    params: { maxPrice: 1000, orderBy: "price", order: "asc" },
    description: "設定最高價格，按價格升序",
  },
  {
    name: "最高價格，按價格降序",
    params: { maxPrice: 1000, orderBy: "price", order: "desc" },
    description: "設定最高價格，按價格降序",
  },
  {
    name: "價格範圍，按價格升序",
    params: { minPrice: 100, maxPrice: 1000, orderBy: "price", order: "asc" },
    description: "設定價格範圍，按價格升序",
  },
  {
    name: "價格範圍，按價格降序",
    params: { minPrice: 100, maxPrice: 1000, orderBy: "price", order: "desc" },
    description: "設定價格範圍，按價格降序",
  },

  // 分類 + 價格範圍查詢
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
// 匯出配置
// ===========================================

module.exports = {
  validQueryCombinations,
};
