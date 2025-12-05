/**
 * Jest 測試中的索引收集工具
 *
 * 功能：
 * 1. 提供統一的錯誤處理和索引收集邏輯
 * 2. 自動識別 Firestore 索引錯誤
 * 3. 收集錯誤資訊供 globalTeardown 匯出
 */

/**
 * 檢查回應是否為索引錯誤
 *
 * @param {Object} res - Supertest 回應物件
 * @returns {boolean}
 */
function isIndexError(res) {
  if (res.status !== 200 && res.body.error) {
    return res.body.error === 'FirestoreIndexError';
  }
  return false;
}

/**
 * 收集索引錯誤資訊（已廢棄 - 改為 handleQueryTestResult 直接回傳錯誤資料）
 *
 * @deprecated 此函數不再使用，索引錯誤資料現在由 handleQueryTestResult 直接回傳
 */
function collectIndexError({ collection, queryName, queryParams, paramClassification, url, response }) {
  // 此函數已廢棄，保留僅供向後兼容
  console.warn('⚠️ collectIndexError is deprecated. Use handleQueryTestResult instead.');
}

/**
 * 處理查詢測試結果（修改版 - 不使用 global 變數）
 *
 * 此函數會：
 * 1. 檢查是否為索引錯誤
 * 2. 回傳索引錯誤資料（而非寫入 global）
 * 3. 返回測試是否應該通過（即使有索引錯誤）
 *
 * @param {Object} params
 * @param {string} params.collection - Collection 名稱
 * @param {string} params.queryName - 查詢名稱
 * @param {Object} params.queryParams - 查詢參數
 * @param {Object} params.paramClassification - 參數分類配置
 * @param {string} params.url - 請求 URL
 * @param {Object} params.response - Supertest 回應物件
 * @returns {Object} {
 *   shouldPass: boolean,
 *   isIndexError: boolean,
 *   errorData: Object | null  // 新增：回傳錯誤資料而非寫入 global
 * }
 */
function handleQueryTestResult({ collection, queryName, queryParams, paramClassification, url, response }) {
  // 成功的查詢
  if (response.status === 200) {
    console.log(`  ✅ 查詢成功: ${queryName}`);
    return { shouldPass: true, isIndexError: false, errorData: null };
  }

  // 檢查是否為索引錯誤
  if (isIndexError(response)) {
    const errorMessage = response.body.stack[0] || 'Unknown error';  // 特化 : 索引錯誤的 stack[0] 為 firestore 索引建立連結

    // 不寫入 global，改為回傳資料
    const errorData = {
      collection,
      queryName,
      params: queryParams,
      paramClassification,
      url,
      errorMessage,
    };

    console.log(`  ❌ 缺少索引: ${queryName}`);
    console.log(`     URL: ${url}`);
    console.log(`     錯誤: ${errorMessage}\n`);

    // 索引錯誤不應導致測試失敗，因為這正是我們要收集的資訊
    return { shouldPass: true, isIndexError: true, errorData };
  }

  // 其他錯誤（非索引錯誤）
  console.log(`  ❌ 查詢失敗（非索引錯誤）: ${queryName}`);
  console.log(`     URL: ${url}`);
  console.log(`     狀態碼: ${response.status}`);
  console.log(`     錯誤: ${response.body.error || 'Unknown error'}\n`);
  return { shouldPass: false, isIndexError: false, errorData: null };
}

module.exports = {
  isIndexError,
  collectIndexError,
  handleQueryTestResult,
};
