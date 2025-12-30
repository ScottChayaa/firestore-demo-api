#!/usr/bin/env node

/**
 * SMTP 連線測試工具
 * 用途：驗證 Gmail SMTP 設定是否正確
 */

require("dotenv").config();
require("module-alias/register");
const nodemailer = require("nodemailer");
const logger = require("@/config/logger");

// 顯示當前 SMTP 設定（隱藏密碼）
console.log("\n========================================");
console.log("📧 SMTP 設定檢查");
console.log("========================================\n");

const smtpEncryption = (process.env.SMTP_ENCRYPTION || "tls").toLowerCase();
const smtpPort = parseInt(process.env.SMTP_PORT) || (smtpEncryption === "ssl" ? 465 : 587);

const config = {
  host: process.env.SMTP_HOST || "smtp.gmail.com",
  encryption: smtpEncryption,
  port: smtpPort,
  user: process.env.SMTP_USER,
  hasPassword: !!process.env.SMTP_PASSWORD,
  passwordLength: process.env.SMTP_PASSWORD?.length || 0,
};

console.log(`SMTP 主機: ${config.host}`);
console.log(`加密方式: ${config.encryption}`);
console.log(`連接埠: ${config.port}`);
console.log(`使用者帳號: ${config.user || "未設定"}`);
console.log(`應用程式密碼: ${config.hasPassword ? `已設定 (${config.passwordLength} 字元)` : "未設定"}`);

// 檢查必要設定
const errors = [];

if (!config.user) {
  errors.push("❌ SMTP_USER 未設定");
}

if (!config.hasPassword) {
  errors.push("❌ SMTP_PASSWORD 未設定");
}

if (config.user && !config.user.includes("@")) {
  errors.push("⚠️  SMTP_USER 格式錯誤（應為完整 email，例：user@gmail.com）");
}

if (config.hasPassword && config.passwordLength < 16) {
  errors.push("⚠️  SMTP_PASSWORD 長度過短（Gmail 應用程式密碼通常為 16 字元）");
}

if (errors.length > 0) {
  console.log("\n========================================");
  console.log("🚨 設定錯誤");
  console.log("========================================\n");
  errors.forEach(err => console.log(err));
  console.log("\n請參考 .env.example 中的 Gmail SMTP 設定指南");
  process.exit(1);
}

// 測試 DNS 解析
console.log("\n========================================");
console.log("🌐 測試 DNS 解析");
console.log("========================================\n");

const dns = require("dns").promises;

async function testDNS() {
  try {
    console.log(`正在解析 ${config.host}...`);
    const addresses = await dns.resolve4(config.host);
    console.log(`✅ DNS 解析成功: ${addresses.join(", ")}\n`);
    return true;
  } catch (error) {
    console.log(`❌ DNS 解析失敗: ${error.message}\n`);
    console.log("可能的解決方案：");
    console.log("1. 檢查網路連線");
    console.log("2. 檢查 WSL DNS 設定：cat /etc/resolv.conf");
    console.log("3. 嘗試使用 Google DNS：echo 'nameserver 8.8.8.8' | sudo tee /etc/resolv.conf\n");
    return false;
  }
}

// 測試 SMTP 連線
console.log("========================================");
console.log("🔌 測試 SMTP 連線");
console.log("========================================\n");

const transporter = nodemailer.createTransport({
  host: config.host,
  port: config.port,
  secure: smtpEncryption === "ssl",
  requireTLS: smtpEncryption === "tls" || smtpEncryption === "starttls",
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASSWORD,
  },
  tls: {
    rejectUnauthorized: process.env.SMTP_REJECT_UNAUTHORIZED !== "false",
  },
  // 超時設定
  connectionTimeout: 10000, // 連線超時 10 秒
  greetingTimeout: 10000,   // 問候超時 10 秒
  socketTimeout: 10000,     // Socket 超時 10 秒
  debug: true,              // 啟用 debug 模式
  logger: true,             // 啟用 logger
});

async function testConnection() {
  // 先測試 DNS 解析
  const dnsOk = await testDNS();
  if (!dnsOk) {
    console.log("⚠️  DNS 解析失敗，跳過 SMTP 連線測試\n");
    process.exit(1);
  }

  try {
    console.log("正在連線到 Gmail SMTP...\n");

    // 驗證連線
    await transporter.verify();

    console.log("\n========================================");
    console.log("✅ SMTP 連線測試成功！");
    console.log("========================================\n");
    console.log("你的 Gmail SMTP 設定正確，可以正常發送郵件。\n");

    process.exit(0);
  } catch (error) {
    console.log("\n========================================");
    console.log("❌ SMTP 連線測試失敗");
    console.log("========================================\n");

    // 解析常見錯誤
    if (error.message.includes("535")) {
      console.log("🔐 認證失敗 - 請檢查以下項目：\n");
      console.log("1. 確認你使用的是「應用程式密碼」而非 Gmail 帳戶密碼");
      console.log("   ➜ 前往：https://myaccount.google.com/apppasswords");
      console.log("   ➜ 選擇「應用程式」→「郵件」");
      console.log("   ➜ 選擇「裝置」→「其他（自訂名稱）」");
      console.log("   ➜ 產生密碼後，複製 16 位數密碼（不含空格）\n");
      console.log("2. 確認 Gmail 帳戶已啟用「兩步驟驗證」");
      console.log("   ➜ 前往：https://myaccount.google.com/security");
      console.log("   ➜ 啟用「兩步驟驗證」\n");
      console.log("3. 檢查 .env 檔案中的 SMTP_USER 和 SMTP_PASSWORD");
      console.log("   ➜ SMTP_USER 應為完整 email（例：yourname@gmail.com）");
      console.log("   ➜ SMTP_PASSWORD 為 16 位數應用程式密碼（無空格）\n");
    } else if (error.message.includes("ECONNREFUSED")) {
      console.log("🔌 連線被拒絕 - 請檢查：\n");
      console.log("1. 網路連線是否正常");
      console.log("2. 防火牆是否阻擋 SMTP port");
      console.log(`3. Port ${config.port} 是否正確\n`);
    } else if (error.message.includes("ETIMEDOUT") || error.message.includes("timeout")) {
      console.log("⏱️  連線逾時 - 請檢查：\n");
      console.log("1. 網路連線是否穩定");
      console.log("2. Gmail SMTP 伺服器是否可連線");
      console.log("3. WSL 防火牆設定");
      console.log(`4. Port ${config.port} 是否被封鎖\n`);
    } else if (error.code === "ESOCKET" || error.code === "ECONNECTION") {
      console.log("🔌 Socket 連線錯誤 - 請檢查：\n");
      console.log("1. 網路設定是否正確");
      console.log("2. WSL 與 Windows 網路橋接是否正常");
      console.log("3. 嘗試重啟 WSL：wsl --shutdown\n");
    } else {
      console.log("錯誤訊息：");
      console.log(error.message);
      console.log("");
    }

    console.log("完整錯誤：");
    console.log(error);
    console.log("");

    process.exit(1);
  }
}

testConnection();
