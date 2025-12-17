const express = require('express');
const { query } = require('express-validator');
const router = express.Router();
const productController = require('@/controllers/productController');
const { validate, validator } = require('@/middleware/validator');
const { productValidator } = require('@/middleware/productValidator');

/**
 * 公開 API 路由 - 商品瀏覽
 */

// 取得商品列表（支援分頁和篩選）
// GET /api/products?limit=20&cursor=abc&category=electronics&minPrice=100
router.get(
  '/',
  validator.pagination(),
  validator.orderBy(),
  productValidator.category(),
  productValidator.priceRange(),
  validate,
  productController.getProducts
);

// 取得商品分類列表
// GET /api/products/categories
router.get('/categories', productController.getCategories);

// 取得單一商品詳情
// GET /api/products/:id
router.get('/:id', productController.getProductById);

module.exports = router;
