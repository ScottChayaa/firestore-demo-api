# Firebase 憑證說明

本文檔詳細說明 Firebase 專案中兩種不同憑證的用途、差異和安全性考量。

---

## 📋 目錄

- [快速概覽](#快速概覽)
- [FIREBASE_WEB_API_KEY](#firebase_web_api_key)
- [firebase-service-account.json](#firebase-service-accountjson)
- [詳細對比](#詳細對比)
- [本專案的實際應用](#本專案的實際應用)
- [為什麼登入要用 Web API Key？](#為什麼登入要用-web-api-key)
- [安全性最佳實踐](#安全性最佳實踐)
- [常見問題 FAQ](#常見問題-faq)

---

## 🎯 快速概覽

| 特性 | FIREBASE_WEB_API_KEY | firebase-service-account.json |
|------|----------------------|-------------------------------|
| **類型** | 公開金鑰 | 私密憑證（含私鑰） |
| **使用位置** | 前端 / 後端都可以 | 只能在後端 |
| **權限** | 受 Security Rules 限制 | 管理員權限（繞過 Rules） |
| **安全性** | 可以公開 | 絕對不能洩漏 |
| **用途** | 識別專案、呼叫 REST API | 後台管理、批量操作 |

**簡單記法**：
- 🌐 **Web API Key** = 前端、用戶操作、受限權限
- 🔐 **Service Account** = 後端、管理員操作、完整權限

---

## 🔑 FIREBASE_WEB_API_KEY

### 定義

**Firebase Web API Key** 是一個公開的識別金鑰，用於識別你的 Firebase 專案。

**格式範例**：
```
AIzaSyAWotnmc1TISyxxxxxxxxxxxxxx
```

### 用途

#### 1. 前端 Firebase SDK 初始化

```javascript
// 前端 JavaScript
const firebaseConfig = {
  apiKey: "AIzaSyAWotnmc1TISyxxxxxxxxxxxxxx",  // Web API Key
  authDomain: "liang-dev.firebaseapp.com",
  projectId: "liang-dev"
};
firebase.initializeApp(firebaseConfig);
```

#### 2. 呼叫 Firebase REST API

```javascript
// 後端 Node.js - 登入驗證
const response = await axios.post(
  `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
  { email, password, returnSecureToken: true }
);
```

### 在本專案中的使用場景

**使用位置**：`src/controllers/authController.js`

```javascript
async function login(req, res) {
  const apiKey = process.env.FIREBASE_WEB_API_KEY;

  // 使用 Web API Key 呼叫 Firebase REST API
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    { email, password, returnSecureToken: true }
  );

  // 取得用戶的 ID Token
  const { idToken, refreshToken, expiresIn } = response.data;
}
```

**用來做什麼**：
- 讓用戶用密碼登入
- 取得用戶的 ID Token（用於後續 API 驗證）
- 模擬前端行為的 API 呼叫

### 安全性

✅ **可以安全公開**
- 這個金鑰會出現在前端網頁的原始碼中
- 安全性由 Firestore Security Rules 控制
- 無法用它執行管理員操作

❌ **不能做的事情**
- 批量建立用戶
- 刪除其他用戶
- 繞過 Security Rules 讀取資料

### 取得方式

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇你的專案
3. 點擊左上角的齒輪圖示 > **Project Settings**
4. 在「General」標籤頁中，向下捲動到「Your apps」區段
5. 複製 **Web API Key** 欄位的值

或直接開啟：
```
https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/general
```

---

## 📄 firebase-service-account.json

### 定義

**Service Account Key** 是一個包含私鑰的 JSON 檔案，代表伺服器端的「管理員身份證」。

**檔案結構**：
```json
{
  "type": "service_account",
  "project_id": "liang-dev",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n",
  "client_email": "firebase-adminsdk-xxxxx@liang-dev.iam.gserviceaccount.com",
  "client_id": "...",
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "client_x509_cert_url": "...",
  "universe_domain": "googleapis.com"
}
```

### 用途

#### 1. 初始化 Firebase Admin SDK

```javascript
// 後端 Node.js
const admin = require('firebase-admin');
const serviceAccount = require('./firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  projectId: "liang-dev"
});
```

#### 2. 執行管理員操作

```javascript
// 建立用戶（不受 Security Rules 限制）
await admin.auth().createUser({ email, password });

// 讀取所有資料（繞過 Security Rules）
await admin.firestore().collection('users').get();

// 刪除用戶
await admin.auth().deleteUser(uid);
```

### 在本專案中的使用場景

**使用位置**：
- `src/config/firebase.js` - 初始化 Admin SDK
- `src/controllers/authController.js` - 註冊時建立用戶
- `src/utils/seedData.js` - 批量建立測試用戶

**範例 1：註冊功能**
```javascript
// src/controllers/authController.js
async function register(req, res) {
  const { email, password, name, phone } = req.body;

  // 使用 Service Account 建立 Firebase Auth 用戶
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  // 建立 Firestore document
  await db.collection('members').doc(userRecord.uid).set({
    name, email, phone
  });
}
```

**範例 2：Seed 腳本**
```javascript
// src/utils/seedData.js
async function seedMembers() {
  // 批量建立 100 個用戶（需要管理員權限）
  for (let i = 1; i <= 100; i++) {
    await auth.createUser({
      email: `user${i}@example.com`,
      password: 'qwer1234',
      displayName: generateName(),
    });
  }
}
```

### 安全性

❌ **絕對不能公開**
- 包含私鑰（private_key），可完全控制專案
- 可以建立/刪除任何用戶
- 可以讀寫所有資料（繞過 Security Rules）
- 可以刪除整個資料庫

⚠️ **保護措施**
- 必須加入 `.gitignore`
- 不能提交到 Git 倉庫
- 不能放在前端程式碼中
- 只能在伺服器端使用
- Cloud Run 部署時使用 Base64 環境變數

### 取得方式

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇你的專案
3. 點擊左上角的齒輪圖示 > **Project Settings**
4. 選擇「Service accounts」標籤頁
5. 點擊「**Generate new private key**」按鈕
6. 在彈出視窗中點擊「**Generate key**」
7. 下載的 JSON 檔案重新命名為 `firebase-service-account.json`
8. 將檔案放在專案根目錄（與 `package.json` 同層）

或直接開啟：
```
https://console.firebase.google.com/project/YOUR_PROJECT_ID/settings/serviceaccounts/adminsdk
```

---

## 📊 詳細對比

### 功能對比

| 功能 | Web API Key | Service Account |
|------|------------|-----------------|
| 前端 Firebase SDK 初始化 | ✅ 主要用途 | ❌ 不適用 |
| 後端 Admin SDK 初始化 | ❌ 無法使用 | ✅ 主要用途 |
| 用戶登入（取得 token） | ✅ 透過 REST API | ❌ Admin SDK 無此功能 |
| 建立用戶 | ❌ 無法使用 | ✅ auth.createUser() |
| 讀取 Firestore | ✅ 受 Rules 限制 | ✅ 不受 Rules 限制 |
| 寫入 Firestore | ✅ 受 Rules 限制 | ✅ 不受 Rules 限制 |
| 批量操作 | ❌ 效能差、受限 | ✅ 高效、不受限 |
| 刪除用戶 | ❌ 無法使用 | ✅ auth.deleteUser() |

### 安全性對比

| 安全考量 | Web API Key | Service Account |
|---------|------------|-----------------|
| 可以公開？ | ✅ 是（會出現在前端） | ❌ 絕對不可以 |
| 可以提交到 Git？ | ✅ 是 | ❌ 絕對不可以 |
| 需要加入 .gitignore？ | ❌ 不需要 | ✅ 必須 |
| 洩漏後的風險 | 低（受 Rules 保護） | 極高（完全控制權） |
| 權限範圍 | 用戶級別 | 管理員級別 |

### 使用場景對比

| 場景 | 使用什麼 | 原因 |
|------|---------|------|
| React/Vue 前端應用 | Web API Key | 前端 SDK 需要 |
| 用戶註冊表單（前端） | Web API Key | 受 Rules 保護 |
| 用戶登入表單（前端） | Web API Key | 取得 ID Token |
| 後端 API 註冊端點 | Service Account | 需要管理員權限建立用戶 |
| 後端 API 登入端點 | Web API Key | 模擬前端登入行為 |
| Seed 腳本（批量建立） | Service Account | 需要批量操作權限 |
| Cloud Functions | Service Account | 後端邏輯 |
| CI/CD 部署腳本 | Service Account | 自動化操作 |

---

## 🎯 本專案的實際應用

### 場景 1：用戶註冊（POST /api/auth/register）

```javascript
// src/controllers/authController.js
async function register(req, res) {
  const { email, password, name, phone } = req.body;

  // ✅ 使用 Service Account（firebase-service-account.json）
  // 原因：需要管理員權限建立 Firebase Auth 用戶
  const userRecord = await auth.createUser({
    email,
    password,
    displayName: name,
  });

  // ✅ 使用 Service Account
  // 原因：需要寫入 Firestore（可繞過 Rules）
  await db.collection('members').doc(userRecord.uid).set({
    name, email, phone,
    createdAt: FieldValue.serverTimestamp(),
  });

  res.status(201).json({
    data: { uid: userRecord.uid, email, name, phone }
  });
}
```

**為什麼不用 Web API Key？**
- Web API Key 無法呼叫 `auth.createUser()`
- 前端 SDK 的註冊功能會直接註冊，但我們需要同步建立 Firestore document
- 後端註冊可以控制流程，確保 Auth 和 Firestore 同步建立

---

### 場景 2：用戶登入（POST /api/auth/login）

```javascript
// src/controllers/authController.js
async function login(req, res) {
  const { email, password } = req.body;

  // ✅ 使用 Web API Key（FIREBASE_WEB_API_KEY）
  // 原因：需要取得用戶的 ID Token
  const apiKey = process.env.FIREBASE_WEB_API_KEY;
  const response = await axios.post(
    `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
    { email, password, returnSecureToken: true }
  );

  const { idToken, refreshToken, expiresIn, localId } = response.data;

  // ✅ 使用 Service Account（firebase-service-account.json）
  // 原因：讀取 Firestore 中的會員資料
  const memberDoc = await db.collection('members').doc(localId).get();

  res.json({
    data: { idToken, refreshToken, expiresIn, user: memberDoc.data() }
  });
}
```

**為什麼用 Web API Key 而不用 Service Account？**
- Service Account 沒有「用密碼登入」的功能
- Admin SDK 沒有 `auth.signInWithPassword()` 方法
- 需要透過 Firebase REST API 才能驗證密碼並取得用戶 token

---

### 場景 3：測試資料生成（npm run seed）

```javascript
// src/utils/seedData.js
async function seedMembers() {
  // ✅ 使用 Service Account（firebase-service-account.json）
  // 原因：需要批量建立 100 個 Firebase Auth 用戶
  for (let i = 1; i <= 100; i++) {
    const userRecord = await auth.createUser({
      email: `user${i}@example.com`,
      password: 'qwer1234',
      displayName: generateName(),
    });

    // ✅ 使用 Service Account
    // 原因：批量寫入 Firestore
    await db.collection('members').doc(userRecord.uid).set({
      name: generateName(),
      email: `user${i}@example.com`,
      phone: generatePhone(),
      createdAt: FieldValue.serverTimestamp(),
    });
  }
}
```

**為什麼不用 Web API Key？**
- 需要批量建立用戶，效能要求高
- Service Account 可以直接使用 Admin SDK，不受限制
- Web API Key 需要逐一呼叫 REST API，速度慢且有頻率限制

---

## 🤔 為什麼登入要用 Web API Key？

這是一個常見的疑問：既然我們有 Service Account（管理員權限），為什麼登入還要用 Web API Key？

### 問題：Service Account 無法取得用戶 Token

```javascript
// ❌ Admin SDK 沒有這個方法
admin.auth().signInWithPassword(email, password)  // 不存在！

// ❌ Admin SDK 無法驗證密碼
admin.auth().verifyPassword(email, password)      // 不存在！

// ✅ Admin SDK 只能做管理操作
admin.auth().createUser()     // 建立用戶
admin.auth().deleteUser()     // 刪除用戶
admin.auth().getUserByEmail() // 查詢用戶
admin.auth().listUsers()      // 列出用戶
```

### 解決方案：使用 Firebase REST API

Firebase 提供了 **Identity Toolkit REST API**，可以模擬前端的登入行為：

```javascript
POST https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key={WEB_API_KEY}

Request Body:
{
  "email": "user@example.com",
  "password": "password123",
  "returnSecureToken": true
}

Response:
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",  // ← 用戶的 ID Token
  "email": "user@example.com",
  "refreshToken": "...",
  "expiresIn": "3600",
  "localId": "ABC123..."  // ← 用戶的 UID
}
```

### 為什麼需要用戶的 ID Token？

**用戶的 ID Token** 是用來驗證後續 API 請求的：

```javascript
// 用戶登入後，前端取得 idToken
const { idToken } = loginResponse.data;

// 用戶呼叫受保護的 API，帶上 token
fetch('/api/orders', {
  headers: {
    'Authorization': `Bearer ${idToken}`  // ← 用戶的身份證明
  }
});

// 後端驗證 token
const decodedToken = await admin.auth().verifyIdToken(idToken);
// decodedToken.uid 就是用戶的 UID
```

### Service Account vs User Token 的差異

| 特性 | Service Account | User Token (ID Token) |
|------|----------------|-----------------------|
| 代表的身份 | 伺服器/管理員 | 特定用戶 |
| 權限範圍 | 完整管理權限 | 該用戶的權限 |
| 有效期限 | 永久（除非吊銷） | 1 小時（可刷新） |
| 用途 | 後端內部操作 | 用戶身份驗證 |
| 可以查詢所有資料？ | ✅ 是 | ❌ 否（受 Rules 限制） |

### 總結

```
為什麼登入要用 Web API Key？

因為：
1. Service Account 無法驗證密碼
2. Admin SDK 沒有 signInWithPassword 方法
3. 需要透過 REST API 才能取得用戶的 ID Token
4. ID Token 是用戶在後續 API 中的「身份證」
```

---

## 🔒 安全性最佳實踐

### ✅ 可以公開的內容

這些資訊可以安全地放在前端或公開程式碼中：

```javascript
// .env（可以提交到 Git）
FIREBASE_PROJECT_ID=liang-dev
FIREBASE_WEB_API_KEY=AIzaSyAWotnmc1TISyxxxxxxxxxxxxxx
NODE_ENV=production
PORT=8080
```

```javascript
// 前端程式碼（會被公開）
const firebaseConfig = {
  apiKey: "AIzaSyAWotnmc1TISyxxxxxxxxxxxxxx",
  authDomain: "liang-dev.firebaseapp.com",
  projectId: "liang-dev",
  storageBucket: "liang-dev.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abcdef123456"
};
```

### ❌ 絕對不能公開的內容

這些必須保密，絕對不能提交到 Git 或暴露在前端：

```javascript
// .env.local（絕對不能提交到 Git）
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

// firebase-service-account.json（絕對不能提交到 Git）
{
  "type": "service_account",
  "project_id": "liang-dev",
  "private_key_id": "...",
  "private_key": "-----BEGIN PRIVATE KEY-----\n...",  // ← 私鑰！
  "client_email": "firebase-adminsdk-xxxxx@liang-dev.iam.gserviceaccount.com"
}
```

### 🛡️ .gitignore 設定

**必須加入的項目**：

```.gitignore
# 環境變數（包含 Service Account 路徑）
.env
.env.local
.env.*.local

# Service Account Keys
firebase-service-account.json
*-service-account.json
serviceAccountKey.json
*-key.json

# Google Cloud credentials
credentials.json
gcloud-key.json
```

### 🚨 如果不小心洩漏了怎麼辦？

#### Web API Key 洩漏
- **風險**：低（受 Security Rules 保護）
- **處理**：
  1. 檢查 Firestore Security Rules 是否嚴謹
  2. 如果擔心，可以建立新的 Web App 並取得新的 API Key
  3. 更新應用程式使用新的 API Key

#### Service Account 洩漏
- **風險**：極高（完全控制專案）
- **處理**：
  1. **立即**前往 Firebase Console 刪除該 Service Account
  2. 建立新的 Service Account
  3. 更新所有使用該憑證的服務
  4. 檢查專案是否有異常活動
  5. 考慮啟用 Cloud Audit Logs 監控
  6. 如果資料已被竄改，考慮從備份恢復

**刪除 Service Account 步驟**：
```
Firebase Console
→ Project Settings
→ Service Accounts
→ Manage service account permissions
→ GCP IAM Console
→ 找到該 Service Account
→ Delete
```

---

## ❓ 常見問題 FAQ

### Q1: 為什麼有兩種憑證？不能統一嗎？

**答**：這是基於**安全性和職責分離**的設計：
- **Web API Key**：設計給前端使用，權限受限，可以公開
- **Service Account**：設計給後端使用，權限完整，必須保密

如果只用一種，要嘛前端無權限（無法運作），要嘛權限太大（安全風險）。

---

### Q2: 我可以只用 Service Account 嗎？

**答**：可以，但有限制：
- ✅ 可以用於後端所有操作
- ❌ 無法用於前端（會洩漏私鑰）
- ❌ 無法驗證密碼登入（Admin SDK 沒這功能）
- ❌ 無法取得用戶的 ID Token

所以實務上，後端同時需要兩種憑證。

---

### Q3: Web API Key 可以在 .env 中嗎？

**答**：可以，但不是必須：
- 如果是**純後端**專案：可以放在 .env（方便管理）
- 如果是**前後端分離**：前端必須直接寫在程式碼中（因為會被編譯到 bundle）

---

### Q4: Service Account 可以設定不同權限嗎？

**答**：可以！在 GCP IAM 中可以控制：
- **最小權限原則**：只給需要的權限
- 例如：只給 Firestore 讀寫權限，不給 Authentication 權限
- 建議為不同用途建立不同的 Service Account

---

### Q5: 如何在 Cloud Run 中安全使用 Service Account？

**答**：有三種方式：

**方式 1：使用 Base64 環境變數**（推薦）
```bash
# 轉換為 Base64
base64 firebase-service-account.json > encoded.txt

# 設定環境變數
gcloud run services update YOUR_SERVICE \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)"
```

**方式 2：使用 Secret Manager**
```bash
# 上傳到 Secret Manager
gcloud secrets create firebase-service-account \
  --data-file=firebase-service-account.json

# Cloud Run 掛載 Secret
gcloud run services update YOUR_SERVICE \
  --set-secrets="/secrets/firebase-sa=firebase-service-account:latest"
```

**方式 3：使用 Workload Identity**（最安全，但設定複雜）
- 讓 Cloud Run 直接使用 GCP 的身份
- 不需要傳遞 Service Account Key
- 參考：https://cloud.google.com/run/docs/securing/service-identity

---

### Q6: 測試環境和正式環境要用不同的憑證嗎？

**答**：**強烈建議**使用不同的 Firebase 專案：

```
開發環境：
- 專案：my-app-dev
- Web API Key: AIzaSyA...
- Service Account: dev-service-account.json

正式環境：
- 專案：my-app-prod
- Web API Key: AIzaSyB...
- Service Account: prod-service-account.json
```

**好處**：
- 測試資料不會影響正式資料
- 權限隔離更安全
- 可以獨立調整配置

---

## 📚 相關文檔

- [Firebase 專案設定](./firebase-setup.md)
- [Service Account 設定](./service-account.md)
- [環境變數設定](./environment-variables.md)
- [本地開發指南](./local-development.md)
- [Cloud Run 部署](./cloud-run-deployment.md)

---

## 🔗 官方文檔

- [Firebase Authentication REST API](https://firebase.google.com/docs/reference/rest/auth)
- [Firebase Admin SDK Authentication](https://firebase.google.com/docs/auth/admin)
- [Service Account Keys](https://cloud.google.com/iam/docs/service-account-creds)
- [Firebase Security Best Practices](https://firebase.google.com/docs/rules/security)

---

**最後更新**：2025-10-30
