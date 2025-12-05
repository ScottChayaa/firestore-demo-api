# 環境變數設定指南

本文檔詳細說明所有環境變數的用途、設定方式和驗證方法。

---

## 📋 目錄

- [環境變數清單](#環境變數清單)
- [必填變數](#必填變數)
- [可選變數](#可選變數)
- [開發環境設定](#開發環境設定)
- [生產環境設定](#生產環境設定)
- [驗證方法](#驗證方法)
- [常見問題](#常見問題)

---

## 📝 環境變數清單

### 完整清單

| 變數名稱 | 類型 | 預設值 | 說明 |
|---------|------|--------|------|
| `PORT` | 數字 | `8080` | 伺服器監聽埠號 |
| `NODE_ENV` | 字串 | `development` | 執行環境 |
| `GOOGLE_APPLICATION_CREDENTIALS` | 路徑 | - | Service Account JSON 檔案路徑 |
| `GOOGLE_CREDENTIALS_BASE64` | 字串 | - | Base64 編碼的 Service Account JSON |
| `FIREBASE_PROJECT_ID` | 字串 | - | Firebase 專案 ID |
| `FIRESTORE_DATABASE_ID` | 字串 | `(default)` | Firestore 資料庫 ID |
| `CORS_ORIGIN` | 字串 | `*` | CORS 允許的來源 |
| `DEFAULT_PAGE_LIMIT` | 數字 | `20` | 預設分頁數量 |
| `MAX_PAGE_LIMIT` | 數字 | `100` | 最大分頁數量 |
| `SEED_MEMBERS_COUNT` | 數字 | `100` | 測試會員數量 |
| `SEED_ORDERS_COUNT` | 數字 | `500` | 測試訂單數量 |
| `SEED_PRODUCTS_COUNT` | 數字 | `50` | 測試商品數量 |

---

## ✅ 必填變數

### 1. Firebase 認證（二選一）

#### 選項 A：使用檔案路徑（本地開發推薦）

```env
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
```

**用途：** 指向 Service Account JSON 檔案的路徑

**注意事項：**
- 路徑可以是相對路徑（相對於專案根目錄）
- 也可以是絕對路徑（完整路徑）
- 檔案必須存在且可讀取

**範例：**
```env
# 相對路徑（推薦）
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json

# 絕對路徑
GOOGLE_APPLICATION_CREDENTIALS=/home/user/project/firebase-service-account.json
```

#### 選項 B：使用 Base64 編碼（Cloud Run 推薦）

```env
GOOGLE_CREDENTIALS_BASE64=ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCiAgInByb2plY3RfaWQiOiAieW91ci1wcm9qZWN0IiwKICAuLi4KfQo=
```

**用途：** Base64 編碼的 Service Account JSON 內容

**如何生成：**
```bash
base64 firebase-service-account.json > encoded.txt
cat encoded.txt
```

**優點：**
- 不需上傳檔案到 Cloud Run
- 透過環境變數安全傳遞
- 符合 12-Factor App 原則

---

### 2. Firebase 專案 ID

```env
FIREBASE_PROJECT_ID=your-project-id
```

**用途：** 識別您的 Firebase 專案

**如何取得：**
1. 前往 [Firebase Console](https://console.firebase.google.com/)
2. 專案設定 > 一般設定
3. 複製「專案 ID」欄位

**範例：**
```env
FIREBASE_PROJECT_ID=firestore-demo-12345
```

---

## 🔧 可選變數

### 1. 伺服器埠號

```env
PORT=8080
```

**預設值：** `8080`

**用途：** 伺服器監聽的埠號

**注意事項：**
- Cloud Run 會自動設定此變數
- 本地開發可自由修改（避免埠號衝突）

**範例：**
```env
# 本地開發使用 3000
PORT=3000

# Cloud Run 會自動設定為 8080
```

---

### 2. 執行環境

```env
NODE_ENV=development
```

**可選值：**
- `development`：開發模式（顯示詳細錯誤）
- `production`：生產模式（錯誤簡化）
- `test`：測試模式

**影響範圍：**
- 錯誤訊息詳細程度
- 日誌記錄層級
- Morgan 日誌格式

**範例：**
```env
# 本地開發
NODE_ENV=development

# Cloud Run 部署
NODE_ENV=production
```

---

### 3. CORS 設定

```env
CORS_ORIGIN=*
```

**預設值：** `*`（允許所有來源）

**用途：** 控制跨域請求

**範例：**
```env
# 允許所有來源（開發測試）
CORS_ORIGIN=*

# 允許特定網域
CORS_ORIGIN=https://example.com

# 允許多個網域（逗號分隔）
CORS_ORIGIN=https://example.com,https://app.example.com
```

---

### 4. 分頁設定

```env
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100
```

**用途：**
- `DEFAULT_PAGE_LIMIT`：未指定 limit 時的預設值
- `MAX_PAGE_LIMIT`：允許的最大 limit 值（防止過度查詢）

**範例：**
```env
# 預設每頁 20 筆，最多 100 筆
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# 較小的分頁（節省頻寬）
DEFAULT_PAGE_LIMIT=10
MAX_PAGE_LIMIT=50
```

---

### 5. 測試資料數量

```env
SEED_MEMBERS_COUNT=100
SEED_ORDERS_COUNT=500
SEED_PRODUCTS_COUNT=50
```

**用途：** 控制 `npm run seed` 生成的測試資料數量

**建議值：**

**小型（開發測試）：**
```env
SEED_MEMBERS_COUNT=100
SEED_ORDERS_COUNT=500
SEED_PRODUCTS_COUNT=50
```

**中型（功能測試）：**
```env
SEED_MEMBERS_COUNT=1000
SEED_ORDERS_COUNT=5000
SEED_PRODUCTS_COUNT=100
```

**大型（壓力測試）：**
```env
SEED_MEMBERS_COUNT=10000
SEED_ORDERS_COUNT=50000
SEED_PRODUCTS_COUNT=200
```

---

### 6. Firestore 資料庫 ID

```env
FIRESTORE_DATABASE_ID=(default)
```

**用途：** 指定 Firestore 資料庫（如果使用命名資料庫）

**注意：** 大多數情況使用預設資料庫，無需設定

---

## 🖥️ 開發環境設定

### 步驟 1：複製範本

```bash
cp .env.example .env
```

### 步驟 2：編輯 `.env` 檔案

```env
# 伺服器設定
PORT=8080
NODE_ENV=development

# Firebase 設定（使用檔案路徑）
GOOGLE_APPLICATION_CREDENTIALS=./firebase-service-account.json
FIREBASE_PROJECT_ID=your-project-id

# API 設定
CORS_ORIGIN=*
DEFAULT_PAGE_LIMIT=20
MAX_PAGE_LIMIT=100

# 測試資料設定
SEED_MEMBERS_COUNT=100
SEED_ORDERS_COUNT=500
SEED_PRODUCTS_COUNT=50
```

### 步驟 3：放置 Service Account 檔案

```bash
# 確認檔案存在
ls -la firebase-service-account.json

# 如果不存在，請參考 service-account.md 取得
```

### 步驟 4：驗證設定

```bash
# 啟動開發伺服器
npm run dev

# 看到以下訊息表示成功：
# ✅ Firebase Admin SDK initialized successfully
# 📦 Project ID: your-project-id
```

---

## 🚀 生產環境設定（Cloud Run）

### 方式一：使用 gcloud CLI

#### 設定必填變數

```bash
# 將 Service Account JSON 轉為 Base64
base64 firebase-service-account.json > encoded.txt

# 設定環境變數
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --set-env-vars "FIREBASE_PROJECT_ID=your-project-id" \
  --set-env-vars "NODE_ENV=production" \
  --region asia-east1
```

#### 設定可選變數

```bash
gcloud run services update firestore-demo-api \
  --set-env-vars "CORS_ORIGIN=https://example.com" \
  --set-env-vars "DEFAULT_PAGE_LIMIT=20" \
  --set-env-vars "MAX_PAGE_LIMIT=100" \
  --region asia-east1
```

### 方式二：使用 YAML 檔案

建立 `service.yaml`：

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: firestore-demo-api
spec:
  template:
    spec:
      containers:
      - image: gcr.io/your-project/firestore-demo-api:v1
        env:
        - name: NODE_ENV
          value: "production"
        - name: FIREBASE_PROJECT_ID
          value: "your-project-id"
        - name: GOOGLE_CREDENTIALS_BASE64
          value: "ewogICJ0eXBlIjogInNlcnZpY2VfYWNjb3VudCIsCi..."
        - name: CORS_ORIGIN
          value: "https://example.com"
        - name: DEFAULT_PAGE_LIMIT
          value: "20"
        - name: MAX_PAGE_LIMIT
          value: "100"
```

部署：
```bash
gcloud run services replace service.yaml --region asia-east1
```

### 方式三：使用 Cloud Console

1. 前往 [Cloud Run Console](https://console.cloud.google.com/run)
2. 選擇服務
3. 點擊「編輯和部署新修訂版本」
4. 展開「容器」> 「變數和密鑰」
5. 點擊「新增變數」
6. 輸入變數名稱和值
7. 點擊「部署」

---

## ✅ 驗證方法

### 1. 檢查環境變數是否載入

在 `index.js` 中加入臨時日誌：

```javascript
console.log('Environment Variables:');
console.log('PORT:', process.env.PORT);
console.log('NODE_ENV:', process.env.NODE_ENV);
console.log('FIREBASE_PROJECT_ID:', process.env.FIREBASE_PROJECT_ID);
console.log('GOOGLE_APPLICATION_CREDENTIALS:', process.env.GOOGLE_APPLICATION_CREDENTIALS ? 'Set' : 'Not Set');
console.log('GOOGLE_CREDENTIALS_BASE64:', process.env.GOOGLE_CREDENTIALS_BASE64 ? 'Set' : 'Not Set');
```

### 2. 測試 Firebase 連線

```bash
# 啟動伺服器
npm start

# 測試健康檢查
curl http://localhost:8080/health

# 測試 Firestore 存取
curl http://localhost:8080/api/products
```

### 3. 驗證 Cloud Run 環境變數

```bash
# 查看服務設定
gcloud run services describe firestore-demo-api \
  --region asia-east1 \
  --format="value(spec.template.spec.containers[0].env)"
```

### 4. 檢查日誌

**本地：**
```bash
# 啟動伺服器時會顯示初始化訊息
npm run dev
```

**Cloud Run：**
```bash
# 查看服務日誌
gcloud run services logs read firestore-demo-api \
  --region asia-east1 \
  --limit 50
```

---

## ❓ 常見問題

### Q1: `.env` 檔案沒有生效？

**可能原因：**
- 檔案名稱錯誤（必須是 `.env`，注意開頭的點）
- 檔案位置錯誤（必須在專案根目錄）
- 未安裝 `dotenv` 套件

**解決方式：**
```bash
# 檢查檔案
ls -la .env

# 檢查內容
cat .env

# 確認 dotenv 已安裝
npm list dotenv
```

---

### Q2: Cloud Run 環境變數無法更新？

**解決方式：**
```bash
# 方法一：明確指定新值
gcloud run services update firestore-demo-api \
  --update-env-vars "KEY=NEW_VALUE" \
  --region asia-east1

# 方法二：移除後重新設定
gcloud run services update firestore-demo-api \
  --remove-env-vars "KEY" \
  --region asia-east1

gcloud run services update firestore-demo-api \
  --set-env-vars "KEY=NEW_VALUE" \
  --region asia-east1
```

---

### Q3: Base64 編碼後的值包含換行符？

**問題：** 使用 `base64` 命令時可能產生換行符

**解決方式：**

**macOS/Linux：**
```bash
base64 -w 0 firebase-service-account.json > encoded.txt
```

**或者：**
```bash
base64 firebase-service-account.json | tr -d '\n' > encoded.txt
```

---

### Q4: 如何在不同環境使用不同設定？

**方法一：使用多個 .env 檔案**

```bash
.env.development
.env.production
.env.test
```

載入時指定：
```bash
NODE_ENV=development node -r dotenv/config index.js
```

**方法二：使用環境變數前綴**

```bash
# 開發環境
npm run dev

# 生產環境
NODE_ENV=production npm start
```

---

### Q5: 環境變數值包含特殊字元怎麼辦？

**使用引號包裹：**

```env
# 包含空格
VARIABLE="value with spaces"

# 包含特殊字元
DATABASE_URL="postgresql://user:p@ss!word@localhost:5432/db"

# 包含換行（使用 \n）
MULTI_LINE="line1\nline2\nline3"
```

---

## 🔗 相關文檔

- [Firebase 專案設定](./firebase-setup.md)
- [Service Account 設定](./service-account.md)
- [Cloud Run 部署](./cloud-run-deployment.md)

---

## 📚 官方文檔

- [dotenv 文檔](https://github.com/motdotla/dotenv)
- [Cloud Run Environment Variables](https://cloud.google.com/run/docs/configuring/environment-variables)
- [12-Factor App: Config](https://12factor.net/config)
