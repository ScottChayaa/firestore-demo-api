# Firebase 專案設定指南

本文檔說明如何從零開始建立和設定 Firebase 專案。

---

## 📋 目錄

- [建立 Firebase 專案](#建立-firebase-專案)
- [啟用 Firestore Database](#啟用-firestore-database)
- [設定 Firestore 安全規則](#設定-firestore-安全規則)
- [部署 Firestore 索引](#部署-firestore-索引)
- [安裝 Firebase CLI](#安裝-firebase-cli)

---

## 🚀 建立 Firebase 專案

### 步驟 1：前往 Firebase Console

開啟瀏覽器並前往：
```
https://console.firebase.google.com/
```

### 步驟 2：登入 Google 帳號

使用您的 Google 帳號登入。

### 步驟 3：建立新專案

1. 點擊 **「Add project」**（新增專案）
2. 輸入專案名稱，例如：`firestore-demo-api`
3. （可選）修改 Project ID，或使用自動生成的 ID
4. 點擊 **「Continue」**

### 步驟 4：Google Analytics 設定

1. 選擇是否啟用 Google Analytics
   - 建議開發測試用專案：**關閉**
   - 生產環境專案：**開啟**
2. 點擊 **「Create project」**

### 步驟 5：等待專案建立

專案建立通常需要 30 秒到 1 分鐘。

---

## 🗄️ 啟用 Firestore Database

### 步驟 1：進入 Firestore

1. 在 Firebase Console 左側選單中
2. 點擊 **「Firestore Database」**

### 步驟 2：建立資料庫

1. 點擊 **「Create database」** 按鈕
2. 選擇啟動模式：
   - **Test mode**：開發測試用（30 天後需更新規則）
   - **Production mode**：生產環境（推薦）
3. 點擊 **「Next」**

### 步驟 3：選擇資料庫位置

1. 選擇資料中心位置：
   - 亞洲推薦：`asia-east1`（台灣）或 `asia-northeast1`（日本）
   - 美國推薦：`us-central1`
   - 歐洲推薦：`europe-west1`

   ⚠️ **注意**：位置一旦選定無法更改！

2. 點擊 **「Enable」**

### 步驟 4：等待資料庫建立

Firestore Database 建立完成後，您將看到空白的資料庫介面。

---

## 🔒 設定 Firestore 安全規則

### 方式一：透過 Firebase Console（適合測試）

1. 在 Firestore Database 頁面
2. 點擊上方的 **「Rules」** 標籤
3. 貼上以下規則：

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // 公開讀取商品（任何人都可以瀏覽商品）
    match /products/{productId} {
      allow read: if true;
      allow write: if request.auth != null;
    }

    // 會員資料需要身份驗證
    match /members/{memberId} {
      allow read, write: if request.auth != null;
    }

    // 訂單資料需要身份驗證
    match /orders/{orderId} {
      allow read, write: if request.auth != null;
    }

    // 預設規則：拒絕所有其他存取
    match /{document=**} {
      allow read, write: if false;
    }
  }
}
```

4. 點擊 **「Publish」** 發布規則

### 方式二：透過 Firebase CLI（推薦用於生產環境）

本專案已包含 `firestore.rules` 檔案：

```bash
# 部署安全規則
firebase deploy --only firestore:rules
```

---

## 🔍 部署 Firestore 索引

Firestore 複合索引可大幅提升查詢效能。

### 自動部署索引

本專案已包含 `firestore.indexes.json` 檔案，包含以下索引：

**訂單查詢優化：**
- `memberId + status + createdAt`
- `status + createdAt`
- `memberId + createdAt`
- `createdAt + totalAmount`

**商品查詢優化：**
- `category + price`
- `category + createdAt`

### 部署步驟

```bash
# 1. 登入 Firebase
firebase login

# 2. 初始化專案（如果尚未初始化）
firebase init firestore

# 選擇：
# - Firestore Rules: firestore.rules
# - Firestore Indexes: firestore.indexes.json

# 3. 部署索引
firebase deploy --only firestore:indexes
```

### 手動建立索引

如果收到錯誤訊息：
```
The query requires an index. You can create it here: https://console.firebase.google.com/...
```

直接點擊連結即可自動建立索引。

---

## 🛠️ 安裝 Firebase CLI

### macOS / Linux

```bash
# 使用 npm 安裝
npm install -g firebase-tools

# 驗證安裝
firebase --version

# 登入 Firebase
firebase login
```

瀏覽器將開啟 Google 登入頁面，完成授權後即可使用 CLI。

---

## ✅ 驗證設定

### 檢查專案設定

```bash
# 列出所有專案
firebase projects:list

# 選擇專案
firebase use your-project-id
```

### 測試 Firestore 連線

在 Firebase Console 的 Firestore Database 頁面：
1. 手動建立一個測試文檔
2. 嘗試讀取和刪除
3. 確認規則是否正常運作

---

## 🔗 相關文檔

- [Service Account 設定](./service-account.md)
- [環境變數設定](./environment-variables.md)

---

## 📚 官方文檔

- [Firebase 官方文檔](https://firebase.google.com/docs)
- [Firestore 快速入門](https://firebase.google.com/docs/firestore/quickstart)
- [Firestore 安全規則](https://firebase.google.com/docs/firestore/security/get-started)
- [Firebase CLI 參考](https://firebase.google.com/docs/cli)
