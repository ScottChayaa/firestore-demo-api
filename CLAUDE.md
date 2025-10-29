# Firestore Demo API - 專案開發計畫

> 📋 本文檔記錄由 Claude Code 協助開發的完整規劃
>
> **專案名稱**：Node.js + Express + Firestore 會員訂單查詢系統
> **開發日期**：2025-10-29
> **開發者**：scottchayaa <mmx112945@gmail.com>

---

## 📌 專案概述

建立一個完整的 RESTful API 系統，具備以下特點：
- ✅ 完整的 CRUD 操作（會員、訂單、商品）
- ✅ **公開 API**（無需驗證）：商品瀏覽功能
- ✅ **私有 API**（需 Firebase Auth）：會員與訂單管理
- ✅ Cursor 分頁機制（高效能）
- ✅ 多條件篩選查詢
- ✅ Firestore 索引優化
- ✅ 測試資料自動生成
- ✅ 部署至 Google Cloud Run

---

## 🏗️ 專案架構

```
firestore-demo-api/
├── src/
│   ├── config/
│   │   └── firebase.js              # Firebase Admin SDK 初始化
│   ├── middleware/
│   │   ├── auth.js                  # Firebase Auth 驗證（可選）
│   │   ├── errorHandler.js         # 統一錯誤處理
│   │   └── validator.js             # 請求參數驗證
│   ├── controllers/
│   │   ├── memberController.js      # 會員 CRUD 邏輯
│   │   ├── orderController.js       # 訂單 CRUD + 查詢邏輯
│   │   └── productController.js     # 商品查詢邏輯（公開）
│   ├── routes/
│   │   ├── members.js               # 會員路由（需驗證）
│   │   ├── orders.js                # 訂單路由（需驗證）
│   │   └── products.js              # 商品路由（公開）
│   ├── utils/
│   │   ├── pagination.js            # Cursor 分頁工具
│   │   ├── seedData.js              # 測試資料生成
│   │   └── cleanFirestore.js        # 資料清理腳本
│   └── app.js                       # Express 應用程式
├── index.js                         # 伺服器入口點
├── Dockerfile                       # 容器化配置
├── .dockerignore
├── package.json
├── .env.example
├── .gitignore
├── firestore.indexes.json           # Firestore 複合索引
├── firestore.rules                  # Firestore 安全規則
├── .gcloudignore
├── CLAUDE.md                        # 本文檔
└── README.md                        # 使用說明文檔
```

---

## 🔑 核心技術決策

### 1. 部署環境
**選擇**：Google Cloud Run（容器服務）

**理由**：
- 自動擴展，按需計費
- 支援容器化部署
- 冷啟動速度較 Cloud Functions 快
- 適合中高流量應用

### 2. 身份驗證策略
**雙層設計**：
- **公開 API**：`/api/public/*` - 無需任何驗證（如商品瀏覽）
- **私有 API**：`/api/members/*`, `/api/orders/*` - 需 Firebase ID Token

**驗證流程**：
```
Client → Header: Authorization: Bearer <Firebase-ID-Token>
  ↓
Middleware → firebase-admin.auth().verifyIdToken(token)
  ↓
Controller → req.user = decodedToken
```

### 3. 分頁機制
**選擇**：Cursor 分頁（推薦）

**理由**：
- Firestore 原生支援 `startAfter(cursor)`
- 效能穩定，不受資料量影響
- 適合無限滾動場景

**實作方式**：
```javascript
// 第一頁
GET /api/orders?limit=20

// 下一頁
GET /api/orders?limit=20&cursor=<lastDocId>
```

**回應格式**：
```json
{
  "data": [...],
  "pagination": {
    "nextCursor": "doc123",
    "hasMore": true,
    "limit": 20
  }
}
```

### 4. 測試資料規模
**選擇**：小型（100 會員 + 500 訂單 + 50 商品）

**資料分佈**：
- 會員：100 筆（每筆含 name, email, phone, createdAt）
- 訂單：500 筆（平均每會員 5 筆訂單）
- 商品：50 筆（用於公開 API 測試）
- 訂單狀態分佈：pending 20%, processing 30%, completed 40%, cancelled 10%

---

## 📡 API 端點設計

### 公開 API（無需驗證）

#### 1. 健康檢查
```http
GET /api/public/health
```

#### 2. 瀏覽商品列表
```http
GET /api/public/products?limit=20&cursor=<docId>&category=electronics&minPrice=100
```

**查詢參數**：
- `limit`: 每頁數量（預設 20，最大 100）
- `cursor`: 分頁游標
- `category`: 商品分類
- `minPrice` / `maxPrice`: 價格範圍

#### 3. 查看商品詳情
```http
GET /api/public/products/:id
```

---

### 私有 API（需 Firebase Auth）

#### 會員管理

```http
# 創建會員
POST /api/members
Content-Type: application/json
Authorization: Bearer <firebase-token>
{
  "name": "張三",
  "email": "test@example.com",
  "phone": "0912345678"
}

# 查詢單一會員
GET /api/members/:id
Authorization: Bearer <firebase-token>

# 更新會員
PUT /api/members/:id
Authorization: Bearer <firebase-token>
{
  "name": "張三",
  "phone": "0987654321"
}

# 刪除會員
DELETE /api/members/:id
Authorization: Bearer <firebase-token>
```

#### 訂單管理

```http
# 創建訂單
POST /api/orders
Authorization: Bearer <firebase-token>
{
  "memberId": "member123",
  "items": [
    { "productId": "prod1", "quantity": 2, "price": 100 }
  ],
  "totalAmount": 200
}

# 查詢訂單列表（含多條件篩選）
GET /api/orders?memberId=member123&status=completed&startDate=2025-01-01&limit=20&cursor=doc123
Authorization: Bearer <firebase-token>

# 查詢單一訂單
GET /api/orders/:id
Authorization: Bearer <firebase-token>

# 更新訂單
PUT /api/orders/:id
Authorization: Bearer <firebase-token>
{
  "status": "completed"
}

# 刪除訂單
DELETE /api/orders/:id
Authorization: Bearer <firebase-token>
```

**訂單查詢篩選參數**：
- `memberId`: 會員 ID
- `status`: pending | processing | completed | cancelled
- `startDate` / `endDate`: 日期範圍（ISO 8601 格式）
- `minAmount` / `maxAmount`: 金額範圍
- `orderBy`: 排序欄位（createdAt | amount）
- `order`: 排序方向（asc | desc）
- `limit`: 每頁數量
- `cursor`: 分頁游標

---

### 測試資料生成

```http
POST /api/seed
Authorization: Bearer <firebase-token>

# 回應
{
  "success": true,
  "data": {
    "membersCreated": 100,
    "ordersCreated": 500,
    "productsCreated": 50
  }
}
```

---

## 🗄️ 資料模型

### Members 集合
```javascript
{
  id: string,              // Firestore 自動生成
  name: string,            // 會員姓名
  email: string,           // Email（唯一）
  phone: string,           // 電話
  createdAt: Timestamp,    // 建立時間
  updatedAt: Timestamp     // 更新時間
}
```

### Orders 集合
```javascript
{
  id: string,              // Firestore 自動生成
  memberId: string,        // 會員 ID（外鍵）
  orderNumber: string,     // 訂單編號（唯一）
  items: [                 // 訂單項目
    {
      productId: string,
      productName: string,
      quantity: number,
      price: number
    }
  ],
  totalAmount: number,     // 總金額
  status: string,          // 狀態：pending | processing | completed | cancelled
  createdAt: Timestamp,    // 建立時間
  updatedAt: Timestamp     // 更新時間
}
```

### Products 集合
```javascript
{
  id: string,              // Firestore 自動生成
  name: string,            // 商品名稱
  description: string,     // 商品描述
  price: number,           // 價格
  category: string,        // 分類
  stock: number,           // 庫存
  imageUrl: string,        // 圖片網址
  createdAt: Timestamp     // 建立時間
}
```

---

## 🔍 Firestore 索引配置

### 複合索引需求

**訂單查詢優化**：
```json
{
  "indexes": [
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "memberId", "order": "ASCENDING" },
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "createdAt", "order": "DESCENDING" }
      ]
    },
    {
      "collectionGroup": "orders",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "createdAt", "order": "DESCENDING" },
        { "fieldPath": "totalAmount", "order": "DESCENDING" }
      ]
    }
  ]
}
```

**商品查詢優化**：
```json
{
  "indexes": [
    {
      "collectionGroup": "products",
      "queryScope": "COLLECTION",
      "fields": [
        { "fieldPath": "category", "order": "ASCENDING" },
        { "fieldPath": "price", "order": "ASCENDING" }
      ]
    }
  ]
}
```

---

## 🚀 部署流程

### 前置準備

#### 1. 建立 Firebase 專案
```bash
# 前往 Firebase Console
https://console.firebase.google.com/

# 步驟：
1. 建立新專案或選擇現有專案
2. 啟用 Firestore Database (Native mode)
3. 前往 Project Settings > Service Accounts
4. 點擊「Generate new private key」
5. 下載 JSON 檔案並重新命名為 firebase-service-account.json
```

#### 2. 環境變數設定
```bash
# 複製範本
cp .env.example .env

# 編輯 .env 檔案
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id
PORT=8080
```

---

### 本地開發

#### 1. 安裝依賴
```bash
npm install
```

#### 2. 啟動開發伺服器
```bash
npm run dev
```

#### 3. 生成測試資料
```bash
# 方式一：透過 API
curl -X POST http://localhost:8080/api/seed \
  -H "Authorization: Bearer <your-firebase-token>"

# 方式二：直接執行腳本
npm run seed
```

#### 4. 測試 API
```bash
# 測試公開 API
curl http://localhost:8080/api/public/products

# 測試私有 API（需先取得 Firebase ID Token）
curl http://localhost:8080/api/orders \
  -H "Authorization: Bearer <your-firebase-token>"
```

---

### 部署到 Cloud Run

#### 1. 安裝 Google Cloud SDK
```bash
# 參考：https://cloud.google.com/sdk/docs/install
gcloud init
gcloud auth login
```

#### 2. 設定專案
```bash
# 設定 GCP 專案
gcloud config set project YOUR_PROJECT_ID

# 啟用所需服務
gcloud services enable run.googleapis.com
gcloud services enable containerregistry.googleapis.com
```

#### 3. 建立 Docker 映像
```bash
# 建立映像
docker build -t gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 .

# 測試容器（可選）
docker run -p 8080:8080 \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/firebase-service-account.json \
  -v $(pwd)/firebase-service-account.json:/app/firebase-service-account.json \
  gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

#### 4. 推送映像到 Container Registry
```bash
# 認證 Docker
gcloud auth configure-docker

# 推送映像
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

#### 5. 部署到 Cloud Run
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

#### 6. 設定 Service Account（方式二：使用 Base64 編碼）
```bash
# 將 Service Account JSON 轉為 Base64
base64 firebase-service-account.json > encoded.txt

# 設定環境變數
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --region asia-east1
```

#### 7. 部署 Firestore 索引
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

---

## 🧹 完整移除步驟

### 方案一：僅清空 Firestore 資料（保留專案）

```bash
# 使用提供的清理腳本
npm run clean:firestore

# 或透過 Firebase Console
# 1. 前往 Firestore Database
# 2. 手動刪除 members, orders, products 集合
```

---

### 方案二：刪除 Cloud Run 服務（保留資料）

```bash
# 刪除 Cloud Run 服務
gcloud run services delete firestore-demo-api \
  --region asia-east1 \
  --quiet

# 刪除 Container Registry 映像
gcloud container images delete gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 \
  --quiet
```

---

### 方案三：完全移除專案

```bash
# Step 1: 刪除 Cloud Run 服務
gcloud run services delete firestore-demo-api \
  --region asia-east1 \
  --quiet

# Step 2: 刪除所有 Container Registry 映像
gcloud container images list --repository=gcr.io/YOUR_PROJECT_ID
gcloud container images delete gcr.io/YOUR_PROJECT_ID/firestore-demo-api --quiet

# Step 3: 清空 Firestore 資料（使用腳本或手動）
npm run clean:firestore

# Step 4: 刪除 Firebase 專案（透過 Console）
# 1. 前往 Firebase Console
# 2. Project Settings > General
# 3. 捲動至底部，點擊「Delete Project」
# 4. 輸入專案 ID 確認
# 5. 專案將進入 30 天刪除等待期
```

**⚠️ 重要提醒**：
- Firebase 專案刪除需等待 **30 天**才會完全移除
- 刪除前請務必備份重要資料
- 刪除後 Project ID 將無法再次使用

---

## 📚 Git 提交規範

本專案使用**中文 commit message**，遵循以下格式：

```bash
# 功能新增
git commit -m "新增：會員管理 API 端點"

# 修復問題
git commit -m "修復：訂單查詢分頁錯誤"

# 更新文檔
git commit -m "文檔：更新部署流程說明"

# 重構程式碼
git commit -m "重構：優化 Cursor 分頁邏輯"

# 配置變更
git commit -m "配置：新增 Firestore 索引設定"
```

**Git 用戶資訊**：
- Name: scottchayaa
- Email: mmx112945@gmail.com

---

## 🔐 安全性考量

### 1. 環境變數保護
```bash
# 永不提交的敏感檔案（已加入 .gitignore）
- .env
- firebase-service-account.json
- *-service-account.json
```

### 2. Firestore 安全規則範例
```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // 公開讀取商品
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 會員資料需驗證
    match /members/{memberId} {
      allow read, write: if request.auth != null;
    }

    // 訂單資料需驗證
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. Cloud Run 安全設定
- 啟用 `--allow-unauthenticated`（因應公開 API）
- 使用 Service Account 最小權限原則
- 設定 Cloud Armor（進階：防 DDoS）

---

## 🧪 測試資料範例

### 會員資料
```json
{
  "name": "王小明",
  "email": "ming.wang@example.com",
  "phone": "0912345678",
  "createdAt": "2025-01-15T10:30:00Z"
}
```

### 訂單資料
```json
{
  "memberId": "member_abc123",
  "orderNumber": "ORD-20250129-001",
  "items": [
    {
      "productId": "prod_xyz789",
      "productName": "無線藍牙耳機",
      "quantity": 2,
      "price": 1200
    }
  ],
  "totalAmount": 2400,
  "status": "completed",
  "createdAt": "2025-01-29T14:20:00Z"
}
```

### 商品資料
```json
{
  "name": "無線藍牙耳機",
  "description": "高音質、降噪功能、30小時續航",
  "price": 1200,
  "category": "electronics",
  "stock": 50,
  "imageUrl": "https://example.com/product.jpg",
  "createdAt": "2025-01-10T09:00:00Z"
}
```

---

## 📊 效能優化建議

### 1. Firestore 查詢優化
- ✅ 使用複合索引加速多條件查詢
- ✅ 採用 Cursor 分頁避免 offset 效能問題
- ✅ 限制單次查詢數量（MAX_PAGE_LIMIT = 100）

### 2. Cloud Run 配置優化
```bash
# 建議配置
--memory 512Mi           # 記憶體配置
--max-instances 10       # 最大實例數
--concurrency 80         # 每實例並發請求數
--timeout 60s            # 請求逾時時間
```

### 3. 快取策略（可選）
- 考慮使用 Redis 快取熱門商品資料
- 設定 CDN 快取靜態資源

---

## 🛠️ 故障排除

### 常見問題

#### 1. Firebase Admin SDK 初始化失敗
```bash
# 檢查環境變數
echo $GOOGLE_APPLICATION_CREDENTIALS

# 確認檔案存在
ls -la firebase-service-account.json

# 驗證 JSON 格式
cat firebase-service-account.json | jq .
```

#### 2. Firestore 索引錯誤
```bash
# 錯誤訊息：「The query requires an index」
# 解決方式：
1. 複製錯誤訊息中的索引建立連結
2. 或執行：firebase deploy --only firestore:indexes
```

#### 3. Cloud Run 部署失敗
```bash
# 查看日誌
gcloud run services logs read firestore-demo-api \
  --region asia-east1 \
  --limit 50

# 檢查環境變數
gcloud run services describe firestore-demo-api \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

---

## 📖 相關文件連結

- [Firebase Admin SDK 文檔](https://firebase.google.com/docs/admin/setup)
- [Firestore 查詢文檔](https://firebase.google.com/docs/firestore/query-data/queries)
- [Cloud Run 文檔](https://cloud.google.com/run/docs)
- [Express.js 文檔](https://expressjs.com/)

---

## ✅ 開發檢查清單

- [x] 專案初始化（package.json, .gitignore）
- [ ] Git 配置與首次提交
- [ ] 建立目錄結構
- [ ] 實作 Firebase 初始化
- [ ] 實作認證中間件
- [ ] 實作公開 API（商品）
- [ ] 實作私有 API（會員、訂單）
- [ ] 實作 Cursor 分頁邏輯
- [ ] 實作測試資料生成
- [ ] 配置 Firestore 索引
- [ ] 建立 Dockerfile
- [ ] 本地測試
- [ ] 部署到 Cloud Run
- [ ] 撰寫 README.md
- [ ] 完成中文 Git 提交

---

## 📝 版本歷史

| 版本 | 日期 | 說明 |
|-----|------|------|
| 1.0.0 | 2025-10-29 | 初始版本，完整專案規劃 |

---

**開發者**：scottchayaa
**協助工具**：Claude Code by Anthropic
**最後更新**：2025-10-29
