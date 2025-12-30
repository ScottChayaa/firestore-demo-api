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
    // TLS 憑證驗證（開發環境可設為 false，生產環境建議 true）
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
  },
});

module.exports = transporter;
