# Firestore `.get()` vs `.data()` 說明

## 快速理解

```javascript
const doc = await db.collection('users').doc('user123').get();  // DocumentSnapshot
const data = doc.data();                                         // Object
```

- **`.get()`** → 取得完整快照（含 ID、元資料）📦
- **`.data()`** → 只取得資料內容（不含 ID）📄

---

## 對照表

| 特性 | `.get()` | `.data()` |
|-----|---------|----------|
| **回傳類型** | `DocumentSnapshot` | `Object` 或 `undefined` |
| **包含 ID** | ✅ 是（透過 `.id`） | ❌ 否 |
| **包含資料** | ✅ 是（透過 `.data()`） | ✅ 是（直接） |
| **包含元資料** | ✅ 是（createTime, updateTime） | ❌ 否 |
| **可檢查存在** | ✅ 是（`.exists`） | ❌ 否 |
| **非同步** | ✅ 是（需要 await） | ❌ 否（同步方法） |

---

## 基本用法

### 正確範例

```javascript
// 1. 取得文檔快照
const doc = await db.collection('users').doc('user123').get();

// 2. 檢查是否存在
if (!doc.exists) {
  throw new Error('用戶不存在');
}

// 3. 組合 ID 和資料
const user = {
  id: doc.id,           // 從 DocumentSnapshot 取得
  ...doc.data()         // 從 DocumentSnapshot 取得資料
};

console.log(user);
// { id: 'user123', name: 'John', email: 'john@example.com' }
```

---

## 常見錯誤

### ❌ 錯誤 1：忘記檢查 `.exists`

```javascript
const doc = await db.collection('users').doc('nonexistent').get();
const data = doc.data();  // undefined（如果不存在）
console.log(data.name);   // TypeError: Cannot read property 'name' of undefined
```

**解決方式**：
```javascript
if (!doc.exists) {
  throw new Error('用戶不存在');
}
const data = doc.data();  // 安全
```

---

### ❌ 錯誤 2：遺失文檔 ID

```javascript
const doc = await db.collection('users').doc('user123').get();
const user = doc.data();  // { name: 'John', email: 'john@example.com' }
console.log(user.id);     // undefined（沒有 ID！）
```

**解決方式**：
```javascript
const user = {
  id: doc.id,      // 明確加入 ID
  ...doc.data()
};
```

---

### ❌ 錯誤 3：直接回傳 DocumentSnapshot

```javascript
// API 回傳包含內部屬性的物件
res.json({ user: doc });  // ❌ 包含 _firestore, _ref 等內部屬性
```

**解決方式**：
```javascript
// 回傳純 JSON
res.json({
  user: {
    id: doc.id,
    ...doc.data()
  }
});
```

---

## 記憶口訣

- **`.get()`** = 取得「包裝盒」📦
  完整資訊：ID、資料、元資料、方法

- **`.data()`** = 取得「內容物」📄
  只有資料欄位，不含 ID

---

## 實際應用

### 在 Controller 中的標準寫法

```javascript
const getUser = async (req, res) => {
  const { id } = req.params;

  // Step 1: 使用 .get() 取得 DocumentSnapshot
  const doc = await db.collection('users').doc(id).get();

  // Step 2: 檢查是否存在
  if (!doc.exists) {
    throw new NotFoundError(`找不到用戶 ID: ${id}`);
  }

  // Step 3: 組合 ID 和資料
  const user = {
    id: doc.id,
    ...doc.data()
  };

  res.json({ data: user });
};
```

---

## 相關工具函式

本專案的 `mapDocumentToJSON()` 函式（位於 `src/utils/firestore.js`）封裝了上述邏輯：

```javascript
function mapDocumentToJSON(doc) {
  const data = doc.data();

  // 轉換 Timestamp 為 ISO 字串
  for (const key in data) {
    if (data[key] && typeof data[key].toDate === "function") {
      data[key] = data[key].toDate().toISOString();
    }
  }

  return {
    id: doc.id,
    ...data
  };
}
```

**使用方式**：
```javascript
const doc = await db.collection('users').doc(id).get();
const user = mapDocumentToJSON(doc);  // 自動處理 ID 和 Timestamp
```
