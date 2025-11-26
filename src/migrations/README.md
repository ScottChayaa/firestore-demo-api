# 資料遷移系統 (Migrations)

Firestore 資料遷移系統，用於管理資料庫結構變更和資料轉換。

## 📋 目錄結構

```
src/migrations/
├── helpers/
│   └── migrationHelper.js           # 共用工具函數庫
├── index.js                         # 遷移執行器（主程式）
├── 001_add_soft_delete_fields.js    # 遷移腳本範例
└── README.md                        # 本文檔
```

## 🚀 使用方式

### 執行所有未執行的遷移

```bash
npm run migrate
```

或

```bash
node src/migrations/index.js
```

### 模擬執行（Dry-run 模式）

在實際執行前，建議先使用 dry-run 模式預覽變更：

```bash
npm run migrate:dry
```

或

```bash
node src/migrations/index.js --dry-run
```

### 執行特定遷移

```bash
node src/migrations/index.js --only 001
```

## 📝 現有遷移清單

| 編號 | 名稱 | 說明 |
|------|------|------|
| 001 | add_soft_delete_fields | 為 members 和 admins 補上軟刪除欄位 |

## 🛠️ 建立新的遷移腳本

### 1. 命名規範

遷移腳本檔名格式：`NNN_description.js`

- `NNN`：三位數編號（例如：001, 002, 003）
- `description`：簡短的英文描述（使用底線分隔）
- 範例：`002_add_user_roles.js`

### 2. 腳本模板

#### 基本模板（使用 Helper）

```javascript
/**
 * 遷移 #NNN: 描述
 *
 * 目的：說明這個遷移的目的和背景
 */

const { processCollection, printMigrationSummary } = require('./helpers/migrationHelper');

module.exports = {
  id: 'NNN',
  name: 'migration_name',
  description: '遷移說明',

  /**
   * 執行遷移
   */
  async up(db, FieldValue, isDryRun = false) {
    console.log('\\n🔄 開始遷移...\\n');

    // 定義過濾邏輯：決定哪些文檔需要更新
    const filterFn = (doc, data) => {
      // 例如：檢查是否缺少某個欄位
      return data.someField === undefined;
    };

    // 定義轉換邏輯：決定如何更新文檔
    const transformFn = (doc, data) => {
      const updateData = {};

      // 例如：新增預設值
      if (data.someField === undefined) {
        updateData.someField = 'default_value';
      }

      return updateData;
    };

    // 處理 collection
    const stats = await processCollection(
      db,
      'collection_name',
      filterFn,
      transformFn,
      isDryRun
    );

    return stats;
  },

  /**
   * 回滾遷移（可選）
   */
  async down(db, FieldValue, isDryRun = false) {
    console.log('\\n⚠️  回滾功能未實作');
    return { message: '回滾功能未實作' };
  },
};
```

#### 進階模板（處理多個 Collections）

```javascript
const { processCollection, printMigrationSummary } = require('./helpers/migrationHelper');

module.exports = {
  id: 'NNN',
  name: 'migration_name',
  description: '遷移說明',

  async up(db, FieldValue, isDryRun = false) {
    console.log('\\n🔄 開始遷移...\\n');

    const stats = {
      collection1: { total: 0, updated: 0, skipped: 0 },
      collection2: { total: 0, updated: 0, skipped: 0 },
    };

    const filterFn = (doc, data) => data.someField === undefined;
    const transformFn = (doc, data) => ({ someField: 'value' });

    // 處理多個 collections
    stats.collection1 = await processCollection(db, 'collection1', filterFn, transformFn, isDryRun);
    console.log(''); // 空行分隔
    stats.collection2 = await processCollection(db, 'collection2', filterFn, transformFn, isDryRun);

    // 顯示總結
    printMigrationSummary(stats);

    return stats;
  },
};
```

### 3. 建立步驟

1. **建立檔案**
   ```bash
   touch src/migrations/002_your_migration_name.js
   ```

2. **編寫遷移邏輯**
   - 使用 `processCollection()` helper 處理批次更新
   - 定義 `filterFn` - 過濾需要更新的文檔
   - 定義 `transformFn` - 轉換文檔資料
   - 實作 `down()` 函數（可選，用於回滾）

3. **本地測試**
   ```bash
   # 先用 dry-run 模式測試
   node src/migrations/index.js --only 002 --dry-run

   # 確認無誤後實際執行
   node src/migrations/index.js --only 002
   ```

4. **提交變更**
   ```bash
   git add src/migrations/002_your_migration_name.js
   git commit -m "feat: 新增遷移腳本 - your migration name"
   ```

## 🧰 Helper API 說明

### `processCollection()`

批次處理 Collection 的通用框架，封裝了掃描、過濾、批次更新、進度追蹤等功能。

**參數**：

```javascript
async function processCollection(
  db,              // Firestore 實例
  collectionName,  // Collection 名稱（string）
  filterFn,        // 過濾函數 (doc, data) => boolean
  transformFn,     // 轉換函數 (doc, data) => updateData
  isDryRun,        // 是否為 Dry-run 模式（boolean）
  options          // 額外選項（object）
)
```

**選項**：

- `batchSize`: 每批次處理的文檔數量（預設 500）
- `showProgress`: 是否顯示進度（預設 true）

**回傳值**：

```javascript
{
  total: 100,     // 總文檔數
  updated: 80,    // 更新的文檔數
  skipped: 20     // 跳過的文檔數
}
```

**使用範例**：

```javascript
const filterFn = (doc, data) => data.isActive === undefined;
const transformFn = (doc, data) => ({ isActive: true });

const stats = await processCollection(
  db,
  'members',
  filterFn,
  transformFn,
  isDryRun,
  { batchSize: 500, showProgress: true }
);
```

---

### `printMigrationSummary()`

顯示遷移統計總結，支援多個 collection 的統計資訊。

**參數**：

```javascript
function printMigrationSummary(statsMap)
```

**使用範例**：

```javascript
const stats = {
  members: { total: 100, updated: 80, skipped: 20 },
  admins: { total: 10, updated: 10, skipped: 0 },
};

printMigrationSummary(stats);
```

**輸出格式**：

```
────────────────────────────────────────────────────────────
📊 遷移統計
────────────────────────────────────────────────────────────
members   : 80/100 更新 (跳過 20)
admins    : 10/10 更新 (跳過 0)
────────────────────────────────────────────────────────────
```

---

### `BATCH_SIZE`

預設批次大小常數（500），符合 Firestore 最佳實踐。

```javascript
const { BATCH_SIZE } = require('./helpers/migrationHelper');
console.log(BATCH_SIZE); // 500
```

---

## 💡 最佳實踐

### 1. 冪等性 (Idempotency)

遷移腳本應該設計為可重複執行而不會造成問題：

```javascript
// ✅ 好的做法：檢查欄位是否存在
if (data.newField === undefined) {
  updateData.newField = defaultValue;
}

// ❌ 不好的做法：直接覆蓋
updateData.newField = defaultValue;
```

### 2. 使用 Helper 簡化程式碼

使用 `processCollection()` helper 自動處理批次更新、進度追蹤等基礎邏輯：

```javascript
// ✅ 好的做法：使用 helper，專注於業務邏輯
const filterFn = (doc, data) => data.newField === undefined;
const transformFn = (doc, data) => ({ newField: 'value' });

await processCollection(db, 'collection', filterFn, transformFn, isDryRun);

// ❌ 不好的做法：手動處理批次邏輯（除非有特殊需求）
const BATCH_SIZE = 500;
for (let i = 0; i < docs.length; i += BATCH_SIZE) {
  const batch = db.batch();
  // ... 手動處理批次更新
}
```

### 3. 清晰的業務邏輯

將過濾邏輯和轉換邏輯分開定義，提高可讀性：

```javascript
// ✅ 好的做法：邏輯清晰分離
const filterFn = (doc, data) => {
  return data.field1 === undefined || data.field2 === undefined;
};

const transformFn = (doc, data) => {
  const updateData = {};
  if (data.field1 === undefined) updateData.field1 = 'default1';
  if (data.field2 === undefined) updateData.field2 = 'default2';
  return updateData;
};

// ❌ 不好的做法：邏輯混雜
snapshot.docs.forEach(doc => {
  const data = doc.data();
  if (/* 複雜的條件判斷 */) {
    // 更新邏輯
  }
});
```

### 4. Dry-run 測試

**務必**在實際執行前使用 dry-run 模式測試：

```bash
# 先測試
npm run migrate:dry

# 確認無誤後再執行
npm run migrate
```

## 🔍 遷移記錄

所有已執行的遷移都會記錄在 Firestore 的 `_migrations` collection 中：

```javascript
{
  id: "001",
  name: "add_soft_delete_fields",
  description: "為 members 和 admins 補上軟刪除欄位",
  executedAt: Timestamp,
  executedBy: "system",
  status: "completed",  // completed | failed
  stats: {
    members: { total: 100, updated: 100, skipped: 0 },
    admins: { total: 1, updated: 1, skipped: 0 },
    executionTime: "5.2s"
  }
}
```

## ⚠️ 注意事項

1. **備份資料**
   - 執行遷移前建議先備份 Firestore 資料
   - 特別是在生產環境執行時

2. **測試環境先行**
   - 新的遷移腳本應先在開發/測試環境執行
   - 確認無誤後再部署到生產環境

3. **不可逆操作**
   - 某些遷移可能無法回滾（例如刪除欄位）
   - 應在遷移說明中標註清楚

4. **效能考量**
   - 大量資料遷移可能耗時較長
   - 考慮在離峰時段執行
   - 使用批次處理避免超時

5. **版本控制**
   - 遷移腳本應納入版本控制
   - 不應修改已執行的遷移腳本
   - 如需修正，應建立新的遷移腳本

## 🔗 相關文檔

- [Firestore Batch Writes](https://firebase.google.com/docs/firestore/manage-data/transactions#batched-writes)
- [Firestore Best Practices](https://firebase.google.com/docs/firestore/best-practices)
