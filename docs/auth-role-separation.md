# 會員與管理員身份分離實作指南

## 需求背景

同一個帳號（如 `admin@example.com`）可能同時具有會員和管理員身份：
- 存在於 `members` collection → 可使用會員功能
- 存在於 `admins` collection → 可使用管理功能

**目標**：透過不同的登入端點，讓使用者明確選擇「以哪種身份登入」。

---

## 使用情境

### 情境 1：純會員帳號
`member@example.com` 只存在於 `members` collection。

```
1. POST /api/auth/member/login → ✅ 成功，取得 member token
2. GET /api/member/orders → ✅ 看到自己的訂單
3. GET /api/admin/orders → ❌ 403 Forbidden（不是管理員）
```

---

### 情境 2：純管理員帳號
`staff@example.com` 只存在於 `admins` collection（不是會員）。

```
1. POST /api/auth/admin/login → ✅ 成功，取得 admin token
2. GET /api/admin/orders → ✅ 看到所有訂單
3. POST /api/auth/member/login → ❌ 400 Bad Request（不是會員）
```

---

### 情境 3：雙重身份帳號
`admin@example.com` 同時存在於 `members` 和 `admins` collection。

**使用會員 APP**：
```
1. POST /api/auth/member/login → ✅ 成功，取得 member token
2. GET /api/member/orders → ✅ 只看到自己的訂單（memberId = uid）
3. GET /api/admin/orders → ❌ 403 Forbidden（當前是 member 身份）
```

**使用管理後台**：
```
1. POST /api/auth/admin/login → ✅ 成功，取得 admin token
2. GET /api/admin/orders → ✅ 看到所有訂單
3. GET /api/member/orders → ❌ 403 Forbidden（當前是 admin 身份）
```

---

## 技術實作方式

### 方案：Firebase Custom Claims

使用 Firebase Authentication 的 [Custom Claims](https://firebase.google.com/docs/auth/admin/custom-claims) 功能在 token 中標記使用者的登入身份。

#### 優點
- Token 本身包含身份資訊（無需額外請求）
- 經過 Firebase 簽名驗證（安全可靠）
- 支援離線驗證

#### 缺點
- 需要建立登入端點來設定 claims
- Custom claims 最多 1000 bytes
- Claims 更新後需要重新取得 token（logout/login）

---

## 帳號建立與管理

### 會員註冊流程

**端點**：`POST /api/auth/register`
**方法**：`authController.memberRegister()`

```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "member@example.com",
  "password": "password123",
  "name": "王小明",
  "phone": "0912345678"
}
```

**後端處理**：
1. 檢查 Email 是否已存在於 Firebase Auth
2. 建立 Firebase Auth 用戶
3. 在 `members` collection 新增資料（使用 Firebase Auth UID）

**結果**：
- ✅ Firebase Auth 建立帳號
- ✅ `members` collection 新增資料

---

### 管理員建立流程

#### 方式一：建立完整管理員帳號

**端點**：`POST /api/admin/create-admin`（需超級管理員權限）

```http
POST /api/admin/create-admin
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "email": "admin@example.com",
  "password": "admin123",
  "name": "李經理"
}
```

**後端處理**：
1. 使用 Firebase Admin SDK 建立帳號
2. 在 `admins` collection 新增資料

**結果**：
- ✅ Firebase Auth 建立帳號
- ✅ `admins` collection 新增資料

---

#### 方式二：為現有帳號新增管理員角色

**情境**：`member01@example.com` 已是會員，現在要賦予管理員權限

**端點**：`POST /api/admin/create-admin-role`（需超級管理員權限）

```http
POST /api/admin/create-admin-role
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "email": "member01@example.com",
  "name": "王小明（管理員）"
}
```

**後端處理**：
1. 檢查 Firebase Auth 是否已存在該 Email ✅ 存在
2. 檢查 `admins` collection 是否已有此 Email
3. 在 `admins` collection 新增資料（使用相同 UID）
4. **不建立新的 Firebase Auth 帳號**

**結果**：
- ✅ `admins` collection 新增資料
- ✅ Firebase Auth 保持原有帳號（密碼不變）
- ✅ 用戶現在可以使用「會員登入」或「管理員登入」

---

#### 方式三：為現有帳號新增會員角色

**情境**：`admin01@example.com` 已是管理員，現在要賦予會員權限

**端點**：`POST /api/admin/create-member-role`（需超級管理員權限）

```http
POST /api/admin/create-member-role
Authorization: Bearer <super-admin-token>
Content-Type: application/json

{
  "email": "admin01@example.com",
  "name": "李經理（會員）",
  "phone": "0912345678"
}
```

**後端處理**：
1. 檢查 Firebase Auth 是否已存在該 Email ✅ 存在
2. 檢查 `members` collection 是否已有此 Email
3. 在 `members` collection 新增資料（使用相同 UID）

**結果**：
- ✅ `members` collection 新增資料
- ✅ Firebase Auth 保持原有帳號（密碼不變）
- ✅ 用戶現在可以使用「會員登入」或「管理員登入」

---

### 雙重身份帳號的建立邏輯

| 順序 | 操作 | 說明 |
|-----|------|------|
| 1 | 先註冊會員 | 前台 APP 執行 `POST /api/auth/register` |
| 2 | 後新增管理員角色 | 後台執行 `POST /api/admin/create-admin-role` |
| ✅ | 結果 | 同一個 Email 同時存在於 `members` 和 `admins`，**密碼相同** |

| 順序 | 操作 | 說明 |
|-----|------|------|
| 1 | 先建立管理員 | 後台執行 `POST /api/admin/create-admin` |
| 2 | 後新增會員角色 | 後台執行 `POST /api/admin/create-member-role` |
| ✅ | 結果 | 同一個 Email 同時存在於 `members` 和 `admins`，**密碼相同** |

**重點**：
- **一個 Email = 一組密碼**（Firebase Auth 限制）
- **一個 UID = 多個角色**（可同時存在於 members 和 admins）
- **登入時選擇身份**（透過不同的登入端點）

---

### 前台註冊限制

如果用戶嘗試在前台 APP 註冊已存在的 Email：

```http
POST /api/auth/register
{
  "email": "admin01@example.com",  ← 已存在於 Firebase Auth
  "password": "newpassword",
  "name": "李經理"
}

回應：
❌ 400 Bad Request
{
  "error": "此 Email 已被註冊，請直接登入或聯繫管理員"
}
```

**解決方式**：
- 若要為已存在的管理員新增會員角色，必須透過後台 `POST /api/admin/create-member-role`

---

## API 設計

### 基礎驗證端點

#### Email/Password 取得 Token

**端點**：`POST /api/auth/login`
**方法**：`authController.getTokenByEmail()`

```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "user@example.com",
  "password": "password123"
}
```

**功能**：
- 使用 Firebase REST API 驗證密碼
- 取得 Firebase ID Token
- **不設定角色（loginAs）**

**回應**：
```json
{
  "message": "登入成功",
  "data": {
    "idToken": "<Firebase_ID_Token>",
    "refreshToken": "<Refresh_Token>",
    "expiresIn": "3600"
  }
}
```

**用途**：
- 基礎身份驗證
- 取得 Token 後，需呼叫 `memberLogin` 或 `adminLogin` 設定角色

---

### 角色登入端點

#### 會員登入
```http
POST /api/auth/member/login
Content-Type: application/json

{
  "idToken": "<Firebase_ID_Token>"
}
```

**流程**：
1. 驗證 Firebase ID Token
2. 檢查 `members` collection 是否存在該 uid
3. 設定 custom claims: `{ loginAs: 'member' }`
4. 回傳新的 ID Token

**回應**：
```json
{
  "success": true,
  "data": {
    "uid": "abc123",
    "email": "member@example.com",
    "role": "member",
    "token": "<New_Token_With_Claims>"
  },
  "message": "會員登入成功"
}
```

---

#### 管理員登入
```http
POST /api/auth/admin/login
Content-Type: application/json

{
  "idToken": "<Firebase_ID_Token>"
}
```

**流程**：
1. 驗證 Firebase ID Token
2. 檢查 `admins` collection 是否存在該 uid
3. 設定 custom claims: `{ loginAs: 'admin' }`
4. 回傳新的 ID Token

**回應**：
```json
{
  "success": true,
  "data": {
    "uid": "xyz789",
    "email": "admin@example.com",
    "role": "admin",
    "token": "<New_Token_With_Claims>"
  },
  "message": "管理員登入成功"
}
```

---

### 訂單端點

#### 會員訂單端點
```http
GET /api/member/orders
Authorization: Bearer <Token_With_Member_Claims>
```

**權限要求**：
- Token 必須包含 `loginAs: 'member'`
- uid 必須存在於 `members` collection

**行為**：
- 自動過濾：`memberId === uid`
- 只顯示自己的訂單

---

#### 管理員訂單端點
```http
GET /api/admin/orders?memberId=abc123&status=completed
Authorization: Bearer <Token_With_Admin_Claims>
```

**權限要求**：
- Token 必須包含 `loginAs: 'admin'`
- uid 必須存在於 `admins` collection

**行為**：
- 無過濾限制
- 可查詢任何會員的訂單
- 支援所有查詢參數

---

## 客戶端整合

### 會員 APP 登入流程

```javascript
// Step 1: Firebase Authentication（現有流程）
const userCredential = await signInWithEmailAndPassword(
  auth,
  'member@example.com',
  'password123'
);

// Step 2: 取得 ID Token
const idToken = await userCredential.user.getIdToken();

// Step 3: 呼叫會員登入端點
const response = await fetch('http://your-api.com/api/auth/member/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const { data } = await response.json();

// Step 4: 儲存新的 token（含 custom claims）
localStorage.setItem('authToken', data.token);
localStorage.setItem('userRole', data.role);  // 'member'

// Step 5: 之後的請求都使用這個 token
fetch('http://your-api.com/api/member/orders', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
```

---

### 管理後台登入流程

```javascript
// Step 1: Firebase Authentication
const userCredential = await signInWithEmailAndPassword(
  auth,
  'admin@example.com',
  'admin_password'
);

// Step 2: 取得 ID Token
const idToken = await userCredential.user.getIdToken();

// Step 3: 呼叫管理員登入端點
const response = await fetch('http://your-api.com/api/auth/admin/login', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ idToken })
});

const { data } = await response.json();

// Step 4: 儲存新的 token
localStorage.setItem('authToken', data.token);
localStorage.setItem('userRole', data.role);  // 'admin'

// Step 5: 使用管理端點
fetch('http://your-api.com/api/admin/orders', {
  headers: {
    'Authorization': `Bearer ${localStorage.getItem('authToken')}`
  }
});
```

---

## 伺服器端實作

### 設定 Custom Claims

```javascript
// src/controllers/authController.js

const { admin, db } = require('@/config/firebase');

// 會員登入
exports.memberLogin = async (req, res) => {
  const { idToken } = req.body;

  // 1. 驗證 token
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const uid = decodedToken.uid;

  // 2. 檢查是否為會員
  const memberDoc = await db.collection('members').doc(uid).get();
  if (!memberDoc.exists) {
    throw new ValidationError('該帳號不是會員');
  }

  // 3. 設定 custom claims
  await admin.auth().setCustomUserClaims(uid, {
    loginAs: 'member'
  });

  // 4. 取得新的 token（包含 claims）
  const newToken = await admin.auth().createCustomToken(uid);

  res.json({
    success: true,
    data: {
      uid,
      email: decodedToken.email,
      role: 'member',
      token: newToken
    },
    message: '會員登入成功'
  });
};

// 管理員登入
exports.adminLogin = async (req, res) => {
  const { idToken } = req.body;

  // 1. 驗證 token
  const decodedToken = await admin.auth().verifyIdToken(idToken);
  const uid = decodedToken.uid;

  // 2. 檢查是否為管理員
  const adminDoc = await db.collection('admins').doc(uid).get();
  if (!adminDoc.exists) {
    throw new ValidationError('該帳號不是管理員');
  }

  // 3. 設定 custom claims
  await admin.auth().setCustomUserClaims(uid, {
    loginAs: 'admin'
  });

  // 4. 取得新的 token
  const newToken = await admin.auth().createCustomToken(uid);

  res.json({
    success: true,
    data: {
      uid,
      email: decodedToken.email,
      role: 'admin',
      token: newToken
    },
    message: '管理員登入成功'
  });
};
```

---

### 讀取 Custom Claims

```javascript
// src/middleware/auth.js

async function authenticate(req, res, next) {
  // ... 驗證 token ...

  const decodedToken = await admin.auth().verifyIdToken(token);

  req.user = {
    uid: decodedToken.uid,
    email: decodedToken.email,
    emailVerified: decodedToken.email_verified,
    name: decodedToken.name,
    picture: decodedToken.picture,
    loginAs: decodedToken.loginAs || null,  // 讀取 custom claims
  };

  await checkAdminStatus(req, res, next);
}
```

---

### 會員認證中間件

```javascript
// src/middleware/authMember.js

const { authenticate } = require('./auth');
const { db } = require('@/config/firebase');
const { ForbiddenError } = require('./errorHandler');

async function authMember(req, res, next) {
  await authenticate(req, res, async () => {
    // 1. 檢查 loginAs
    if (req.user.loginAs !== 'member') {
      throw new ForbiddenError('請使用會員身份登入');
    }

    // 2. 雙重驗證：確認存在於 members collection
    const memberDoc = await db.collection('members').doc(req.user.uid).get();
    if (!memberDoc.exists) {
      throw new ForbiddenError('會員資料不存在');
    }

    next();
  });
}

module.exports = { authMember };
```

---

### 管理員認證中間件

```javascript
// src/middleware/authAdmin.js

const { authenticate } = require('./auth');
const { requireAdmin } = require('./adminCheck');
const { ForbiddenError } = require('./errorHandler');

async function authAdmin(req, res, next) {
  await authenticate(req, res, () => {
    // 1. 檢查 loginAs
    if (req.user.loginAs !== 'admin') {
      throw new ForbiddenError('請使用管理員身份登入');
    }

    // 2. 使用現有的 admin 檢查
    requireAdmin(req, res, next);
  });
}

module.exports = { authAdmin };
```

---

## 安全性考量

### Custom Claims 的限制

1. **大小限制**：最多 1000 bytes
   - 本方案只用了約 20 bytes
   - 足夠使用

2. **更新延遲**：Claims 更新後，舊 token 仍然有效
   - 解決方式：登入時強制取得新 token
   - 客戶端需要重新登入

3. **無法即時撤銷**：Token 在過期前都有效
   - 預設過期時間：1 小時
   - 可透過 Firebase Admin SDK 主動撤銷

---

### 防止身份偽造

**問題**：客戶端可以篡改 `loginAs` 嗎？

**答案**：不行。理由：
1. Custom claims 儲存在 JWT token 中
2. JWT 經過 Firebase 私鑰簽名
3. 任何篡改都會導致簽名驗證失敗
4. 只有伺服器端可以透過 Admin SDK 設定 claims

---

### 雙重驗證機制

即使 token 包含 `loginAs: 'member'`，middleware 仍會：
1. 驗證 token 簽名（Firebase 自動）
2. 檢查 `loginAs` 值
3. 查詢 Firestore 確認使用者確實存在於對應的 collection

**防止**：
- 偽造 token
- 使用過期的 claims
- 存取不屬於自己的資源

---

## 測試計畫

### 單元測試

```javascript
describe('Member Login', () => {
  it('should succeed for valid member', async () => {
    // Given: member@example.com 存在於 members collection
    // When: POST /api/auth/member/login
    // Then: 回傳 200 + token with loginAs='member'
  });

  it('should fail for non-member', async () => {
    // Given: user@example.com 不存在於 members collection
    // When: POST /api/auth/member/login
    // Then: 回傳 400 "該帳號不是會員"
  });
});

describe('Member Orders API', () => {
  it('should only show own orders', async () => {
    // Given: member token
    // When: GET /api/member/orders
    // Then: 只回傳 memberId === uid 的訂單
  });

  it('should reject admin token', async () => {
    // Given: admin token
    // When: GET /api/member/orders
    // Then: 403 "請使用會員身份登入"
  });
});
```

---

### 整合測試

```javascript
describe('Dual-role User Flow', () => {
  it('admin can switch between roles', async () => {
    // Given: admin@example.com 同時在 members + admins

    // 1. 會員登入
    const memberToken = await memberLogin('admin@example.com');
    const memberOrders = await getOrders(memberToken, '/api/member/orders');
    expect(memberOrders).toHaveLength(2);  // 只有自己的

    // 2. 管理員登入
    const adminToken = await adminLogin('admin@example.com');
    const allOrders = await getOrders(adminToken, '/api/admin/orders');
    expect(allOrders).toHaveLength(500);  // 所有訂單

    // 3. 交叉驗證
    await expect(
      getOrders(memberToken, '/api/admin/orders')
    ).rejects.toThrow('請使用管理員身份登入');

    await expect(
      getOrders(adminToken, '/api/member/orders')
    ).rejects.toThrow('請使用會員身份登入');
  });
});
```

---

## 常見問題

### Q1: 為什麼不直接用 `isAdmin` 判斷？

**答**：因為 `isAdmin` 只能標記「是否為管理員」，無法標記「當前使用哪種身份」。

範例：
- `admin@example.com` 的 `isAdmin === true`
- 但使用會員 APP 時，應該「暫時忽略」管理員權限

---

### Q2: Custom claims 會過期嗎？

**答**：Claims 本身不會過期，但 token 會過期（預設 1 小時）。

解決方式：
- 客戶端監聽 token 過期事件
- 自動使用 refresh token 取得新 token
- 新 token 會包含最新的 claims

---

### Q3: 如何撤銷某個使用者的 token？

**答**：使用 Firebase Admin SDK：

```javascript
await admin.auth().revokeRefreshTokens(uid);
```

這會使所有現有 token 失效，使用者需要重新登入。

---

### Q4: 可以動態切換身份嗎（不重新登入）？

**答**：技術上可以，但不建議。

理由：
- 需要額外的狀態管理
- 安全性較低
- 使用者體驗不清晰

建議：
- 明確的登入/登出流程
- 清楚標示當前使用的身份

---

## 實作檢查清單

- [ ] 建立 `authController.js`（會員登入、管理員登入）
- [ ] 建立 `/api/auth` 路由
- [ ] 修改 `auth.js` middleware 讀取 `loginAs` claims
- [ ] 建立 `authMember.js` middleware
- [ ] 建立 `authAdmin.js` middleware
- [ ] 建立 `memberOwnership.js` middleware
- [ ] 建立 `/api/member/orders` 路由
- [ ] 建立 `/api/admin/orders` 路由
- [ ] 更新 `app.js` 掛載新路由
- [ ] 移除舊的 `orders.js` 和 `ownership.js`
- [ ] 撰寫單元測試
- [ ] 撰寫整合測試
- [ ] 更新 API 文檔
- [ ] 通知前端團隊 API 變更

---

## 相關資源

- [Firebase Custom Claims 文檔](https://firebase.google.com/docs/auth/admin/custom-claims)
- [Firebase Admin Auth API](https://firebase.google.com/docs/reference/admin/node/firebase-admin.auth)
- [JWT 簽名驗證原理](https://jwt.io/introduction)
