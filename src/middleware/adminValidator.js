const { query, body, check } = require('express-validator');

/**
 * 驗證器: Admin
 */
class AdminValidator {

  /**
   * 驗證更新欄位: uid
   */
  bodyUid = () => body("uid").notEmpty().withMessage("uid 為必填欄位");

  /**
   * 驗證更新欄位: name
   */
  bodyName = () => body("name").notEmpty().withMessage("name 為必填欄位");
  
  /**
   * 驗證更新欄位: Email
   */
  bodyEmail = () => body("email").isEmail().withMessage('email 格式不正確');
  
  /**
   * 驗證更新欄位: 密碼
   */
  bodyPassword = () => body("password").isLength({ min: 6 }).withMessage('password 至少需要 6 個字元');
  
}

var adminValidator = new AdminValidator();


module.exports = {
  adminValidator
};
