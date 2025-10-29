# Firestore Demo API

> Node.js + Express + Firestore 會員訂單查詢系統
> 支援公開 API（商品瀏覽）和私有 API（會員、訂單管理）

[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Express](https://img.shields.io/badge/Express-4.x-blue.svg)](https://expressjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Admin_SDK-orange.svg)](https://firebase.google.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

---

## 📋 目錄

- [功能特色](#功能特色)
- [技術架構](#技術架構)
- [快速開始](#快速開始)
- [API 文檔](#api-文檔)
- [部署指南](#部署指南)
- [完整移除步驟](#完整移除步驟)
- [開發說明](#開發說明)

---

## ✨ 功能特色

### 🌐 公開 API（無需驗證）
- **商品瀏覽**：任何人都可以查看商品列表和詳情
- **分類查詢**：按商品分類篩選
- **價格篩選**：按價格範圍搜尋
- **Cursor 分頁**：高效能的分頁機制

### 🔐 私有 API（需 Firebase Auth）
- **會員管理**：完整的 CRUD 操作
- **訂單管理**：建立、查詢、更新、刪除訂單
- **多條件篩選**：
  - 會員 ID
  - 訂單狀態（pending, processing, completed, cancelled）
  - 日期範圍
  - 金額範圍
- **測試資料生成**：一鍵生成 100 會員 + 500 訂單 + 50 商品

### 🚀 技術特點
- ✅ **Firestore 優化**：使用複合索引加速查詢
- ✅ **Cursor 分頁**：避免 offset 效能問題
- ✅ **容器化部署**：支援 Docker 和 Cloud Run
- ✅ **安全防護**：Helmet + CORS + Firebase Auth
- ✅ **錯誤處理**：統一的錯誤回應格式

---

## 🏗️ 技術架構

```
Node.js 18+ (LTS)
  └── Express 4.x (Web Framework)
       ├── Firebase Admin SDK (Firestore + Auth)
       ├── Middleware
       │    ├── Helmet (Security)
       │    ├── CORS (Cross-Origin)
       │    ├── Morgan (Logging)
       │    └── express-validator (Validation)
       └── Deployment
            └── Docker + Google Cloud Run
```

---

## 🚀 快速開始

### 前置需求

- Node.js 18+
- Firebase 專案（已啟用 Firestore）
- Firebase Service Account Key

### 1. 克隆專案

```bash
git clone https://github.com/your-username/firestore-demo-api.git
cd firestore-demo-api
```

### 2. 安裝依賴

```bash
npm install
```

### 3. 設定環境變數

```bash
# 複製範本
cp .env.example .env

# 編輯 .env 檔案
nano .env
```

`.env` 檔案內容：

```env
PORT=8080
NODE_ENV=development

# Firebase 設定
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-firebase-project-id

# API 設定
CORS_ORIGIN=*
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# 測試資料設定
SEED_MEMBERS_COUNT=100
SEED_ORDERS_COUNT=500
SEED_PRODUCTS_COUNT=50
```

### 4. 取得 Firebase Service Account Key

1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 選擇專案 > Project Settings > Service Accounts
3. 點擊「Generate new private key」
4. 下載 JSON 檔案並重新命名為 `firebase-service-account.json`
5. 將檔案放在專案根目錄

### 5. 啟動開發伺服器

```bash
npm run dev
```

伺服器將啟動在 `http://localhost:8080`

### 6. 生成測試資料

**方式一：透過 API**

```bash
# 需要先取得 Firebase ID Token
curl -X POST http://localhost:8080/api/seed \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

**方式二：直接執行腳本**

```bash
npm run seed
```

### 7. 測試 API

**公開 API（無需驗證）：**

```bash
# 查看商品列表
curl http://localhost:8080/api/public/products

# 查看商品詳情
curl http://localhost:8080/api/public/products/PRODUCT_ID

# 查看商品分類
curl http://localhost:8080/api/public/products/categories
```

**私有 API（需要驗證）：**

```bash
# 查看訂單列表
curl http://localhost:8080/api/orders \
  -H "Authorization: Bearer YOUR_FIREBASE_ID_TOKEN"
```

---

## 📚 API 文檔

### 公開 API

#### 1. 健康檢查

```http
GET /health
```

**回應範例：**

```json
{
  "success": true,
  "message": "Firestore Demo API is running",
  "timestamp": "2025-10-29T10:30:00.000Z",
  "environment": "development"
}
```

#### 2. 瀏覽商品列表

```http
GET /api/public/products?limit=20&cursor=docId&category=electronics&minPrice=100&maxPrice=5000
```

**Query 參數：**
- `limit`：每頁數量（預設 20，最大 100）
- `cursor`：分頁游標
- `category`：商品分類
- `minPrice`：最低價格
- `maxPrice`：最高價格
- `orderBy`：排序欄位（createdAt, price）
- `order`：排序方向（asc, desc）

**回應範例：**

```json
{
  "success": true,
  "data": [
    {
      "id": "product123",
      "name": "無線藍牙耳機",
      "price": 1200,
      "category": "electronics",
      "stock": 50,
      "createdAt": "2025-01-10T09:00:00.000Z"
    }
  ],
  "pagination": {
    "limit": 20,
    "hasMore": true,
    "nextCursor": "product123",
    "count": 20
  }
}
```

#### 3. 查看商品詳情

```http
GET /api/public/products/:id
```

#### 4. 取得商品分類列表

```http
GET /api/public/products/categories
```

---

### 私有 API（需 Firebase Auth Token）

> ⚠️ 所有私有 API 都需要在 Header 中提供 Firebase ID Token：
> `Authorization: Bearer YOUR_FIREBASE_ID_TOKEN`

#### 會員管理

```http
# 列出會員
GET /api/members

# 創建會員
POST /api/members
Content-Type: application/json
{
  "name": "王小明",
  "email": "ming@example.com",
  "phone": "0912345678"
}

# 查看會員詳情
GET /api/members/:id

# 更新會員
PUT /api/members/:id
Content-Type: application/json
{
  "phone": "0987654321"
}

# 刪除會員
DELETE /api/members/:id
```

#### 訂單管理

```http
# 列出訂單（支援多條件篩選）
GET /api/orders?memberId=member123&status=completed&startDate=2025-01-01&limit=20

# 創建訂單
POST /api/orders
Content-Type: application/json
{
  "memberId": "member123",
  "items": [
    {
      "productId": "prod1",
      "productName": "無線藍牙耳機",
      "quantity": 2,
      "price": 1200
    }
  ],
  "totalAmount": 2400
}

# 查看訂單詳情
GET /api/orders/:id

# 更新訂單狀態
PUT /api/orders/:id
Content-Type: application/json
{
  "status": "completed"
}

# 刪除訂單
DELETE /api/orders/:id
```

**訂單查詢參數：**
- `memberId`：會員 ID
- `status`：訂單狀態（pending, processing, completed, cancelled）
- `startDate` / `endDate`：日期範圍（ISO 8601 格式）
- `minAmount` / `maxAmount`：金額範圍
- `orderBy`：排序欄位（createdAt, totalAmount）
- `order`：排序方向（asc, desc）
- `limit`：每頁數量
- `cursor`：分頁游標

#### 測試資料生成

```http
POST /api/seed
```

---

## 🚢 部署指南

### 部署到 Google Cloud Run

#### 1. 前置準備

```bash
# 安裝 Google Cloud SDK
# https://cloud.google.com/sdk/docs/install

# 登入並設定專案
gcloud auth login
gcloud config set project YOUR_PROJECT_ID

# 啟用所需服務
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 2. 建立 Docker 映像

```bash
# 建立映像
docker build -t gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 .

# 本地測試（可選）
docker run -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json \
  -v $(pwd)/firebase-service-account.json:/app/firebase-service-account.json \
  gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

#### 3. 推送映像到 Container Registry

```bash
# 認證 Docker
gcloud auth configure-docker

# 推送映像
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

#### 4. 部署到 Cloud Run

```bash
gcloud run deploy firestore-demo-api \
  --image gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --set-env-vars "FIREBASE_PROJECT_ID=YOUR_PROJECT_ID" \
  --set-env-vars "NODE_ENV=production" \
  --memory 512Mi \
  --max-instances 10
```

#### 5. 設定 Service Account（使用 Base64 編碼）

```bash
# 將 Service Account JSON 轉為 Base64
base64 firebase-service-account.json > encoded.txt

# 設定環境變數
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --region asia-east1
```

#### 6. 部署 Firestore 索引

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

---

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

---

## 👤 作者

**scottchayaa**
- Email: mmx112945@gmail.com
- GitHub: [@scottchayaa](https://github.com/scottchayaa)

---

## 🙏 致謝

感謝 Claude Code by Anthropic 協助開發本專案
