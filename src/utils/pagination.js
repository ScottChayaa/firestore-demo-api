/**
 * Cursor 分頁工具
 * 提供 Firestore Cursor-based Pagination 的輔助函數
 */

/**
 * 建立分頁回應物件
 * @param {Array} data - 查詢結果資料
 * @param {number} limit - 每頁數量
 * @param {boolean} hasMore - 是否還有下一頁
 * @param {string|null} nextCursor - 下一頁的 cursor（最後一筆資料的 ID）
 * @returns {Object} 分頁回應物件
 */
function createPaginatedResponse(data, limit, hasMore = false, nextCursor = null) {
  return {
    data,
    pagination: {
      limit,
      hasMore,
      nextCursor,
      count: data.length,
    },
  };
}

/**
 * 從查詢快照建立分頁回應
 * @param {QuerySnapshot} snapshot - Firestore 查詢快照
 * @param {number} limit - 每頁數量
 * @param {Function} mapper - 資料映射函數（可選）
 * @returns {Object} 分頁回應物件
 */
function createPaginatedResponseFromSnapshot(snapshot, limit, mapper = null) {
  const docs = [];

  snapshot.forEach((doc) => {
    const data = mapper ? mapper(doc) : { id: doc.id, ...doc.data() };
    docs.push(data);
  });

  // 判斷是否還有下一頁
  const hasMore = docs.length > limit;

  // 如果超過 limit，移除最後一筆（它只是用來判斷是否有下一頁）
  if (hasMore) {
    docs.pop();
  }

  // 取得下一頁的 cursor（最後一筆資料的 ID）
  const nextCursor = hasMore && docs.length > 0 ? docs[docs.length - 1].id : null;

  return createPaginatedResponse(docs, limit, hasMore, nextCursor);
}

/**
 * 建立分頁查詢
 * @param {Query} query - Firestore 查詢
 * @param {number} limit - 每頁數量
 * @param {string|null} cursor - 分頁游標（文件 ID）
 * @param {CollectionReference} collection - 集合參考（用於取得 cursor 對應的文件）
 * @returns {Promise<Query>} 分頁查詢
 */
async function buildPaginatedQuery(query, limit, cursor = null, collection = null) {
  // 多取一筆資料來判斷是否還有下一頁
  let paginatedQuery = query.limit(limit + 1);

  // 如果有 cursor，從該文件之後開始查詢
  if (cursor && collection) {
    try {
      const cursorDoc = await collection.doc(cursor).get();
      if (cursorDoc.exists) {
        paginatedQuery = paginatedQuery.startAfter(cursorDoc);
      }
    } catch (error) {
      console.warn("⚠️ Invalid cursor:", cursor);
      // 如果 cursor 無效，忽略它（從頭開始查詢）
    }
  }

  return paginatedQuery;
}

/**
 * 執行分頁查詢並回傳格式化的結果
 * @param {Query} baseQuery - 基礎查詢
 * @param {CollectionReference} collection - 集合參考
 * @param {number} limit - 每頁數量
 * @param {string|null} cursor - 分頁游標
 * @param {Function} mapper - 資料映射函數（可選）
 * @returns {Promise<Object>} 分頁查詢結果
 */
async function executePaginatedQuery(baseQuery, collection, limit, cursor = null, mapper = null) {
  const paginatedQuery = await buildPaginatedQuery(baseQuery, limit, cursor, collection);
  const snapshot = await paginatedQuery.get();
  return createPaginatedResponseFromSnapshot(snapshot, limit, mapper);
}

/**
 * 資料映射器：將 Firestore 文件轉換為 JSON 物件
 * @param {DocumentSnapshot} doc - Firestore 文件快照
 * @returns {Object} JSON 物件
 */
function defaultMapper(doc) {
  const data = doc.data();

  // 轉換 Timestamp 為 ISO 字串
  Object.keys(data).forEach((key) => {
    if (data[key] && typeof data[key].toDate === "function") {
      data[key] = data[key].toDate().toISOString();
    }
  });

  return {
    id: doc.id,
    ...data,
  };
}

module.exports = {
  createPaginatedResponse,
  createPaginatedResponseFromSnapshot,
  buildPaginatedQuery,
  executePaginatedQuery,
  defaultMapper,
};
