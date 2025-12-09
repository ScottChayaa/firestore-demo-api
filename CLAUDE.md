# Firestore Demo API - 專案開發指南

Node.js + Express + Firestore 會員訂單查詢系統

---

## 📌 專案概述

建立一個完整的 RESTful API 系統，具備以下特點：

### 核心功能
- ✅ **三層 API 設計**：公開 API / 會員私有 API / 管理員私有 API
- ✅ **角色區分**：透過 Firebase Custom Claims (loginAs: member/admin) 實現
- ✅ **完整 CRUD**：會員、訂單、商品、管理員管理
- ✅ **軟刪除機制**：支援資料恢復與狀態管理（deletedAt, deletedBy, isActive）
- ✅ **Cursor 分頁**：高效能分頁查詢
- ✅ **多條件篩選**：日期範圍、狀態、金額等
- ✅ **Firestore 索引優化**：自動索引管理工具
- ✅ **日誌系統**：Pino Logger + Google Cloud Logging 支援
- ✅ **測試資料生成**：可配置的 seed 腳本
- ✅ **資料遷移**：支援 schema 演進

### API 層級設計

| API 類型 | 路徑 | 驗證需求 | 用途 |
|---------|------|---------|------|
| **公開 API** | `/api/products/*` | 無 | 商品瀏覽、會員註冊、登入 |
| **會員私有 API** | `/api/member/*` | Member Token | 個人資料、訂單查詢 |
| **管理員私有 API** | `/api/admin/*` | Admin Token | 會員/訂單/管理員管理 |

---

## 🏗️ 專案架構

```
firestore-demo-api/
├── src/
│   ├── config/
│   │   ├── firebase.js                  # Firebase Admin SDK 初始化 + Firestore 預熱
│   │   ├── logger.js                    # Pino Logger 配置（Google Cloud Logging 相容）
│   │   └── queryConfigurations/         # 查詢配置檔（各 collection 的查詢參數）
│   │       ├── memberQueryConfigurations.js
│   │       ├── orderQueryConfigurations.js
│   │       ├── productQueryConfigurations.js
│   │       └── adminQueryConfigurations.js
│   ├── middleware/
│   │   ├── auth.js                      # 基礎 Firebase Auth 驗證
│   │   ├── authMember.js                # 會員身份驗證（loginAs=member + Firestore 雙重驗證）
│   │   ├── authAdmin.js                 # 管理員身份驗證（loginAs=admin + 權限檢查）
│   │   ├── adminCheck.js                # 管理員狀態檢查
│   │   ├── errorHandler.js              # 統一錯誤處理
│   │   ├── httpLogger.js                # HTTP 請求日誌
│   │   ├── validator.js                 # 請求參數驗證（分頁、日期範圍等）
│   │   └── orderValidators.js           # 訂單查詢驗證器
│   ├── controllers/
│   │   ├── authController.js            # 認證控制器（會員註冊、會員/管理員登入）
│   │   ├── memberController.js          # 會員 CRUD + 軟刪除 + 狀態管理
│   │   ├── orderController.js           # 訂單 CRUD + 多條件查詢
│   │   ├── productController.js         # 商品查詢（公開 API）
│   │   └── adminController.js           # 管理員 CRUD + 角色創建
│   ├── routes/
│   │   ├── index.js                     # 公開根路由（/, /health）
│   │   ├── auth.js                      # 認證路由（register, login）
│   │   ├── products.js                  # 商品路由（公開）
│   │   ├── member/                      # 會員私有路由
│   │   │   ├── index.js                 # 會員路由組織
│   │   │   ├── profile.js               # 個人資料（GET/PUT /api/member）
│   │   │   └── orders.js                # 訂單查詢（GET /api/member/orders）
│   │   └── admin/                       # 管理員私有路由
│   │       ├── index.js                 # 管理員路由組織
│   │       ├── members.js               # 會員管理（CRUD）
│   │       ├── admins.js                # 管理員管理（CRUD）
│   │       └── orders.js                # 訂單管理（CRUD）
│   ├── utils/
│   │   ├── firestore.js                 # Firestore 工具（分頁、文件映射）
│   │   ├── auth.js                      # 認證工具函數
│   │   └── parseIndexUrl.js             # 索引解析工具
│   ├── migrations/
│   │   ├── index.js                     # 遷移執行器
│   │   └── 001_add_soft_delete_fields.js # 軟刪除欄位遷移
│   └── app.js                           # Express 應用程式主檔
├── scripts/
│   ├── seed.js                          # 測試資料生成
│   ├── clean-firestore.js               # Firestore 資料清理（動態集合發現）
│   ├── clean-auth.js                    # Firebase Auth 清理
│   ├── collect-indexes.js               # 收集 Firestore 索引
│   └── update-indexes.js                # 更新 Firestore 索引配置
├── rests/
│   ├── public.example.rest              # 公開 API 測試範例
│   ├── member.example.rest              # 會員 API 測試範例
│   └── admin.example.rest               # 管理員 API 測試範例
├── index.js                             # 伺服器入口點
├── package.json                         # 專案配置
├── .env.example                         # 環境變數範本
├── firestore.indexes.json               # Firestore 複合索引配置
├── firestore.rules                      # Firestore 安全規則
├── Dockerfile                           # 容器化配置
├── jest.config.js                       # Jest 測試配置
├── nodemon.json                         # 開發監視配置
├── CLAUDE.md                            # 本文檔（給 Claude Code 的專案指南）
└── README.md                            # 使用說明文檔（給開發者）
```

### 架構分層說明

| 層級 | 職責 |
|-----|------|
| **Routes** | API 端點定義、中間件組合 |
| **Middleware** | 驗證、授權、參數驗證、日誌、錯誤處理 |
| **Controllers** | 業務邏輯、Firestore 操作 |
| **Utils** | 通用工具函數（分頁、認證、文件映射） |
| **Config** | Firebase 初始化、Logger 配置、查詢配置 |
| **Migrations** | Schema 演進、資料修正 |
| **Scripts** | 開發維護工具（資料生成/清理、索引管理） |

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

#### 三層驗證架構

```
HTTP 請求
  ↓
【基礎驗證】auth.js
  ├─ 驗證 Authorization header (Bearer token)
  ├─ Firebase ID Token 驗證
  ├─ 解析 Custom Claims (loginAs)
  └─ 自動檢查管理員狀態 → checkAdminStatus()
  ↓
【角色驗證】authMember.js 或 authAdmin.js
  ├─ 檢查 req.user.loginAs == "member"/"admin"
  ├─ Firestore 雙重驗證（查詢 members/admins collection）
  ├─ 軟刪除檢查（deletedAt 為 null）
  └─ 啟用狀態檢查（isActive 為 true）
  ↓
【控制器】業務邏輯處理
```

#### Custom Claims 機制

登入時設定 `loginAs` 自訂聲明：

```javascript
// 會員登入
await admin.auth().setCustomUserClaims(uid, { loginAs: "member" });

// 管理員登入
await admin.auth().setCustomUserClaims(uid, { loginAs: "admin" });
```

#### 中間件組合

```javascript
// 公開 API（無需驗證）
router.get("/api/products", productController.getProducts);

// 會員私有 API（需 member token）
router.use("/api/member", authMember, memberRoutes);

// 管理員私有 API（需 admin token）
router.use("/api/admin", authAdmin, adminRoutes);
```

#### 會員所有權強制

會員路由使用 `memberOwnership` 中間件自動過濾資料：

```javascript
// src/middleware/authMember.js
const memberOwnership = (req, res, next) => {
  req.query.memberId = req.user.uid; // 強制只能查詢自己的資料
  next();
};
```

### 3. 分頁機制
**選擇**：Cursor 分頁

**理由**：
- Firestore 原生支援 `startAfter(cursor)`
- 效能穩定，不受資料量影響
- 適合無限滾動場景

**實作方式**：
```javascript
// 第一頁
GET /api/orders?limit=20

// 下一頁（使用上一頁回傳的 nextCursor）
GET /api/orders?limit=20&cursor=<lastDocId>
```

**回應格式**：
```json
{
  "success": true,
  "data": [...],
  "pagination": {
    "nextCursor": "doc123",
    "hasMore": true,
    "limit": 20
  }
}
```

### 4. 測試資料規模
**預設配置**：10 會員 + 50 訂單 + 5 商品

**環境變數控制**：
```bash
SEED_MEMBERS_COUNT=10    # 會員數量
SEED_ORDERS_COUNT=50     # 訂單數量
SEED_PRODUCTS_COUNT=5    # 商品數量
```

**資料分佈**：
- **會員**：10 筆（含 name, email, phone, isActive, createdAt, updatedAt）
- **訂單**：50 筆（平均每會員 5 筆訂單）
  - 狀態分佈：pending 20%, processing 30%, completed 40%, cancelled 10%
- **商品**：5 筆（分類：electronics, clothing, food, books, sports）

---

## 📦 套件依賴

### 核心套件

| 套件 | 版本 | 用途 |
|-----|------|------|
| **express** | 4.18.2 | Web 框架 |
| **firebase-admin** | 12.0.0 | Firebase Admin SDK（Auth + Firestore） |
| **pino** | 10.1.0 | 高效能日誌系統 |
| **pino-http** | 11.0.0 | HTTP 請求日誌中間件 |
| **express-validator** | 7.0.1 | 請求參數驗證 |
| **helmet** | 7.1.0 | 安全標頭設定 |
| **cors** | 2.8.5 | 跨域資源共享 |
| **express-async-errors** | 3.1.1 | 非同步錯誤處理 |
| **dotenv** | 16.3.1 | 環境變數管理 |
| **module-alias** | 2.2.3 | 模組別名（@/...） |

### 開發工具

| 套件 | 版本 | 用途 |
|-----|------|------|
| **nodemon** | 3.0.2 | 開發監視（自動重啟） |
| **jest** | 30.2.0 | 測試框架 |
| **supertest** | 7.1.4 | API 測試工具 |

### 專案要求
- **Node.js**: >= 22.0.0

---

## 🔐 身份驗證架構

### Custom Claims 設計

使用 Firebase Custom Claims 實現角色區分：

```javascript
// Token 結構（JWT Payload）
{
  "uid": "user123",
  "email": "user@example.com",
  "loginAs": "member",  // 或 "admin"
  "iat": 1234567890,
  "exp": 1234571490
}
```

### 三層中間件堆疊

#### 1. 基礎驗證 (auth.js)

```javascript
const authenticate = () => async (req, res, next) => {
  // 1. 提取 token
  const token = req.headers.authorization?.replace("Bearer ", "");

  // 2. 驗證 token
  const decodedToken = await admin.auth().verifyIdToken(token);

  // 3. 設定 req.user
  req.user = {
    uid: decodedToken.uid,
    email: decodedToken.email,
    loginAs: decodedToken.loginAs
  };

  // 4. 自動檢查管理員狀態
  if (decodedToken.loginAs === "admin") {
    await checkAdminStatus(req, res, next);
  }

  next();
};
```

#### 2. 會員驗證 (authMember.js)

```javascript
const authMember = async (req, res, next) => {
  // 1. 檢查 loginAs
  if (req.user.loginAs !== "member") {
    throw new ForbiddenError("需要會員權限");
  }

  // 2. Firestore 雙重驗證
  const memberDoc = await db.collection("members").doc(req.user.uid).get();
  if (!memberDoc.exists) {
    throw new ForbiddenError("會員資料不存在");
  }

  const memberData = memberDoc.data();

  // 3. 軟刪除檢查
  if (memberData.deletedAt) {
    throw new ForbiddenError("會員帳號已被刪除");
  }

  // 4. 啟用狀態檢查
  if (memberData.isActive === false) {
    throw new ForbiddenError("會員帳號已被停用");
  }

  next();
};
```

#### 3. 管理員驗證 (authAdmin.js)

```javascript
const authAdmin = async (req, res, next) => {
  // 1. 檢查 loginAs
  if (req.user.loginAs !== "admin") {
    throw new ForbiddenError("需要管理員權限");
  }

  // 2. 調用 requireAdmin 進行 Firestore 驗證
  await requireAdmin(req, res, next);
};
```

### 軟刪除與狀態管理

#### 資料庫欄位

```javascript
{
  isActive: true,           // 啟用狀態（預設 true）
  deletedAt: null,          // 軟刪除時間（null = 未刪除）
  deletedBy: null,          // 刪除者 UID
}
```

#### 控制器操作

```javascript
// 軟刪除
await db.collection("members").doc(id).update({
  deletedAt: FieldValue.serverTimestamp(),
  deletedBy: req.user.uid
});

// 恢復
await db.collection("members").doc(id).update({
  deletedAt: null,
  deletedBy: null
});

// 切換啟用狀態
await db.collection("members").doc(id).update({
  isActive: !currentStatus
});
```

---

## 📡 API 端點

完整 API 測試範例請參照：
- `rests/public.example.rest` - 公開 API（商品查詢、註冊、登入）
- `rests/member.example.rest` - 會員私有 API（個人資料、訂單查詢）
- `rests/admin.example.rest` - 管理員私有 API（會員/訂單/管理員管理）

### 常用查詢參數

**分頁參數**（通用）
- `limit`: 每頁數量（預設 20，最大 100）
- `cursor`: 分頁游標（上一頁回傳的 nextCursor）

**日期範圍篩選**（會員、訂單）
- `startDate`: 起始日期（ISO 8601 格式，例：2025-01-01）
- `endDate`: 結束日期（ISO 8601 格式）

**狀態篩選**（訂單）
- `status`: pending | processing | completed | cancelled

**會員篩選**（訂單）
- `memberId`: 會員 ID

**排序參數**（商品、訂單）
- `orderBy`: 排序欄位（createdAt | price | totalAmount）
- `order`: 排序方向（asc | desc）

---

## 🗄️ 資料模型

> **架構說明**：專案採用 **控制器直接操作 Firestore**，無額外 Model/Repository 抽象層 (TODO: 待規劃)。
> 通用工具函數（分頁、文件映射）位於 `src/utils/firestore.js`。

### Members Collection

```javascript
{
  id: string,              // UID（Firebase Auth，作為文件 ID）
  name: string,            // 會員姓名
  email: string,           // Email（唯一）
  phone: string,           // 電話
  isActive: boolean,       // 啟用狀態（預設 true）
  deletedAt: Timestamp,    // 軟刪除時間（null = 未刪除）
  deletedBy: string,       // 刪除者 UID（null = 未刪除）
  createdAt: Timestamp,    // 建立時間
  updatedAt: Timestamp     // 更新時間
}
```

### Admins Collection

```javascript
{
  id: string,              // UID（Firebase Auth）
  name: string,            // 管理員姓名
  email: string,           // Email
  isActive: boolean,       // 啟用狀態
  deletedAt: Timestamp,    // 軟刪除時間
  deletedBy: string,       // 刪除者 UID
  createdAt: Timestamp,
  updatedAt: Timestamp
}
```

### Orders Collection

```javascript
{
  id: string,              // Firestore 自動生成的文件 ID
  memberId: string,        // 會員 ID（外鍵）
  orderNumber: string,     // 訂單編號（唯一，格式：ORD-20250129-001）
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

### Products Collection

```javascript
{
  id: string,              // Firestore 自動生成
  name: string,            // 商品名稱
  description: string,     // 商品描述
  price: number,           // 價格
  category: string,        // 分類（electronics, clothing, food, books, sports）
  stock: number,           // 庫存
  imageUrl: string,        // 圖片網址
  createdAt: Timestamp     // 建立時間
}
```

---

## 🔍 Firestore 索引配置

### 索引管理

專案使用 `firestore.indexes.json` 管理所有複合索引配置。

**索引檔案位置**：`./firestore.indexes.json`

**查看完整索引配置**：
```bash
cat firestore.indexes.json
```

### 索引管理腳本

```bash
# 收集遺漏的索引（從 Firestore 錯誤訊息中提取）
npm run collect:indexes

# 更新索引配置檔
npm run update:indexes

# 完整同步（收集 + 更新）
npm run sync:indexes
```

### 重要索引說明

#### Members Collection 索引
- **用途**：支援按日期查詢 + 軟刪除篩選 + 啟用狀態篩選
- **欄位**：deletedAt (ASC) + isActive (ASC) + createdAt (DESC)

#### Orders Collection 索引
- **用途**：支援會員訂單查詢 + 狀態篩選 + 日期排序
- **主要欄位組合**：
  - memberId + status + createdAt
  - memberId + createdAt
  - status + createdAt
  - createdAt + totalAmount

#### Products Collection 索引
- **用途**：支援分類查詢 + 價格排序
- **欄位**：category + price

---

## 📝 日誌系統

### Pino Logger 配置

**配置檔位置**：`src/config/logger.js`

#### 特性

- ✅ 高效能（JSON 格式）
- ✅ Google Cloud Logging 相容
- ✅ 自動 HTTP 請求日誌
- ✅ 錯誤堆疊追蹤
- ✅ 可配置日誌等級

#### 日誌等級對應

| Pino Level | Google Cloud Severity |
|------------|----------------------|
| trace      | DEBUG                |
| debug      | DEBUG                |
| info       | INFO                 |
| warn       | WARNING              |
| error      | ERROR                |
| fatal      | CRITICAL             |

#### 使用方式

```javascript
// 在控制器中
const logger = require("@/config/logger");

logger.info("處理會員查詢請求");
logger.error({ err }, "Firestore 查詢失敗");
logger.debug({ userId: req.user.uid }, "使用者資訊");
```

#### HTTP 請求日誌

自動記錄所有 HTTP 請求/響應：

```json
{
  "level": "info",
  "message": "request completed",
  "req": {
    "method": "GET",
    "url": "/api/members",
    "remoteAddress": "127.0.0.1"
  },
  "res": {
    "statusCode": 200
  },
  "responseTime": 123
}
```

---

## 🛠️ 工具腳本

### 資料生成

**腳本位置**：`scripts/seed.js`

```bash
# 使用預設數量生成（10 會員 + 50 訂單 + 5 商品）
npm run seed

# 自訂數量
SEED_MEMBERS_COUNT=100 SEED_ORDERS_COUNT=500 SEED_PRODUCTS_COUNT=50 npm run seed
```

**功能**：
- ✅ 同時建立 Firebase Auth 用戶 + Firestore 文件
- ✅ 為每個會員設定 Custom Claims (`loginAs: "member"`)
- ✅ 自動生成訂單編號（ORD-YYYYMMDD-001）
- ✅ 隨機分配訂單狀態（pending 20%, processing 30%, completed 40%, cancelled 10%）
- ✅ 生成隨機商品（5 種分類）

### 資料清理

#### 清理 Firestore 資料

**腳本位置**：`scripts/clean-firestore.js`

```bash
npm run clean:firestore
```

**功能**：
- ✅ 動態集合發現（`db.listCollections()`）
- ✅ 支援白名單/黑名單過濾
- ✅ 自動排除系統集合（`_` 開頭）
- ✅ 分批刪除（500 條/批，避免限流）

#### 清理 Firebase Auth

**腳本位置**：`scripts/clean-auth.js`

```bash
npm run clean:authentication
```

**功能**：
- ✅ 刪除所有 Firebase Auth 用戶
- ✅ 分批處理（1000 個/批）

#### 完整清理

```bash
# 同時清理 Firestore + Firebase Auth
npm run clean:all
```

### 索引管理

#### 收集遺漏索引

**腳本位置**：`scripts/collect-indexes.js`

```bash
npm run collect:indexes
```

**功能**：
- ✅ 從 Firestore 錯誤訊息中提取索引需求
- ✅ 解析索引 URL 並轉換為 JSON 格式
- ✅ 自動更新 `firestore.indexes.json`

#### 更新索引配置

**腳本位置**：`scripts/update-indexes.js`

```bash
npm run update:indexes
```

**功能**：
- ✅ 檢查當前索引配置
- ✅ 合併新索引
- ✅ 移除重複索引

#### 完整同步

```bash
npm run sync:indexes
```

等同於依序執行 `collect:indexes` → `update:indexes`。

---

## 🔄 資料遷移

### Migration 機制

**遷移檔位置**：`src/migrations/`

**執行器**：`src/migrations/index.js`

### 使用方式

```bash
# 執行所有遷移
npm run migrate

# 預覽遷移（不實際執行）
npm run migrate:dry
```

### 現有遷移

#### 001_add_soft_delete_fields.js

**用途**：為現有 members 和 admins 文件添加軟刪除欄位

**新增欄位**：
```javascript
{
  isActive: true,
  deletedAt: null,
  deletedBy: null
}
```

### 建立新遷移

1. 在 `src/migrations/` 目錄建立檔案（格式：`XXX_description.js`）
2. 實作遷移邏輯：

```javascript
module.exports = {
  name: "002_add_new_field",
  async up(db) {
    // 執行遷移
    const batch = db.batch();
    const snapshot = await db.collection("members").get();
    snapshot.docs.forEach(doc => {
      batch.update(doc.ref, { newField: "defaultValue" });
    });
    await batch.commit();
  },
  async down(db) {
    // 回滾遷移（可選）
  }
};
```

3. 執行 `npm run migrate`

---

## 💻 本地開發

### 1. 環境設定

```bash
# 安裝依賴
npm install

# 準備 Service Account
# 1. 前往 Firebase Console > Project Settings > Service Accounts
# 2. 點擊「Generate new private key」下載 JSON 檔案
# 3. 轉換為 Base64 編碼
base64 firebase-service-account.json > encoded.txt

# 設定環境變數
cp .env.example .env
# 編輯 .env 填入：
# - FIREBASE_PROJECT_ID=your-project-id
# - GOOGLE_CREDENTIALS_BASE64=<encoded.txt 內容>
```

### 2. 啟動伺服器

```bash
npm run dev  # 開發模式（nodemon 自動重啟）
npm start    # 生產模式
```

### 3. 生成測試資料

```bash
npm run seed
```

### 4. 測試 API

使用 `rests/*.example.rest` 檔案進行測試。

**推薦工具**：
- VS Code 擴充套件：[REST Client](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)

**測試流程**：
1. 開啟 `rests/public.example.rest`
2. 執行「註冊」請求
3. 執行「登入」請求，取得 token
4. 複製 token 到 `@memberToken` 變數
5. 測試會員私有 API

---

## 🌍 環境變數說明

參照 [.env.example](./.env.example)

### Firestore 預熱說明

啟用 `ENABLE_FIRESTORE_WARMUP=true` 後：
- 伺服器啟動時執行 `db.listCollections()`
- 建立 gRPC 連線池（僅 1 次讀取操作）
- 首次 API 請求延遲：500-1600ms → 0ms

---

## 📚 Git 工作流程

### Commit 規範

當需要修改或創建程式碼時：

1. 先檢查當前 Git 狀態
2. 創建有意義的 commit message（使用中文或英文）
3. Commit message 格式：`[類型] 簡短描述`

**類型範例**：
- `feat` ：新功能
- `fix` ：錯誤修復
- `refactor` ：程式碼重構
- `docs` ：文件更新
- `test` ：測試相關
- `chore` ：建置工具、依賴更新等

**範例**：
```bash
git commit -m "feat: 新增會員軟刪除功能"
git commit -m "fix: 修正訂單查詢分頁錯誤"
git commit -m "docs: 更新 API 文件"
```

### 重要提醒（給 Claude Code）

- ✅ 每次完成任務後，必須主動幫用戶建立 git commit
- ❌ Commit message 中**不要**包含 "Generated with Claude Code" 或 "Co-Authored-By: Claude" 等 AI 生成標記
- ✅ 使用簡潔清晰的中文 commit message

---

## 🔐 安全性考量

### 1. 環境變數保護

**永不提交的敏感檔案**（已加入 .gitignore）：
```
.env
firebase-service-account.json
*-service-account.json
```

### 2. Firestore 安全規則範例

**檔案位置**：`firestore.rules`

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
      allow read: if request.auth != null;
      allow write: if request.auth != null;

      // 會員只能讀取自己的資料
      allow read: if request.auth.uid == memberId;
    }

    // 訂單資料需驗證
    match /orders/{orderId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null;

      // 會員只能讀取自己的訂單
      allow read: if request.auth.uid == resource.data.memberId;
    }

    // 管理員資料需驗證
    match /admins/{adminId} {
      allow read, write: if request.auth != null;
    }
  }
}
```

### 3. API 安全設定

- ✅ 使用 Helmet 設定安全標頭
- ✅ CORS 配置（可透過 `CORS_ORIGIN` 環境變數限制來源）
- ✅ 請求參數驗證（express-validator）
- ✅ 非同步錯誤處理（express-async-errors）
- ✅ 統一錯誤回應格式

---

## 📖 相關文件連結

### Firebase / Google Cloud
- [Firebase Admin SDK 文檔](https://firebase.google.com/docs/admin/setup)
- [Firestore 查詢文檔](https://firebase.google.com/docs/firestore/query-data/queries)
- [Firebase Auth Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Cloud Run 文檔](https://cloud.google.com/run/docs)

### 框架與工具
- [Express.js 文檔](https://expressjs.com/)
- [Pino Logger 文檔](https://getpino.io/)
- [Express Validator 文檔](https://express-validator.github.io/docs/)
- [Jest 測試框架](https://jestjs.io/)

### 本專案相關
- [README.md](./README.md) - 使用說明文檔
- [firestore.indexes.json](./firestore.indexes.json) - Firestore 索引配置
- [firestore.rules](./firestore.rules) - Firestore 安全規則

---

**開發者**：scottchayaa
**協助工具**：Claude Code by Anthropic
**最後更新**：2025-12-09
