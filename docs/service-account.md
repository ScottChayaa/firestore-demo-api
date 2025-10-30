# Firebase Service Account Key 設定指南

本文檔詳細說明如何取得和設定 Firebase Service Account Key。

---

## 📋 目錄

- [什麼是 Service Account Key](#什麼是-service-account-key)
- [取得方式一：Firebase Console](#取得方式一firebase-console)
- [參數說明](#參數說明)
- [使用方式](#使用方式)
- [安全注意事項](#安全注意事項)
- [常見問題](#常見問題)

---

## 🔑 什麼是 Service Account Key

**Service Account Key** 是一個 JSON 格式的憑證檔案，包含：
- 專案識別資訊
- RSA 私鑰（用於身份驗證）
- OAuth2 相關設定

此憑證讓您的後端應用程式能夠以伺服器對伺服器的方式存取 Firebase 服務，無需用戶登入。

### 權限範圍

擁有 Service Account Key 的應用程式可以：
- ✅ 完整存取 Firestore Database
- ✅ 驗證 Firebase Auth Token
- ✅ 存取 Firebase Storage
- ✅ 發送 Firebase Cloud Messaging

⚠️ **因此必須妥善保管，絕不可外洩！**


---

## 🔐 取得方式：Firebase Console

如何取得 firebase-service-account.json

### 步驟 1：開啟 Firebase Console

```
https://console.firebase.google.com/
```

### 步驟 2：選擇專案

點擊您的 Firebase 專案卡片。

### 步驟 3：進入 Project Settings

1. 點擊左上角的 **齒輪圖示** ⚙️
2. 選擇 **「Project Settings」**（專案設定）

### 步驟 4：前往 Service Accounts

點擊上方的 **「Service Accounts」** 標籤。

### 步驟 5：生成新的私鑰

1. 確認已選擇 **「Firebase Admin SDK」** 區塊
2. 選擇程式語言：**Node.js**
3. 點擊 **「Generate new private key」** 按鈕
4. 彈出確認視窗，顯示警告訊息
5. 點擊 **「Generate key」** 按鈕

### 步驟 6：下載檔案

- JSON 檔案會自動下載
- 檔案名稱格式：`your-project-name-firebase-adminsdk-xxxxx-1234567890.json`

### 步驟 7：重新命名並放置

```bash
# 重新命名檔案
mv ~/Downloads/your-project-xxxxx.json firebase-service-account.json

# 移動到專案根目錄
mv firebase-service-account.json /path/to/firestore-demo-api/
```

## 📖 參數說明

| 欄位 | 說明 | 範例 |
|------|------|------|
| `type` | 憑證類型，固定值 | `service_account` |
| `project_id` | Firebase/GCP 專案 ID | `firestore-demo-12345` |
| `private_key_id` | 私鑰的唯一識別碼 | `abc123...` |
| `private_key` | RSA 私鑰（PEM 格式） | `-----BEGIN PRIVATE KEY-----\n...` |
| `client_email` | Service Account Email | `firebase-adminsdk-xxx@project.iam.gserviceaccount.com` |
| `client_id` | OAuth2 客戶端 ID | `1234567890` |
| `auth_uri` | OAuth2 認證端點 | `https://accounts.google.com/o/oauth2/auth` |
| `token_uri` | Token 取得端點 | `https://oauth2.googleapis.com/token` |
| `auth_provider_x509_cert_url` | 認證提供者憑證 URL | `https://www.googleapis.com/oauth2/v1/certs` |
| `client_x509_cert_url` | 客戶端 X.509 憑證 URL | `https://www.googleapis.com/robot/v1/metadata/x509/...` |
| `universe_domain` | Universe Domain | `googleapis.com` |

### 關鍵欄位

- **`project_id`**：識別您的 Firebase 專案
- **`private_key`**：最重要的欄位，用於身份驗證
- **`client_email`**：Service Account 的身份識別

---

## 🚀 使用方式

### 本地開發環境

**使用檔案路徑**

1. 將 `firebase-service-account.json` 放在專案根目錄
2. 設定 `.env` 檔案：

```env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
```

3. Firebase Admin SDK 會自動讀取

### 線上環境（Cloud Run）

**使用 Base64 編碼**

這樣可以透過環境變數傳遞，無需上傳檔案：

```bash
# 1. 將 JSON 轉為 Base64
base64 firebase-service-account.json > encoded.txt

# 2. 設定到 Cloud Run
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --region asia-east1
```

在應用程式中，Firebase 配置會自動解碼：

```javascript
// src/config/firebase.js 已處理
if (process.env.GOOGLE_CREDENTIALS_BASE64) {
  const serviceAccount = JSON.parse(
    Buffer.from(process.env.GOOGLE_CREDENTIALS_BASE64, 'base64').toString('utf-8')
  );
  credential = admin.credential.cert(serviceAccount);
}
```

---

## 🔒 安全注意事項

### ⚠️ 極度重要

#### 1. 絕對不要提交到 Git

確認 `.gitignore` 包含：

```gitignore
# Firebase
firebase-service-account.json
firebase-service-account-*.json
*-service-account.json
```

驗證檔案未被追蹤：

```bash
git status --ignored
```

#### 2. 私鑰具有完整權限

`private_key` 欄位的洩漏後果：
- ❌ 他人可完整存取您的 Firestore 資料
- ❌ 可以讀取、修改、刪除所有文檔
- ❌ 可以驗證任何 Firebase Auth Token
- ❌ 可能產生高額費用

#### 3. 僅在伺服器端使用

**正確用途：**
- ✅ Node.js 後端伺服器
- ✅ Cloud Functions
- ✅ Cloud Run 服務
- ✅ 自動化腳本（伺服器上執行）

**錯誤用途：**
- ❌ 前端網頁應用
- ❌ 行動應用程式（Android/iOS）
- ❌ 客戶端 JavaScript
- ❌ 公開的程式碼倉庫

#### 4. 定期輪替金鑰

建議每 90 天輪替一次：

1. 在 Firebase Console 生成新金鑰
2. 更新應用程式使用新金鑰
3. 驗證新金鑰正常運作
4. 刪除舊金鑰

#### 5. 環境隔離

為不同環境使用不同金鑰：

- 開發環境：`firebase-service-account-dev.json`
- 測試環境：`firebase-service-account-test.json`
- 生產環境：`firebase-service-account-prod.json`

#### 6. 金鑰洩漏應變

如果懷疑金鑰外洩：

1. **立即撤銷**：前往 Firebase Console > Service Accounts > 刪除金鑰
2. **生成新金鑰**：建立並部署新金鑰
3. **檢查日誌**：查看 Firestore 和 Cloud Run 日誌是否有異常存取
4. **通知團隊**：告知相關人員

---

## ❓ 常見問題

### Q1: 錯誤訊息「Permission denied」

**原因：**
- Service Account 權限不足
- Firestore 規則過於嚴格

**解決方式：**

1. 在 GCP Console > IAM，確認 Service Account 擁有「Firebase Admin」角色
2. 檢查 `firestore.rules`，確認規則正確

---

### Q2: 可以共用同一個金鑰嗎？

**開發測試：** 可以
**生產環境：** 不建議

建議為每個環境建立獨立金鑰：
- 便於追蹤和撤銷
- 降低安全風險
- 符合最小權限原則

---

### Q3: 如何驗證金鑰是否有效？

**方法一：啟動應用程式**

```bash
npm run dev
```

看到以下訊息表示成功：
```
✅ Firebase Admin SDK initialized successfully
📦 Project ID: your-project-id
```

**方法二：使用 Firebase CLI**

```bash
# 設定金鑰路徑
export GOOGLE_APPLICATION_CREDENTIALS="./firebase-service-account.json"

# 測試存取
firebase projects:list
```

---

---

## 🔗 相關文檔

- [Firebase 專案設定](./firebase-setup.md)
- [環境變數設定](./environment-variables.md)
- [Cloud Run 部署](./cloud-run-deployment.md)

---

## 📚 官方文檔

- [Firebase Admin SDK Setup](https://firebase.google.com/docs/admin/setup)
- [Google Service Accounts](https://cloud.google.com/iam/docs/service-accounts)
- [Application Default Credentials](https://cloud.google.com/docs/authentication/production)
