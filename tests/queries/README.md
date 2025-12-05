# Firestore 索引收集測試

## 概述

這個目錄包含所有用於測試 API 查詢組合並自動收集缺失 Firestore 索引的測試檔案。

## 設計理念

本系統整合了以下功能：
1. **API 測試**：測試所有查詢組合，確保 API 正常運作
2. **索引收集**：自動偵測並收集缺失的 Firestore 索引
3. **自動匯出**：測試結束後自動匯出至 `missing-indexes.json`

取代了舊的 `scripts/collect*.js` 系列腳本，使用更精簡的 Jest 測試框架。

## 檔案結構

```
tests/
├── setup/
│   ├── globalSetup.js          # Jest 全域設定
│   └── globalTeardown.js       # Jest 全域清理（匯出索引）
├── helpers/
│   ├── authHelper.js           # 認證 Token 工具
│   └── collectIndexesFromTests.js  # 索引收集工具
└── queries/
    ├── productQueries.test.js          # 商品查詢測試
    ├── productQueryConfigurations.js   # 商品查詢配置
    ├── orderQueries.test.js            # 訂單查詢測試
    ├── orderQueryConfigurations.js     # 訂單查詢配置
    ├── memberQueries.test.js           # 會員查詢測試
    ├── memberQueryConfigurations.js    # 會員查詢配置
    ├── adminQueries.test.js            # 管理員查詢測試
    ├── adminQueryConfigurations.js     # 管理員查詢配置
    └── README.md                       # 本文檔
```

## 使用方式

### 1. 收集所有索引

執行所有查詢測試並收集缺失的索引：

```bash
npm run collect:indexes
```

這會：
- 執行所有查詢測試（products, orders, members, admins）
- 自動收集缺失的索引錯誤
- 匯出至 `missing-indexes.json`

### 2. 執行特定 Collection 的測試

```bash
# 僅測試商品查詢
npm run test:queries:products

# 僅測試訂單查詢
npm run test:queries:orders

# 僅測試會員查詢
npm run test:queries:members

# 僅測試管理員查詢
npm run test:queries:admins
```

### 3. 更新索引配置

收集完索引後，更新 `firestore.indexes.json`：

```bash
npm run update:indexes
```

### 4. 完整工作流程

一鍵執行收集 + 更新：

```bash
npm run index:workflow
```

## 認證機制

### 公開 API（無需認證）
- **商品查詢**：`/api/products`

### 私有 API（需要管理員認證）
- **訂單查詢**：`/api/admin/orders`
- **會員查詢**：`/api/admin/members`
- **管理員查詢**：`/api/admin/admins`

測試會自動透過 `/api/auth/admin/signInWithPassword` 取得管理員 Token。

預設測試帳號（可透過環境變數設定）：
- Email: `admin@example.com`
- Password: `qwer1234`

環境變數設定：
```bash
TEST_ADMIN_EMAIL=your-admin@example.com
TEST_ADMIN_PASSWORD=your-password
```

## 查詢配置檔案

每個 Collection 都有獨立的查詢配置檔案（Single Source of Truth）：

### productQueryConfigurations.js
定義商品的查詢組合，包含：
- 分類篩選
- 價格範圍篩選
- 排序選項

### orderQueryConfigurations.js
定義訂單的查詢組合，包含：
- 會員 ID 篩選
- 狀態篩選
- 日期範圍篩選
- 金額範圍篩選
- 複合條件篩選

### memberQueryConfigurations.js
定義會員的查詢組合，包含：
- 日期範圍篩選
- 狀態篩選（isActive）
- 包含已刪除（includeDeleted）

### adminQueryConfigurations.js
定義管理員的查詢組合，包含：
- 狀態篩選（isActive）
- 包含已刪除（includeDeleted）

## 輸出格式

測試完成後會生成 `missing-indexes.json`：

```json
{
  "generatedAt": "2025-12-03T10:30:00.000Z",
  "summary": {
    "totalCollections": 4,
    "totalQueries": 50,
    "totalFailed": 10,
    "totalIndexesNeeded": 10,
    "byCollection": {
      "products": { "queries": 8, "indexesNeeded": 2 },
      "orders": { "queries": 36, "indexesNeeded": 5 },
      "members": { "queries": 10, "indexesNeeded": 2 },
      "admins": { "queries": 5, "indexesNeeded": 1 }
    }
  },
  "collections": {
    "products": {
      "summary": { ... },
      "missingIndexes": [ ... ]
    },
    "orders": {
      "summary": { ... },
      "missingIndexes": [ ... ]
    },
    ...
  }
}
```

## 新增查詢組合

如需新增查詢組合：

1. 編輯對應的配置檔案（例如 `productQueryConfigurations.js`）
2. 在 `validQueryCombinations` 陣列中新增：

```javascript
{
  name: "查詢名稱",
  params: { category: "electronics", minPrice: 100 },
  description: "查詢描述"
}
```

3. 執行測試：

```bash
npm run test:queries:products
```

4. 查看 `missing-indexes.json` 確認是否需要新增索引

## 優點

相比舊的 `scripts/collect*.js` 系列：

1. **程式碼重複利用**：測試和索引收集共用同一套查詢邏輯
2. **更精簡**：使用 Jest + Supertest，程式碼更簡潔
3. **統一管理**：查詢配置集中在配置檔案中
4. **自動化**：測試結束自動匯出索引資訊
5. **認證支援**：整合 Token 管理，支援需要認證的 API

## 注意事項

1. 執行測試前請確保：
   - Firebase 服務帳號已正確設定
   - 測試管理員帳號已建立
   - Firestore 有測試資料（執行 `npm run seed`）

2. 索引錯誤不會導致測試失敗：
   - 索引錯誤會被收集但測試仍通過
   - 非索引錯誤才會導致測試失敗

3. Token 會自動快取：
   - 第一次測試時取得 Token
   - 後續測試重複使用
   - 減少登入次數

## 疑難排解

### 無法取得 Token
檢查：
- 管理員帳號是否存在
- Email/Password 是否正確
- Firebase Auth 是否啟用

### 測試失敗（非索引錯誤）
檢查：
- API 端點是否正確
- Controller 邏輯是否有誤
- Firestore 資料是否存在

### 索引未被收集
檢查：
- `globalSetup.js` 和 `globalTeardown.js` 是否正確設定在 `jest.config.js`
- 測試是否使用 `handleQueryTestResult` 函數
- 錯誤訊息是否包含 "index" 關鍵字
