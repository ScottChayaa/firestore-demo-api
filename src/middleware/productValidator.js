const { query, body, check } = require('express-validator');

/**
 * 驗證器: Product
 */
class ProductValidator {

  /**
   * 驗證查詢欄位: category
   */
  queryCategory = () => query("category").optional();

  /**
   * 驗證查詢欄位: 產品金額範圍
   */
  queryPriceRange = () => {
    return [
      query("minPrice").optional().isInt().toInt(),
      query("maxPrice")
        .optional()
        .isInt()
        .toInt()
        .custom((maxPrice, { req }) => {
          if (maxPrice < req.query.minPrice) {
            throw new Error("maxPrice 必須大於 minPrice");
          }

          return true;
        }),
    ];
  };

  /**
   * 驗證更新欄位: 產品金額
   */
  bodyPrice = () => body("price").notEmpty();
}

var productValidator = new ProductValidator();

module.exports = {
  productValidator
};
