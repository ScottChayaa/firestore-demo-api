const mailService = require("@/utils/mailService");
const logger = require("@/config/logger");
const { BadError } = require("@/middleware/errorHandler");

class MailController {
  /**
   * 發送郵件
   * POST /api/send-email
   */
  sendEmail = async (req, res) => {
    const { to, subject, html } = req.body;

    // 檢查 SMTP 配置
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new BadError("郵件服務未配置，請聯絡管理員");
    }

    // 發送郵件
    const result = await mailService.sendMail({
      to,
      subject,
      html,
    });

    logger.info({
      ip: req.ip,
      to: to,
      subject: subject,
    }, "郵件發送請求成功");

    res.status(200).json({
      success: true,
      message: "郵件發送成功",
      data: {
        messageId: result.messageId,
      },
    });
  };
}

module.exports = new MailController();
