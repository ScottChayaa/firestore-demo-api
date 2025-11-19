const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProductById,
  getCategories,
} = require('../controllers/productController');
const { validatePagination } = require('../middleware/validator');

/**
 * 公開 API 路由 - 商品瀏覽
 */

// 取得商品列表（支援分頁和篩選）
// GET /api/public/products?limit=20&cursor=abc&category=electronics&minPrice=100
router.get('/', validatePagination, getProducts);

// 取得商品分類列表
// GET /api/public/products/categories
router.get('/categories', getCategories);

// 取得單一商品詳情
// GET /api/public/products/:id
router.get('/:id', getProductById);

module.exports = router;
