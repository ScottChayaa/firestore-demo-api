const mailService = require("@/utils/mailService");
const logger = require("@/config/logger");
const { BadError } = require("@/middleware/errorHandler");

class MailController {
  /**
   * 发送邮件
   * POST /api/send-email
   */
  sendEmail = async (req, res) => {
    const { to, subject, html } = req.body;

    // 检查 SMTP 配置
    if (!process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
      throw new BadError("邮件服务未配置，请联系管理员");
    }

    // 发送邮件
    const result = await mailService.sendMail({
      to,
      subject,
      html,
    });

    logger.info({
      ip: req.ip,
      to: to,
      subject: subject,
    }, "邮件发送请求成功");

    res.status(200).json({
      success: true,
      message: "邮件发送成功",
      data: {
        messageId: result.messageId,
      },
    });
  };
}

module.exports = new MailController();
