const { body } = require("express-validator");

class MailValidator {
  /**
   * 验证发送邮件请求
   */
  sendEmail = () => {
    return [
      body("to")
        .notEmpty().withMessage("收件人邮箱不能为空")
        .isEmail().withMessage("收件人邮箱格式不正确")
        .normalizeEmail(), // 标准化邮箱格式

      body("subject")
        .notEmpty().withMessage("邮件主旨不能为空")
        .isLength({ min: 1, max: 200 }).withMessage("邮件主旨长度必须在 1-200 字符之间")
        .trim(),

      body("html")
        .notEmpty().withMessage("邮件内容不能为空")
        .isLength({ min: 1, max: 50000 }).withMessage("邮件内容长度必须在 1-50000 字符之间"),
    ];
  };
}

module.exports = new MailValidator();
