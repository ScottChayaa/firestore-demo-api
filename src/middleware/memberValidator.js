const { query, body, check } = require("express-validator");

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
  bodyEmail = () => body("email").notEmpty().isEmail().withMessage("email 格式不正確");

  /**
   * 驗證更新欄位: 密碼
   */
  bodyPassword = () =>
    body("password")
      .notEmpty()
      .withMessage("password 為必填欄位")
      .isLength({ min: 6 })
      .withMessage("password 至少需要 6 個字元");

  /**
   * 驗證更新欄位: name
   */
  bodyName = () => body("name").notEmpty().withMessage("name 為必填欄位");

  /**
   * 驗證更新欄位: 電話
   */
  bodyPhone = () =>
    body("phone")
      .optional()
      .isMobilePhone("zh-TW")
      .withMessage("請輸入正確的台灣手機號碼");
}

var memberValidator = new MemberValidator();

module.exports = {
  memberValidator,
};
