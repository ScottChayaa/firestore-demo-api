const { db } = require("@/config/firebase");
const { executePaginatedQuery, mapDocumentToJSON } = require("@/utils/firestore");
const { NotFoundError } = require("@/middleware/errorHandler");

const COLLECTION_NAME = "products";

class ProductController {
  /**
   * 取得商品列表（公開 API - 無需驗證）
   * 支援 Cursor 分頁和多條件篩選
   *
   * Query 參數：
   * - limit: 每頁數量（預設 20）
   * - cursor: 分頁游標
   * - category: 商品分類
   * - minPrice: 最低價格
   * - maxPrice: 最高價格
   * - orderBy: 排序欄位（createdAt, price）預設 createdAt
   * - order: 排序方向（asc, desc）預設 desc
   */
  getProducts = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);

    const { limit, cursor, orderBy, order, category, minPrice, maxPrice} = req.query;

    // 建立基礎查詢
    let query = collection;

    // TODO: 篩選: 商品關鍵字
    //   建立商品訊息資料時, 根據標題、描述... 等資訊, 算出這商品的關鍵字並更新到 DB, 供日後快速查找

    // 篩選: 商品分類
    if (category) {
      query = query.where("category", "==", category);
    }

    // 篩選: 價格範圍
    if (minPrice) {
      query = query.where("price", ">=", minPrice);
    }
    if (maxPrice) {
      query = query.where("price", "<=", maxPrice);
    }

    // 排序欄位 + 排序方向
    query = query.orderBy(orderBy, order);

    // 執行分頁查詢
    const result = await executePaginatedQuery(query, collection, limit, cursor, mapDocumentToJSON);

    req.log.info('取得商品列表');

    res.json(result);
  }

  /**
   * 取得單一商品詳情（公開 API - 無需驗證）
   *
   * Path 參數：
   * - id: 商品 ID
   */
  getProductById = async (req, res) => {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到商品 ID: ${id}`);
    }

    const product = mapDocumentToJSON(doc);

    res.json(product);
  }

  /**
   * TODO: 當產品數量變多時, 效能可能不好, 須找時間研究一下
   * 取得商品分類列表（公開 API）
   * 回傳所有可用的商品分類
   */
  getCategories = async (req, res) => {
    const snapshot = await db.collection(COLLECTION_NAME).select("category").get();

    // 使用 Set 去重
    const categories = new Set();
    snapshot.forEach((doc) => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    res.json(Array.from(categories).sort());
  }
}

// 導出實例
module.exports = new ProductController();
