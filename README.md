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
  - 使用 `scripts/setAdmin.js` 設定管理員
- **多條件篩選**：
  - 會員 ID
  - 訂單狀態（pending, processing, completed, cancelled）
  - 日期範圍
  - 金額範圍
- **測試資料生成**：一鍵生成 100 會員 + 500 訂單 + 50 商品 + 1 管理員

### 🚀 技術特點
- ✅ **Firestore 優化**：使用複合索引加速查詢
- ✅ **Cursor 分頁**：避免 offset 效能問題
- ✅ **容器化部署**：支援 Docker 和 Cloud Run
- ✅ **安全防護**：Helmet + CORS + Firebase Auth
- ✅ **錯誤處理**：統一的錯誤回應格式

---


## 🚀 快速開始

### 前置需求

- Node.js 18+
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

# 編輯 .env 檔案
nano .env
```

**需要設定的環境變數**：
- `FIREBASE_PROJECT_ID` - Firebase 專案 ID
- `FIREBASE_WEB_API_KEY` - Firebase Web API Key（用於登入驗證）
- `GOOGLE_APPLICATION_CREDENTIALS` - Service Account 檔案路徑

> 💡 **了解兩種憑證的差異**：本專案使用兩種 Firebase 憑證，用途不同。詳細說明請參考 [Firebase 憑證說明文檔](./docs/firebase-credentials.md)。

### 3. 取得 Firebase Service Account Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 > Project Settings > Service Accounts
3. 點擊「Generate new private key」
4. 下載 JSON 檔案並重新命名為 `firebase-service-account.json`
5. 將檔案放在專案根目錄

### 4. 取得 Firebase Web API Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 > Project Settings > General
3. 在「Your apps」區段找到「Web API Key」
4. 複製該值到 `.env` 檔案的 `FIREBASE_WEB_API_KEY` 變數

### 5. 啟用 Firebase Authentication

1. 前往 Firebase Console：`https://console.firebase.google.com/project/YOUR_PROJECT_ID/authentication`
2. 點擊「開始使用」（如果尚未設定）
3. 在「Sign-in method」標籤頁，啟用「Email/Password」
4. 這會自動啟用 Identity Toolkit API

> ⚠️ **重要**：如果跳過此步驟，執行 `npm run seed` 時會出現錯誤。


### 6. 生成測試資料

```bash
npm run seed
```

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


<details>

<summary>❌如果執行 seed 發生權限錯誤</summary>

需到 IAM 設定新增權限
```bash
Service Account 權限設定指南

操作步驟（Firebase Console）
1. 前往 Firebase Console
  - 開啟 https://console.firebase.google.com/
  - 選擇專案 liang-dev
2. 進入 Service Accounts 設定
  - 點擊左側選單的「齒輪圖示」> Project Settings
  - 點擊上方「Service accounts」分頁
3. 開啟 Google Cloud IAM 設定
  - 找到你的 Service Account（顯示格式：firebase-adminsdk-xxxxx@liang-dev.iam.gserviceaccount.com）
  - 點擊該 Email 旁邊的「Manage permissions in Google Cloud Console」連結
  - 或直接開啟：https://console.cloud.google.com/iam-admin/iam?project=liang-dev
4. 編輯 Service Account 權限
  - 在 IAM 列表中，找到你的 firebase-adminsdk Service Account
  - 點擊該列右側的「Edit」（鉛筆圖示）
5. 新增必要角色
  - 點擊「+ ADD ANOTHER ROLE」按鈕
  - 搜尋並新增以下兩個角色：
    - Firebase Authentication Admin 或搜尋 roles/firebaseauth.admin
    - Service Usage Consumer 或搜尋 roles/serviceusage.serviceUsageConsumer
6. 重新執行測試資料生成
npm run seed
```

</details>


### 7. 啟動開發伺服器

```bash
npm run dev
```

- [測試 public api](./public.rest)
- [測試 private api](./private.rest)


### 8. 部署 Firestore Rules 和 Indexes

```bash
# 安裝 Firebase CLI（如果還沒安裝）
npm install -g firebase-tools

# 登入
firebase login

# 初始化 Firestore（如果尚未初始化）
#   若有完成, 則會出現 firebase.json, .firebaserc
firebase init firestore

# 部署 Rules 和 Indexes
firebase deploy --only firestore:rules,firestore:indexes
```

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

# 請到 Artifact Registry 後台頁面設定存放區: my-docker 
# 並指定單區域位置: asia-east1 (台灣)

# 針對與這個存放區位置相關聯的 Artifact Registry 網域，將 gcloud 設定為其憑證輔助程式：
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
base64 firebase-service-account.json | tr -d '\n' > encoded.txt

# 部署到 Cloud Run（包含完整環境變數）
gcloud run deploy firestore-demo-api \
  --image asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --env-vars-file .env \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 300
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

部署完成後，您將獲得一個 Cloud Run 服務網址，例如：
```
https://firestore-demo-api-xxxxx-xx.a.run.app
```

---

## 🗑️ 完整移除步驟

### 方案一：保留專案，僅清空資料

```bash
# 執行清理腳本
npm run clean:firestore

# 或手動刪除（透過 Firebase Console）
# 1. 前往 Firestore Database
# 2. 刪除 members, orders, products 集合
```

### 方案二：刪除 Cloud Run 服務

```bash
# 刪除 Cloud Run 服務
gcloud run services delete firestore-demo-api \
  --region asia-east1 \
  --quiet

# 刪除 Container Registry 映像
gcloud container images delete gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 \
  --quiet
```

### 方案三：完全移除 Firebase 專案

```bash
# Step 1: 刪除 Cloud Run 服務
gcloud run services delete firestore-demo-api --region asia-east1

# Step 2: 刪除 Container Registry 映像
gcloud container images delete gcr.io/YOUR_PROJECT_ID/firestore-demo-api

# Step 3: 清空 Firestore 資料
npm run clean:firestore

# Step 4: 刪除 Firebase 專案（透過 Firebase Console）
# 1. 前往 Firebase Console
# 2. Project Settings > General
# 3. 捲動至底部，點擊「Delete Project」
# 4. 輸入專案 ID 確認
# ⚠️ 注意：專案需等待 30 天才會完全刪除
```

---

## 🛠️ 開發說明

### 專案結構

```
firestore-demo-api/
├── src/
│   ├── config/
│   │   └── firebase.js              # Firebase Admin SDK 初始化
│   ├── middleware/
│   │   ├── auth.js                  # Firebase Auth 驗證
│   │   ├── errorHandler.js         # 錯誤處理
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
│   │   ├── pagination.js            # 分頁工具
│   │   ├── seedData.js              # 測試資料生成
│   │   └── cleanFirestore.js        # 資料清理
│   └── app.js                       # Express 應用
├── index.js                         # 伺服器入口
├── Dockerfile                       # Docker 配置
├── package.json
├── firestore.indexes.json           # Firestore 索引
├── firestore.rules                  # Firestore 安全規則
├── CLAUDE.md                        # 開發計畫文檔
└── README.md                        # 本文檔
```

### 可用腳本

```bash
# 啟動開發伺服器（自動重啟）
npm run dev

# 啟動生產伺服器
npm start

# 生成測試資料
npm run seed

# 清空 Firestore 資料
npm run clean:firestore
```

### 環境變數說明

| 變數名稱 | 說明 | 預設值 |
|---------|------|--------|
| `PORT` | 伺服器埠號 | 8080 |
| `NODE_ENV` | 環境（development/production） | development |
| `GOOGLE_APPLICATION_CREDENTIALS` | Service Account 檔案路徑 | - |
| `GOOGLE_CREDENTIALS_BASE64` | Base64 編碼的 Service Account | - |
| `FIREBASE_PROJECT_ID` | Firebase 專案 ID | - |
| `CORS_ORIGIN` | CORS 允許的來源 | * |
| `DEFAULT_PAGE_LIMIT` | 預設分頁數量 | 20 |
| `MAX_PAGE_LIMIT` | 最大分頁數量 | 100 |
| `SEED_MEMBERS_COUNT` | 測試會員數量 | 100 |
| `SEED_ORDERS_COUNT` | 測試訂單數量 | 500 |
| `SEED_PRODUCTS_COUNT` | 測試商品數量 | 50 |

---

## 📝 相關文件

- [CLAUDE.md](./CLAUDE.md) - 完整開發計畫文檔
- [Firebase Admin SDK](https://firebase.google.com/docs/admin/setup)
- [Firestore 查詢文檔](https://firebase.google.com/docs/firestore/query-data/queries)
- [Cloud Run 文檔](https://cloud.google.com/run/docs)
- [Express.js 文檔](https://expressjs.com/)
