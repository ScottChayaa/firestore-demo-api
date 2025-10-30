# 更新日誌 (Changelog)

所有重要的專案變更都會記錄在此檔案。

---

## [2.0.0] - 2025-10-30

### 🎉 重大更新：完整的 Firebase Authentication 整合

本次更新實作了完整的會員認證系統，包含註冊、登入、權限控制等功能。

#### ✨ 新增功能

1. **會員認證系統**
   - 新增 POST `/api/auth/register` - 會員註冊（同時建立 Firebase Auth 用戶和 Firestore document）
   - 新增 POST `/api/auth/login` - 會員登入（使用 Firebase REST API 取得 ID Token）
   - 密碼由 Firebase Auth 安全管理，無需自行實作加密

2. **管理員權限系統**
   - 新增 `admins` collection 儲存管理員列表
   - 新增 middleware `checkAdminStatus` - 自動檢查用戶是否為管理員
   - 新增 middleware `requireAdmin` - 要求管理員權限
   - 新增腳本 `scripts/setAdmin.js` - 管理員設定工具

3. **訂單權限過濾**
   - 新增 middleware `filterOrdersByOwnership` - 會員只能查詢自己的訂單
   - 新增 middleware `checkOrderOwnership` - 檢查訂單所有權
   - 新增 middleware `enforceOwnershipOnCreate` - 建立訂單時強制 memberId
   - 管理員可以查詢/管理所有訂單

4. **測試資料生成**
   - 更新 `seedData.js` 同時建立 Firebase Auth 用戶和 Firestore document
   - 所有測試帳號密碼統一為 `qwer1234`
   - 自動建立管理員帳號 `admin@example.com`

#### 🔒 安全性更新

1. **Firestore Security Rules**
   - 新增 `isAdmin()` 輔助函數檢查管理員身份
   - Members: 只有本人或管理員可讀寫
   - Orders: 只有訂單所屬會員或管理員可讀寫
   - Admins: 只有管理員可讀寫
   - Products: 任何人可讀，只有管理員可寫

2. **Middleware 架構**
   - `authenticate` 自動附加 `req.user.isAdmin` 屬性
   - 所有私有 API 都經過權限檢查
   - 防止用戶存取他人資料

#### 📦 依賴項更新

- 新增 `axios` - 用於 Firebase REST API 呼叫

#### 🔧 配置變更

- 新增環境變數 `FIREBASE_WEB_API_KEY` - 用於會員登入驗證

#### 📝 文檔更新

- 更新 `docs/api-testing.md` - 新增註冊/登入範例
- 更新 `.env.example` - 新增 FIREBASE_WEB_API_KEY
- 新增 `CHANGELOG.md` - 版本更新記錄

#### ⚠️ 重大變更 (Breaking Changes)

1. **Members Collection 結構變更**
   - Member document ID 現在使用 Firebase Auth 的 UID（之前是 Firestore 自動生成）
   - 建議：重新生成測試資料 `npm run seed`

2. **POST /api/members 已棄用**
   - 改用 POST `/api/auth/register` 註冊新會員
   - 舊端點仍可使用但不建議

#### 🎯 測試方式

```bash
# 1. 生成測試資料
npm run seed

# 2. 登入取得 token
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email": "user1@example.com", "password": "qwer1234"}'

# 3. 使用 token 測試 API
curl http://localhost:8080/api/orders \
-H "Authorization: Bearer YOUR_ID_TOKEN"

# 4. 測試管理員功能
curl -X POST http://localhost:8080/api/auth/login \
-H "Content-Type: application/json" \
-d '{"email": "admin@example.com", "password": "qwer1234"}'
```

#### 🛠️ 開發者工具

新增管理員管理腳本：

```bash
# 列出所有管理員
node scripts/setAdmin.js list

# 新增管理員
node scripts/setAdmin.js add user@example.com

# 移除管理員
node scripts/setAdmin.js remove user@example.com
```

---

## [1.0.0] - 2025-10-29

### 🎉 初始版本

- ✅ 完整的 CRUD 操作（會員、訂單、商品）
- ✅ **公開 API**（無需驗證）：商品瀏覽功能
- ✅ **私有 API**（需 Firebase Auth）：會員與訂單管理
- ✅ Cursor 分頁機制（高效能）
- ✅ 多條件篩選查詢
- ✅ Firestore 索引優化
- ✅ 測試資料自動生成
- ✅ 部署至 Google Cloud Run
- ✅ Docker 容器化支援
