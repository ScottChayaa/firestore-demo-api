const nodemailer = require("nodemailer");
const logger = require("./logger");

// 驗證必要的環境變數
const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.warn(`環境變數 ${envVar} 未設置，郵件功能將不可用`);
  }
}

// 解析 SMTP 加密方式
const smtpEncryption = (process.env.SMTP_ENCRYPTION || "tls").toLowerCase();
const smtpPort = parseInt(process.env.SMTP_PORT) || (smtpEncryption === "ssl" ? 465 : 587);

// 建立 SMTP 傳輸器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: smtpPort,
  secure: smtpEncryption === "ssl", // true for SSL (port 465)
  requireTLS: smtpEncryption === "tls" || smtpEncryption === "starttls", // true for STARTTLS (port 587)
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    // TLS 憑證驗證（開發環境可設為 false，生產環境建議 true，若沒設定則預設為 true）
    //   正常情況：Gmail 的 SSL 憑證一定有效，設為 true 沒問題
    //   可能需要設為 false 的情況：
    //     1. 自簽憑證（Self-signed certificate） - 公司內部測試用 SMTP 伺服器
    //     2. 憑證過期 - 測試環境的 SMTP 伺服器憑證過期
    //     3. 開發環境 - 本地測試不想處理憑證問題
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
  },
  // 超時設定（避免 DNS 或網路問題導致卡住）
  connectionTimeout: parseInt(process.env.SMTP_CONNECTION_TIMEOUT) || 15000, // 連線超時（預設 15 秒）
  greetingTimeout: parseInt(process.env.SMTP_GREETING_TIMEOUT) || 10000,     // 問候超時（預設 10 秒）
  socketTimeout: parseInt(process.env.SMTP_SOCKET_TIMEOUT) || 30000,         // Socket 超時（預設 30 秒）
});

module.exports = transporter;
