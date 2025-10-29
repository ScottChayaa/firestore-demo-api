const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getCategories,
} = require('../controllers/productController');
const { validatePagination } = require('../middleware/validator');
const { asyncHandler } = require('../middleware/errorHandler');

/**
 * 公開 API 路由 - 商品瀏覽
 * 這些端點不需要身份驗證
 */

// 取得商品列表（支援分頁和篩選）
// GET /api/public/products?limit=20&cursor=abc&category=electronics&minPrice=100
router.get('/', validatePagination, asyncHandler(getProducts));

// 取得商品分類列表
// GET /api/public/products/categories
router.get('/categories', asyncHandler(getCategories));

// 取得單一商品詳情
// GET /api/public/products/:id
router.get('/:id', asyncHandler(getProductById));

module.exports = router;
