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
    const errorMessage = res.body.error.toLowerCase(); // 錯誤 error 轉小寫
    return errorMessage.includes('firestoreindexerror') || errorMessage.includes('requires an index');
  }
  return false;
}

/**
 * 收集索引錯誤資訊
 *
 * @param {Object} params
 * @param {string} params.collection - Collection 名稱
 * @param {string} params.queryName - 查詢名稱
 * @param {Object} params.queryParams - 查詢參數
 * @param {Object} params.paramClassification - 參數分類配置
 * @param {string} params.url - 請求 URL
 * @param {Object} params.response - Supertest 回應物件
 */
function collectIndexError({ collection, queryName, queryParams, paramClassification, url, response }) {
  if (!global.__INDEX_ERRORS__) {
    global.__INDEX_ERRORS__ = [];
  }

  var errorMessage = response.body.stack[0] || 'Unknown error';  // 特化 : 索引錯誤的 stack[0] 為 firestore 索引建立連結

  global.__INDEX_ERRORS__.push({
    collection,
    queryName,
    params: queryParams,
    paramClassification,
    url,
    errorMessage: errorMessage,
  });

  console.log(`  ❌ 缺少索引: ${queryName}`);
  console.log(`     URL: ${url}`);
  console.log(`     錯誤: ${errorMessage}\n`);
}

/**
 * 處理查詢測試結果
 *
 * 此函數會：
 * 1. 檢查是否為索引錯誤
 * 2. 收集索引錯誤資訊
 * 3. 返回測試是否應該通過（即使有索引錯誤）
 *
 * @param {Object} params
 * @param {string} params.collection - Collection 名稱
 * @param {string} params.queryName - 查詢名稱
 * @param {Object} params.queryParams - 查詢參數
 * @param {Object} params.paramClassification - 參數分類配置
 * @param {string} params.url - 請求 URL
 * @param {Object} params.response - Supertest 回應物件
 * @returns {Object} { shouldPass: boolean, isIndexError: boolean }
 */
function handleQueryTestResult({ collection, queryName, queryParams, paramClassification, url, response }) {
  // 成功的查詢
  if (response.status === 200) {
    console.log(`  ✅ 查詢成功: ${queryName}`);
    return { shouldPass: true, isIndexError: false };
  }

  // 檢查是否為索引錯誤
  if (isIndexError(response)) {
    collectIndexError({ collection, queryName, queryParams, paramClassification, url, response });
    // 索引錯誤不應導致測試失敗，因為這正是我們要收集的資訊
    return { shouldPass: true, isIndexError: true };
  }

  // 其他錯誤（非索引錯誤）
  console.log(`  ❌ 查詢失敗（非索引錯誤）: ${queryName}`);
  console.log(`     URL: ${url}`);
  console.log(`     狀態碼: ${response.status}`);
  console.log(`     錯誤: ${response.body.error || 'Unknown error'}\n`);
  return { shouldPass: false, isIndexError: false };
}

module.exports = {
  isIndexError,
  collectIndexError,
  handleQueryTestResult,
};
