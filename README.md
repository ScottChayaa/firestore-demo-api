# Firestore Demo API

> Node.js + Express + Firestore 會員訂單查詢系統
> 支援公開 API（商品瀏覽）和私有 API（會員、訂單管理）

---

## ✨ 功能特色

### 🌐 公開 API（無需驗證）

- **商品瀏覽**：任何人都可以查看商品列表和詳情
- **分類查詢**：按商品分類篩選
- **價格篩選**：按價格範圍搜尋
- **Cursor 分頁**：高效能的分頁機制

### 🔐 私有 API（需 Firebase Auth）

- **會員認證**：
  - 註冊新帳號（同時建立 Firebase Auth 用戶和 Firestore document）
  - 登入取得 ID Token（使用 Firebase REST API）
  - 密碼由 Firebase Auth 安全管理
- **會員管理**：完整的 CRUD 操作
- **訂單管理**：建立、查詢、更新、刪除訂單
  - **權限控制**：會員只能查詢自己的訂單，管理員可查詢所有訂單
- **管理員系統**：
  - 管理員可以查詢/管理所有會員和訂單
- **多條件篩選**：
  - 會員 ID
  - 訂單狀態（pending, processing, completed, cancelled）
  - 日期範圍
  - 金額範圍
- **測試資料生成**：一鍵生成 10 會員 + 50 訂單 + 10 商品 + 1 管理員

### 🚀 技術特點

- ✅ **Firestore 優化**：使用複合索引加速查詢
- ✅ **Cursor 分頁**：避免 offset 效能問題
- ✅ **容器化部署**：支援 Docker 和 Cloud Run
- ✅ **安全防護**：Helmet + CORS + Firebase Auth
- ✅ **錯誤處理**：統一的錯誤回應格式

---

## 🚀 快速開始

### 前置需求

- Node.js 22+
- Firebase 專案（已啟用 Firestore）
- Firebase Service Account Key

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

```bash
# 複製範本
cp .env.example .env
cp env.example.yaml env.yaml

# 編輯 .env, env.yaml 檔案
```

**需要設定的環境變數**：

- `FIREBASE_PROJECT_ID` - Firebase 專案 ID
- `FIREBASE_WEB_API_KEY` - Firebase Web API Key（用於登入驗證）
- `GOOGLE_CREDENTIALS_BASE64` - Base64 編碼的 Service Account 檔案內容
- `FIRESTORE_DATABASE_ID` - 資料庫 ID

> 💡 **了解兩種憑證的差異**：本專案使用兩種 Firebase 憑證，用途不同。詳細說明請參考 [Firebase 憑證說明文檔](./docs/firebase-credentials.md)。

### 3. 取得 Firebase Service Account Key 並編碼成 Base64

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 新增專案: liang-dev
2. 選擇專案 > 專案設定 (Project Settings) > 服務帳戶(Service Accounts)
3. 點擊「產生新的私密金鑰」
4. 下載 JSON 檔案並重新命名為 `firebase-service-account.liang-dev.json`
5. 將檔案放在專案根目錄
6. 生成 encoded.liang-dev.txt > 複製該值到 `.env` 檔案的 `GOOGLE_CREDENTIALS_BASE64` 變數

    ```bash
    base64 firebase-service-account.json | tr -d '\n' > encoded.liang-dev.txt
    ```

### 4. 取得 Firebase Web API Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 建立/選擇專案 : liang-dev
3. 專案設定 > 你的應用程式 > 選取平台「Web」
4. 註冊應用程式: firestore-demo-api
5. 複製 `apiKey` 該值到 `.env` 檔案的 `FIREBASE_WEB_API_KEY` 變數

### 5. 啟用 Firebase Authentication

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 > Authentication > 點擊「開始使用」（如果尚未設定）
3. 在「Sign-in method」標籤頁，啟用「Email/Password」
4. 這會自動啟用 Identity Toolkit API

> ⚠️ **重要**：如果跳過此步驟，執行 `npm run seed` 時會出現錯誤。

### 6. 建立 Firestore 資料庫

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 > Firestore Database > 建立資料庫
3. 資料庫ID: firestore-demo-api
4. 區域: asia-east1 (台灣)


### 7. 部署 Firestore Rules 和 Indexes

```bash
# 安裝 Firebase CLI（如果還沒安裝）
npm install -g firebase-tools

# 登入 (⚠重要)
firebase login

# 確認你有設定哪幾個專案
firebase projects:list

# 切換目前使用專案
firebase use liang-dev

# 部署 Rules 和 Indexes
firebase deploy --only firestore:rules,firestore:indexes
# 部署 Rules 和 Indexes 到指定的專案ID
firebase deploy --only firestore:rules,firestore:indexes --project liang-dev

```

### 8. 生成測試資料

```bash
npm run seed
```

<details>

<summary>❌如果發生權限錯誤</summary>

需到 IAM 設定新增權限

```bash
錯誤 : "code":403,"message":"Caller does not have required permission to use project apple-e9191. Grant the caller the roles/serviceusage.serviceUsageConsumer role, or a custom role with the serviceusage.services.use permission

1. 仔細觀察錯誤內容, 會有類似這段 IAM 的導引設定連結
  - 開啟：https://console.cloud.google.com/iam-admin/iam?project=liang-dev
2. 在 IAM 列表中，找到你的 firebase-adminsdk Service Account
  - 點擊該列右側的「Edit」（鉛筆圖示）
3. 新增必要角色
  - 點擊「+ ADD ANOTHER ROLE」按鈕
  - 搜尋並新增以下角色：
    - 搜尋 roles/serviceusage.serviceUsageConsumer  => 服務使用情形消費者
4. 重新執行測試資料生成
npm run seed

這是因為你使用這專案需要 billing, 所以需要這個權限 
```

</details>

<details>

<summary>❌如果 Authentication 功能無法使用</summary>

```bash
# 錯誤訊息像是:
FirebaseAuthError: There is no configuration corresponding to the provided identifier.
errorInfo: {
  code: 'auth/configuration-not-found',
  message: 'There is no configuration corresponding to the provided identifier.'
}
```

```bash
解法 : 啟用 Firebase Authentication

1. 開啟 Firebase Console
  - https://console.firebase.google.com/project/liang-dev/authentication
2. 如果看到「開始使用」按鈕，點擊它
3. 在「Sign-in method」標籤頁：
  - 點擊「Email/Password」
  - 將「啟用」開關打開
  - 點擊「儲存」
4. 這個操作會自動：
  - 初始化 Firebase Authentication 服務
  - 啟用 Identity Toolkit API
  - 設定必要的配置
```

</details>


### 9. 啟動本地開發伺服器

```bash
npm run dev
```

- [測試 public api](./public.rest)
- [測試 private api](./private.rest)

## 🚢 部署指南

### 部署到 Google Cloud Run

#### 1. 前置準備

- [gcloud 安裝](./docs/gcloud.md)
- [安裝 Google Cloud SDK](https://cloud.google.com/sdk/docs/install)

```bash

# 登入並設定專案
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 啟用所需服務 (專案需綁信用卡) : cloud run, registry
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com

# 前往 Firebase Console > Artifact Registry 
# 設定存放區: my-docker
# 指定單區域位置: asia-east1 (台灣)

# 設定 Docker 對 Google Artifact Registry 的登入憑證
gcloud auth configure-docker asia-east1-docker.pkg.dev

# 建立映像
docker build -t asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1 .

# 推送映像到 Container Registry
docker push asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1

# 本地測試（可選）
docker run -p 8080:8080 \
  --env-file .env \
  --name firestore-demo-api \
  asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1
```

#### 2. 部署到 Cloud Run

**重要**：部署前必須先準備 Base64 編碼的 Firebase 憑證，否則容器將無法啟動。

```bash
# 將 Service Account JSON 轉為 Base64
base64 firebase-service-account.liang-dev.json | tr -d '\n' > encoded.liang-dev.txt

# 部署到 Cloud Run（包含完整環境變數）
gcloud run deploy firestore-demo-api \
  --image asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --env-vars-file env.yaml \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 300 \
  --project liang-dev
```

**參數說明**：

- `--timeout 300`：設定請求逾時為 5 分鐘，給予足夠的啟動時間
- `--platform managed`：表示部署到 全代管 Cloud Run（不是 Cloud Run for Anthos）
- `--allow-unauthenticated`：允許 公網直接訪問（不需要 IAM 登入）。如果拿掉這個，就只能內部或有授權的帳號訪問

#### 3. 部署 Firestore 索引

```bash
# 安裝 Firebase CLI
npm install -g firebase-tools

# 登入
firebase login

# 初始化專案
firebase init firestore

# 部署索引
firebase deploy --only firestore:indexes
```

#### 4. 索引管理流程

本專案提供自動化的索引管理工具，可自動偵測缺失的索引並更新配置檔：

**方式一：完整流程（推薦）**
```bash
# 自動收集缺失索引 + 更新配置檔
npm run sync:indexes
```

**方式二：分步執行**
```bash
# 步驟 1: 收集缺失的索引資訊
npm run collect:indexes

# 步驟 2: 更新 firestore.indexes.json
npm run update:indexes

# 步驟 3: 部署到 Firebase
firebase deploy --only firestore:indexes
```

**工作流程說明**：
1. `collect:indexes` - 執行所有查詢組合，收集需要的索引到 `missing-indexes.json`
2. `update:indexes` - 讀取 `missing-indexes.json`，過濾重複後合併到 `firestore.indexes.json`
3. 部署索引 - 使用 Firebase CLI 將索引部署到雲端

**特點**：
- ✅ 自動偵測所有查詢組合需要的索引
- ✅ 智能去重，避免重複索引
- ✅ 友善的訊息提示
- ✅ 支援增量更新

**新增查詢配置**：

查詢配置檔案位於 `src/config/queryConfigurations/`，採用集中管理的設計：

**新增現有 collection 的查詢組合**：
- 只需修改對應的配置檔案（例如：`orderQueryConfigurations.js`）
- 在 `validQueryCombinations` 陣列中新增查詢組合
- 無需修改腳本程式碼

```javascript
// src/config/queryConfigurations/orderQueryConfigurations.js
const validQueryCombinations = [
  // ... 現有查詢組合
  {
    name: "新的查詢組合",
    params: { status: "pending", orderBy: "createdAt", order: "desc" },
  },
];
```

**新增新 collection 的查詢**：
1. 在 `src/config/queryConfigurations/` 建立新的配置檔案
2. 在 `scripts/collect-indexes.js` 的 `QUERY_CONFIGS` 陣列中新增配置：

```javascript
const QUERY_CONFIGS = [
  // ... 現有配置
  {
    name: "新 Collection 查詢",
    collectionName: "newCollection",
    endpoint: "/api/admin/newCollection",
    requiresAuth: true,
    validQueryCombinations: require("@/config/queryConfigurations/newCollectionQueryConfigurations").validQueryCombinations,
  },
];
```

部署完成後，您將獲得一個 Cloud Run 服務網址，例如：

```bash
https://firestore-demo-api-xxxxx.asia-east1.run.app
```

---

## 🗑️ 完整移除步驟

```bash
# Step 1: 刪除 Cloud Run 服務
gcloud run services delete firestore-demo-api --region asia-east1

# Step 2: 刪除 Container Registry 映像
gcloud container images delete asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api

# Step 3: 清空 Firestore 和 Athentication 資料
npm run clean:all

# Step 4: 刪除 Firebase 專案（透過 Firebase Console）
# 1. 前往 Firebase Console > 專案設定
# 2. 捲動至底部，點擊「Delete Project」
# 3. 輸入專案 ID 確認
# ⚠️ 注意：專案需等待 30 天才會完全刪除
```

---

## 🛠️ 開發說明

### 專案結構

```
firestore-demo-api/
├── scripts/                         # 可執行腳本（根目錄）
│   ├── seed.js                      # 測試資料生成
│   ├── clean-firestore.js           # Firestore 資料清理
│   └── clean-auth.js                # Authentication 用戶清理
├── src/
│   ├── config/
│   │   ├── firebase.js              # Firebase Admin SDK 初始化
│   │   └── logger.js                # 日誌系統配置
│   ├── middleware/
│   │   ├── auth.js                  # Firebase Auth 驗證
│   │   ├── errorHandler.js          # 錯誤處理
│   │   └── validator.js             # 請求驗證
│   ├── controllers/
│   │   ├── memberController.js      # 會員邏輯
│   │   ├── orderController.js       # 訂單邏輯
│   │   └── productController.js     # 商品邏輯
│   ├── routes/
│   │   ├── members.js               # 會員路由
│   │   ├── orders.js                # 訂單路由
│   │   └── products.js              # 商品路由
│   ├── utils/
│   │   └── firestore.js             # Firestore 工具函數
│   └── app.js                       # Express 應用
├── tests/
│   ├── helpers/                     # 測試工具
│   │   ├── authHelper.js            # 認證輔助函數
│   │   └── collectIndexesFromTests.js  # 索引收集工具
│   └── queries/
│       ├── config/                  # 查詢配置
│       │   ├── adminQueryConfigurations.js
│       │   ├── memberQueryConfigurations.js
│       │   ├── orderQueryConfigurations.js
│       │   └── productQueryConfigurations.js
│       └── queryAndCollectIndexes.test.js  # 索引收集測試
├── index.js                         # 伺服器入口
├── Dockerfile                       # Docker 配置
├── package.json
├── firestore.indexes.json           # Firestore 索引
├── firestore.rules                  # Firestore 安全規則
├── CLAUDE.md                        # 開發計畫文檔
└── README.md                        # 本文檔
```

**目錄說明**：

- **scripts/** - 獨立可執行腳本（透過 npm run 執行）
- **src/config/** - 系統配置與初始化
- **src/utils/** - 應用程式共用工具函數
- **tests/helpers/** - 測試專用工具
- **tests/queries/config/** - 測試查詢配置

### 可用腳本

```bash
# 啟動開發伺服器（自動重啟）
npm run dev

# 啟動生產伺服器
npm start

# 生成測試資料
npm run seed

# 清空 Firestore 和 Authentication 資料
npm run clean:all

# 索引管理
npm run collect:indexes     # 收集缺失的索引資訊
npm run update:indexes       # 更新索引到 firestore.indexes.json
npm run sync:indexes         # 完整索引同步流程（收集 + 更新）
```

---

## 📝 相關文件

- [快速部屬](./docs/fast-deploy.md) - 用於持續更新開發的簡易文檔
- [CLAUDE.md](./CLAUDE.md) - 完整開發計畫文檔
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore 查詢文檔](https://firebase.google.com/docs/firestore/query-data/queries)
- [Cloud Run 文檔](https://cloud.google.com/run/docs)
- [Express.js 文檔](https://expressjs.com/)
