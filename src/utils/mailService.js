const transporter = require("@/config/mail");
const logger = require("@/config/logger");

class MailService {
  /**
   * 发送 HTML 邮件
   * @param {Object} options - 邮件选项
   * @param {string} options.to - 收件人邮箱
   * @param {string} options.subject - 邮件主旨
   * @param {string} options.html - HTML 内容
   * @param {string} [options.text] - 纯文本内容（可选）
   * @returns {Promise<Object>} 发送结果
   */
  async sendMail({ to, subject, html, text }) {
    try {
      // 邮件选项
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || "Firestore Demo API",
          address: process.env.SMTP_FROM_EMAIL,
        },
        to: to,
        subject: subject,
        html: html,
        text: text || this.stripHtml(html), // 自动生成纯文本版本
      };

      // 发送邮件
      const info = await transporter.sendMail(mailOptions);

      logger.info({
        messageId: info.messageId,
        to: to,
        subject: subject,
      }, "邮件发送成功");

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error({
        err: error,
        to: to,
        subject: subject,
      }, "邮件发送失败");

      throw error;
    }
  }

  /**
   * 简单的 HTML 标签移除（生成纯文本版本）
   * @param {string} html - HTML 内容
   * @returns {string} 纯文本
   */
  stripHtml(html) {
    return html
      .replace(/<style[^>]*>.*<\/style>/gm, "")
      .replace(/<script[^>]*>.*<\/script>/gm, "")
      .replace(/<[^>]+>/gm, "")
      .replace(/\s\s+/g, " ")
      .trim();
  }
}

module.exports = new MailService();
