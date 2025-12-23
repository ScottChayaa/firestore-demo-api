const transporter = require("@/config/mail");
const logger = require("@/config/logger");

class MailService {
  /**
   * 發送 HTML 郵件
   * @param {Object} options - 郵件選項
   * @param {string} options.to - 收件人信箱
   * @param {string} options.subject - 郵件主旨
   * @param {string} options.html - HTML 內容
   * @param {string} [options.text] - 純文字內容（可選）
   * @returns {Promise<Object>} 發送結果
   */
  async sendMail({ to, subject, html, text }) {
    try {
      // 郵件選項
      const mailOptions = {
        from: {
          name: process.env.SMTP_FROM_NAME || "Firestore Demo API",
          address: process.env.SMTP_FROM_EMAIL,
        },
        to: to,
        subject: subject,
        html: html,
        text: text || this.stripHtml(html), // 自動生成純文字版本
      };

      // 發送郵件
      const info = await transporter.sendMail(mailOptions);

      logger.info({
        messageId: info.messageId,
        to: to,
        subject: subject,
      }, "郵件發送成功");

      return {
        success: true,
        messageId: info.messageId,
      };
    } catch (error) {
      logger.error({
        err: error,
        to: to,
        subject: subject,
      }, "郵件發送失敗");

      throw error;
    }
  }

  /**
   * 簡單的 HTML 標籤移除（生成純文字版本）
   * @param {string} html - HTML 內容
   * @returns {string} 純文字
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
