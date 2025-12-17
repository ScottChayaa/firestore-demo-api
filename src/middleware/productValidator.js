const { check } = require('express-validator');

/**
 * 驗證器: Product
 */
class ProductValidator {

  /**
   * 驗證: category
   */
  category = () => check("category").optional();

  /**
   * 驗證: 產品金額範圍
   */
  priceRange = () => {
    return [
      check("minPrice").optional().isInt().toInt(),
      check("maxPrice")
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
   * 驗證: 產品金額欄位
   */
  price = () => check("price").notEmpty();
}

var productValidator = new ProductValidator();

module.exports = {
  productValidator
};
