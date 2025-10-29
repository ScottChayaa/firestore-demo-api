const { db } = require('../config/firebase');
const { executePaginatedQuery, defaultMapper } = require('../utils/pagination');
const { NotFoundError } = require('../middleware/errorHandler');

const COLLECTION_NAME = 'products';

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
 * - orderBy: 排序欄位（createdAt, price）
 * - order: 排序方向（asc, desc）
 */
async function getProducts(req, res) {
  try {
    const collection = db.collection(COLLECTION_NAME);
    const {
      category,
      minPrice,
      maxPrice,
      orderBy = 'createdAt',
      order = 'desc',
    } = req.query;
    const { limit, cursor } = req.pagination;

    // 建立基礎查詢
    let query = collection;

    // 篩選：商品分類
    if (category) {
      query = query.where('category', '==', category);
    }

    // 篩選：價格範圍
    if (minPrice) {
      const min = parseFloat(minPrice);
      if (!isNaN(min)) {
        query = query.where('price', '>=', min);
      }
    }

    if (maxPrice) {
      const max = parseFloat(maxPrice);
      if (!isNaN(max)) {
        query = query.where('price', '<=', max);
      }
    }

    // 排序
    const orderDirection = order === 'asc' ? 'asc' : 'desc';
    if (orderBy === 'price') {
      query = query.orderBy('price', orderDirection);
    } else {
      query = query.orderBy('createdAt', orderDirection);
    }

    // 執行分頁查詢
    const result = await executePaginatedQuery(
      query,
      collection,
      limit,
      cursor,
      defaultMapper
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    console.error('❌ Error fetching products:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢商品失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 取得單一商品詳情（公開 API - 無需驗證）
 *
 * Path 參數：
 * - id: 商品 ID
 */
async function getProductById(req, res) {
  try {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到商品 ID: ${id}`);
    }

    const product = defaultMapper(doc);

    res.json({
      success: true,
      data: product,
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.message,
      });
    }

    console.error('❌ Error fetching product:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢商品失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 取得商品分類列表（公開 API）
 * 回傳所有可用的商品分類
 */
async function getCategories(req, res) {
  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .select('category')
      .get();

    // 使用 Set 去重
    const categories = new Set();
    snapshot.forEach(doc => {
      const category = doc.data().category;
      if (category) {
        categories.add(category);
      }
    });

    res.json({
      success: true,
      data: Array.from(categories).sort(),
    });
  } catch (error) {
    console.error('❌ Error fetching categories:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢分類失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  getProducts,
  getProductById,
  getCategories,
};
