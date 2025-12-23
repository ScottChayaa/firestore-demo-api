const { body } = require("express-validator");

class MailValidator {
  /**
   * 驗證發送郵件請求
   */
  sendEmail = () => {
    return [
      body("to")
        .notEmpty().withMessage("收件人信箱不能為空")
        .isEmail().withMessage("收件人信箱格式不正確")
        .normalizeEmail(), // 標準化信箱格式

      body("subject")
        .notEmpty().withMessage("郵件主旨不能為空")
        .isLength({ min: 1, max: 200 }).withMessage("郵件主旨長度必須在 1-200 字元之間")
        .trim(),

      body("html")
        .notEmpty().withMessage("郵件內容不能為空")
        .isLength({ min: 1, max: 50000 }).withMessage("郵件內容長度必須在 1-50000 字元之間"),
    ];
  };
}

module.exports = new MailValidator();
