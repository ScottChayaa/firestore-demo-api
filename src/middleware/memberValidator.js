const { query, body, check } = require('express-validator');

/**
 * 驗證器: Member
 */
class MemberValidator {

  /**
   * 驗證更新欄位: uid
   */
  bodyUid = () => body("uid").notEmpty().withMessage("uid 為必填欄位");
    
  /**
   * 驗證更新欄位: Email
   */
  bodyEmail = () => body("email").notEmpty().isEmail().withMessage('email 格式不正確');
  
  /**
   * 驗證更新欄位: 密碼
   */
  bodyPassword = () => body("password").isLength({ min: 6 }).withMessage('password 至少需要 6 個字元');
  
  /**
   * 驗證更新欄位: name
   */
  bodyName = () => body("name").notEmpty().withMessage("name 為必填欄位");

  /**
   * 驗證更新欄位: 電話
   */
  bodyPhone = () => body("phone").optional();

  /**
   * 驗證更新欄位: 新密碼
   */
  bodyNewPassword = () =>
    body("newPassword")
      .notEmpty()
      .withMessage("newPassword 為必填欄位")
      .isLength({ min: 6 })
      .withMessage("newPassword 至少需要 6 個字元");

}

var memberValidator = new MemberValidator();


module.exports = {
  memberValidator
};
