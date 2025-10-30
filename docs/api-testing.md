# API 測試範例

本文檔提供完整的 API 測試範例，包含 curl 和 Postman 使用方式。

---

## 📋 目錄

- [取得 Firebase Auth Token](#取得-firebase-auth-token)
- [公開 API 測試](#公開-api-測試)
- [私有 API 測試](#私有-api-測試)
- [Postman Collection](#postman-collection)
- [自動化測試腳本](#自動化測試腳本)
- [錯誤處理測試](#錯誤處理測試)

---

## 🔑 取得 Firebase Auth Token

私有 API 需要 Firebase ID Token 進行驗證。以下是幾種取得方式：

### 方法一：使用本 API 的註冊/登入端點（推薦）

這是最簡單的方式！本 API 提供了完整的註冊和登入功能。

#### 步驟 1：註冊新帳號

```bash
curl -X POST http://localhost:8080/api/auth/register \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "qwer1234",
  "name": "測試用戶",
  "phone": "0912345678"
}'
```

**回應：**
```json
{
  "success": true,
  "data": {
    "uid": "ABC123...",
    "email": "test@example.com",
    "name": "測試用戶",
    "phone": "0912345678"
  },
  "message": "註冊成功，請使用 /api/auth/login 登入取得 token"
}
```

#### 步驟 2：登入取得 Token

```bash
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "test@example.com",
  "password": "qwer1234"
}'
```

**回應：**
```json
{
  "success": true,
  "data": {
    "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
    "refreshToken": "...",
    "expiresIn": "3600",
    "user": {
      "uid": "ABC123...",
      "email": "test@example.com",
      "name": "測試用戶",
      "phone": "0912345678"
    }
  },
  "message": "登入成功"
}
```

**複製 `idToken` 值即為 Firebase Auth Token。**

#### 使用測試資料的帳號

如果你已經執行 `npm run seed`，可以直接使用以下帳號：

**會員帳號：**
- Email: `user1@example.com` ~ `user100@example.com`
- 密碼: `qwer1234`（統一）

**管理員帳號：**
- Email: `admin@example.com`
- 密碼: `qwer1234`

```bash
# 登入測試會員
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "user1@example.com",
  "password": "qwer1234"
}'

# 登入管理員
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{
  "email": "admin@example.com",
  "password": "qwer1234"
}'
```

---

### 方法二：使用 Firebase Authentication REST API（進階）

#### 步驟 1：建立測試用戶

前往 [Firebase Console](https://console.firebase.google.com/)：
1. Authentication > Users
2. Add user
3. 輸入 Email 和密碼

#### 步驟 2：取得 Web API Key

前往 Project Settings > General，複製「Web API Key」。

#### 步驟 3：使用 Email/Password 登入

```bash
# 使用 signInWithPassword API
curl -X POST 'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=YOUR_WEB_API_KEY' \
-H 'Content-Type: application/json' \
-d '{
  "email": "test@example.com",
  "password": "password123",
  "returnSecureToken": true
}'
```

**回應：**
```json
{
  "idToken": "eyJhbGciOiJSUzI1NiIsImtpZCI6...",
  "email": "test@example.com",
  "refreshToken": "...",
  "expiresIn": "3600",
  "localId": "..."
}
```

**複製 `idToken` 值即為 Firebase Auth Token。**

---

### 方法二：使用 Firebase Admin SDK（測試用）

建立 `scripts/get-test-token.js`：

```javascript
const admin = require('firebase-admin');
const serviceAccount = require('../firebase-service-account.json');

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount)
});

async function createCustomToken() {
  // 建立測試用戶
  const uid = 'test-user-001';

  try {
    // 生成 Custom Token
    const customToken = await admin.auth().createCustomToken(uid);
    console.log('Custom Token:', customToken);

    // 注意：Custom Token 需要在客戶端交換為 ID Token
    // 這裡僅供示範，實際使用建議用方法一
  } catch (error) {
    console.error('Error:', error);
  }
}

createCustomToken();
```

執行：
```bash
node scripts/get-test-token.js
```

---

### 方法三：使用前端應用取得（推薦用於生產）

在您的前端應用中：

```javascript
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';

const auth = getAuth();
signInWithEmailAndPassword(auth, email, password)
  .then(async (userCredential) => {
    const idToken = await userCredential.user.getIdToken();
    console.log('ID Token:', idToken);
  });
```

---

## 🌐 公開 API 測試

公開 API 無需驗證，任何人都可以存取。

### 1. 健康檢查

```bash
curl http://localhost:8080/health
```

**預期回應：**
```json
{
  "success": true,
  "message": "Firestore Demo API is running",
  "timestamp": "2025-10-29T10:30:00.000Z",
  "environment": "development"
}
```

---

### 2. 瀏覽商品列表（基本）

```bash
curl http://localhost:8080/api/public/products
```

**預期回應：**
```json
{
  "success": true,
  "data": [
    {
      "id": "product123",
      "name": "無線藍牙耳機 1",
      "description": "優質的無線藍牙耳機，品質保證",
      "price": 1200,
      "category": "electronics",
      "stock": 50,
      "imageUrl": "https://via.placeholder.com/300?text=%E7%84%A1%E7%B7%9A%E8%97%8D%E7%89%99%E8%80%B3%E6%A9%9F",
      "createdAt": "2025-10-29T10:00:00.000Z"
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

---

### 3. 瀏覽商品列表（帶參數）

#### 限制數量

```bash
curl "http://localhost:8080/api/public/products?limit=10"
```

#### 按分類篩選

```bash
curl "http://localhost:8080/api/public/products?category=electronics"
```

#### 價格範圍篩選

```bash
curl "http://localhost:8080/api/public/products?minPrice=500&maxPrice=2000"
```

#### 組合查詢

```bash
curl "http://localhost:8080/api/public/products?category=electronics&minPrice=1000&limit=5"
```

#### 排序

```bash
# 按價格升序
curl "http://localhost:8080/api/public/products?orderBy=price&order=asc"

# 按建立時間降序（預設）
curl "http://localhost:8080/api/public/products?orderBy=createdAt&order=desc"
```

---

### 4. Cursor 分頁

#### 第一頁

```bash
curl "http://localhost:8080/api/public/products?limit=10"
```

**從回應中取得 `nextCursor`：**
```json
{
  "pagination": {
    "nextCursor": "product_abc123",
    "hasMore": true
  }
}
```

#### 下一頁

```bash
curl "http://localhost:8080/api/public/products?limit=10&cursor=product_abc123"
```

#### 持續翻頁

```bash
# 使用上一次回應的 nextCursor
curl "http://localhost:8080/api/public/products?limit=10&cursor=product_xyz789"
```

---

### 5. 查看商品詳情

```bash
curl http://localhost:8080/api/public/products/product123
```

**預期回應：**
```json
{
  "success": true,
  "data": {
    "id": "product123",
    "name": "無線藍牙耳機 1",
    "description": "優質的無線藍牙耳機，品質保證",
    "price": 1200,
    "category": "electronics",
    "stock": 50,
    "imageUrl": "https://via.placeholder.com/300",
    "createdAt": "2025-10-29T10:00:00.000Z"
  }
}
```

---

### 6. 取得商品分類列表

```bash
curl http://localhost:8080/api/public/products/categories
```

**預期回應：**
```json
{
  "success": true,
  "data": ["electronics", "clothing", "food", "books", "sports"]
}
```

---

## 🔐 私有 API 測試

私有 API 需要在 Header 中提供 Firebase ID Token。

### Token 格式

```bash
Authorization: Bearer YOUR_FIREBASE_ID_TOKEN
```

---

### 會員管理 API

#### 1. 列出會員

```bash
curl http://localhost:8080/api/members \
  -H "Authorization: Bearer eyJhbGciOiJSUzI1NiIsImtpZCI6..."
```

#### 2. 創建會員

```bash
curl -X POST http://localhost:8080/api/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "王小明",
    "email": "ming@example.com",
    "phone": "0912345678"
  }'
```

**預期回應：**
```json
{
  "success": true,
  "data": {
    "id": "member_abc123",
    "name": "王小明",
    "email": "ming@example.com",
    "phone": "0912345678",
    "createdAt": "2025-10-29T10:30:00.000Z",
    "updatedAt": "2025-10-29T10:30:00.000Z"
  },
  "message": "會員建立成功"
}
```

#### 3. 查看會員詳情

```bash
curl http://localhost:8080/api/members/member_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 4. 更新會員資料

```bash
curl -X PUT http://localhost:8080/api/members/member_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "0987654321"
  }'
```

#### 5. 刪除會員

```bash
curl -X DELETE http://localhost:8080/api/members/member_abc123 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**預期回應：**
```json
{
  "success": true,
  "message": "會員刪除成功",
  "data": {
    "id": "member_abc123"
  }
}
```

---

### 訂單管理 API

#### 1. 列出訂單（基本）

```bash
curl http://localhost:8080/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 2. 多條件篩選

**按會員查詢：**
```bash
curl "http://localhost:8080/api/orders?memberId=member_abc123" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**按狀態查詢：**
```bash
curl "http://localhost:8080/api/orders?status=completed" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**日期範圍查詢：**
```bash
curl "http://localhost:8080/api/orders?startDate=2025-01-01&endDate=2025-10-31" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**金額範圍查詢：**
```bash
curl "http://localhost:8080/api/orders?minAmount=1000&maxAmount=5000" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**組合查詢：**
```bash
curl "http://localhost:8080/api/orders?memberId=member_abc123&status=completed&startDate=2025-01-01&limit=20" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 3. 創建訂單

```bash
curl -X POST http://localhost:8080/api/orders \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "memberId": "member_abc123",
    "items": [
      {
        "productId": "product_xyz",
        "productName": "無線藍牙耳機",
        "quantity": 2,
        "price": 1200
      }
    ],
    "totalAmount": 2400
  }'
```

**預期回應：**
```json
{
  "success": true,
  "data": {
    "id": "order_def456",
    "memberId": "member_abc123",
    "orderNumber": "ORD-20251029-ABC123",
    "items": [...],
    "totalAmount": 2400,
    "status": "pending",
    "createdAt": "2025-10-29T10:35:00.000Z",
    "updatedAt": "2025-10-29T10:35:00.000Z"
  },
  "message": "訂單建立成功"
}
```

#### 4. 查看訂單詳情

```bash
curl http://localhost:8080/api/orders/order_def456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

#### 5. 更新訂單狀態

```bash
curl -X PUT http://localhost:8080/api/orders/order_def456 \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "status": "completed"
  }'
```

#### 6. 刪除訂單

```bash
curl -X DELETE http://localhost:8080/api/orders/order_def456 \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

### 測試資料生成

```bash
curl -X POST http://localhost:8080/api/seed \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**預期回應：**
```json
{
  "success": true,
  "message": "測試資料生成成功",
  "data": {
    "membersCreated": 100,
    "ordersCreated": 500,
    "productsCreated": 50
  }
}
```

---

## 📮 Postman Collection

### 匯入 Collection

建立 `postman_collection.json`：

```json
{
  "info": {
    "name": "Firestore Demo API",
    "schema": "https://schema.getpostman.com/json/collection/v2.1.0/collection.json"
  },
  "item": [
    {
      "name": "Public API",
      "item": [
        {
          "name": "Health Check",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/health",
              "host": ["{{baseUrl}}"],
              "path": ["health"]
            }
          }
        },
        {
          "name": "Get Products",
          "request": {
            "method": "GET",
            "header": [],
            "url": {
              "raw": "{{baseUrl}}/api/public/products?limit=10",
              "host": ["{{baseUrl}}"],
              "path": ["api", "public", "products"],
              "query": [
                {"key": "limit", "value": "10"},
                {"key": "category", "value": "electronics", "disabled": true},
                {"key": "minPrice", "value": "500", "disabled": true}
              ]
            }
          }
        }
      ]
    },
    {
      "name": "Private API",
      "item": [
        {
          "name": "Create Member",
          "request": {
            "method": "POST",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{firebaseToken}}",
                "type": "text"
              },
              {
                "key": "Content-Type",
                "value": "application/json",
                "type": "text"
              }
            ],
            "body": {
              "mode": "raw",
              "raw": "{\n  \"name\": \"王小明\",\n  \"email\": \"ming@example.com\",\n  \"phone\": \"0912345678\"\n}"
            },
            "url": {
              "raw": "{{baseUrl}}/api/members",
              "host": ["{{baseUrl}}"],
              "path": ["api", "members"]
            }
          }
        },
        {
          "name": "Get Orders",
          "request": {
            "method": "GET",
            "header": [
              {
                "key": "Authorization",
                "value": "Bearer {{firebaseToken}}",
                "type": "text"
              }
            ],
            "url": {
              "raw": "{{baseUrl}}/api/orders?limit=20",
              "host": ["{{baseUrl}}"],
              "path": ["api", "orders"],
              "query": [
                {"key": "limit", "value": "20"},
                {"key": "status", "value": "completed", "disabled": true}
              ]
            }
          }
        }
      ]
    }
  ],
  "variable": [
    {
      "key": "baseUrl",
      "value": "http://localhost:8080",
      "type": "string"
    },
    {
      "key": "firebaseToken",
      "value": "YOUR_FIREBASE_TOKEN",
      "type": "string"
    }
  ]
}
```

### 匯入步驟

1. 開啟 Postman
2. 點擊「Import」
3. 選擇 `postman_collection.json`
4. 設定環境變數：
   - `baseUrl`: `http://localhost:8080` 或 Cloud Run URL
   - `firebaseToken`: 您的 Firebase ID Token

---

## 🤖 自動化測試腳本

### 測試腳本：test-api.sh

```bash
#!/bin/bash

# 設定
BASE_URL="http://localhost:8080"
TOKEN="YOUR_FIREBASE_TOKEN"

echo "========================================="
echo "Firestore Demo API 測試腳本"
echo "========================================="

# 測試 1：健康檢查
echo "\n[測試 1] 健康檢查"
curl -s "$BASE_URL/health" | jq .

# 測試 2：公開 API - 商品列表
echo "\n[測試 2] 公開 API - 商品列表"
curl -s "$BASE_URL/api/public/products?limit=5" | jq '.pagination'

# 測試 3：私有 API - 會員列表
echo "\n[測試 3] 私有 API - 會員列表"
curl -s "$BASE_URL/api/members" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.data | length'

# 測試 4：私有 API - 訂單列表
echo "\n[測試 4] 私有 API - 訂單列表"
curl -s "$BASE_URL/api/orders?limit=10" \
  -H "Authorization: Bearer $TOKEN" \
  | jq '.pagination'

# 測試 5：創建會員
echo "\n[測試 5] 創建會員"
RESPONSE=$(curl -s -X POST "$BASE_URL/api/members" \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "測試用戶",
    "email": "test-'$(date +%s)'@example.com",
    "phone": "0912345678"
  }')

echo "$RESPONSE" | jq .
MEMBER_ID=$(echo "$RESPONSE" | jq -r '.data.id')

# 測試 6：查看剛建立的會員
echo "\n[測試 6] 查看會員詳情"
curl -s "$BASE_URL/api/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

# 測試 7：刪除會員
echo "\n[測試 7] 刪除會員"
curl -s -X DELETE "$BASE_URL/api/members/$MEMBER_ID" \
  -H "Authorization: Bearer $TOKEN" \
  | jq .

echo "\n========================================="
echo "測試完成！"
echo "========================================="
```

### 執行測試

```bash
# 賦予執行權限
chmod +x test-api.sh

# 執行
./test-api.sh
```

---

## ❌ 錯誤處理測試

### 1. 未提供 Token

```bash
curl http://localhost:8080/api/members
```

**預期回應（401）：**
```json
{
  "success": false,
  "error": "Missing Authorization header",
  "message": "請提供 Authorization header: Bearer <token>"
}
```

---

### 2. Token 格式錯誤

```bash
curl http://localhost:8080/api/members \
  -H "Authorization: InvalidToken"
```

**預期回應（401）：**
```json
{
  "success": false,
  "error": "Invalid Authorization header format",
  "message": "格式應為: Bearer <token>"
}
```

---

### 3. Token 過期

```bash
curl http://localhost:8080/api/members \
  -H "Authorization: Bearer EXPIRED_TOKEN"
```

**預期回應（401）：**
```json
{
  "success": false,
  "error": "Token expired",
  "message": "ID Token 已過期，請重新登入"
}
```

---

### 4. 資源不存在

```bash
curl http://localhost:8080/api/members/non_existent_id \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**預期回應（404）：**
```json
{
  "success": false,
  "error": "NotFound",
  "message": "找不到會員 ID: non_existent_id"
}
```

---

### 5. 驗證錯誤

```bash
curl -X POST http://localhost:8080/api/members \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "",
    "email": "invalid-email"
  }'
```

**預期回應（400）：**
```json
{
  "success": false,
  "error": "ValidationError",
  "message": "請求參數驗證失敗",
  "details": [
    {
      "field": "name",
      "message": "姓名為必填欄位",
      "value": ""
    },
    {
      "field": "email",
      "message": "Email 格式不正確",
      "value": "invalid-email"
    }
  ]
}
```

---

## 🔗 相關文檔

- [Firebase 專案設定](./firebase-setup.md)
- [本地開發指南](./local-development.md)
- [環境變數設定](./environment-variables.md)
- [Cloud Run 部署](./cloud-run-deployment.md)

---

## 📚 延伸工具

- [Postman](https://www.postman.com/)
- [Insomnia](https://insomnia.rest/)
- [HTTPie](https://httpie.io/)
- [REST Client (VS Code)](https://marketplace.visualstudio.com/items?itemName=humao.rest-client)
