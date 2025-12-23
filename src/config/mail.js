const nodemailer = require("nodemailer");
const logger = require("./logger");

// 验证必要的环境变量
const requiredEnvVars = [
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_USER",
  "SMTP_PASSWORD",
  "SMTP_FROM_EMAIL",
];

for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    logger.warn(`环境变量 ${envVar} 未设置，邮件功能将不可用`);
  }
}

// 创建 SMTP 传输器
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === "true", // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
});

module.exports = transporter;
