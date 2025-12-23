# Cloud Run 自動化部署腳本

自動化部署到 Google Cloud Run 的腳本。

## 前置需求

1. **安裝工具**
   - gcloud CLI
   - Docker

2. **登入驗證**
   ```bash
   gcloud auth login
   ```

3. **環境準備**
   - 確保 `env.liang-dev.yaml` 存在
   - 確保 `Dockerfile` 存在
   - Git 工作目錄必須乾淨（無未提交的更改）

## 使用方式

```bash
# 進入專案根目錄
cd /path/to/firestore-demo-api

# 執行部署腳本
./deploy/deploy.sh
```

## 部署流程

腳本會依序執行以下步驟：

1. **前置檢查**：驗證 gcloud CLI、Docker、登入狀態、專案設定
2. **輸入版本號**：輸入版本號（例如 v1.0.0）
3. **建立 Docker 映像**：執行 `docker build`
4. **建立 Git tag**：在當前 commit 建立版本標籤
5. **配置 Docker 認證**：設定 Container Registry 認證
6. **推送 Docker 映像**：執行 `docker push`
7. **部署到 Cloud Run**：執行 `gcloud run deploy`
8. **顯示部署資訊**：顯示服務 URL 和版本資訊

## 版本號格式

建議使用語義化版本號：
- `v1.0.0`（推薦）
- `1.0.0`
- `v1.0.0-beta.1`

## 常見問題

### Q: 如果 Git 工作目錄不乾淨怎麼辦？

腳本會拒絕部署並提示：

```bash
✗ 錯誤：Git 工作目錄不乾淨
有未提交的更改：
 M src/app.js
請先提交或暫存更改後再部署
```

解決方式：
```bash
# 提交更改
git add .
git commit -m "feat: your changes"

# 或暫存更改
git stash

# 然後重新執行部署
```

### Q: 如果版本 tag 已存在怎麼辦？

腳本會拒絕部署並提示：

```bash
✗ 錯誤：Git tag 'v1.0.0' 已存在
```

解決方式：
- 使用新的版本號
- 或刪除舊的 tag：`git tag -d v1.0.0`

### Q: 如何查看部署狀態？

```bash
# 查看服務資訊
gcloud run services describe firestore-demo-api --region=asia-east1

# 查看所有版本
gcloud run revisions list \
  --service firestore-demo-api \
  --region asia-east1
```

### Q: 如何回滾到上一個版本？

```bash
# 查看所有 revisions
gcloud run revisions list \
  --service firestore-demo-api \
  --region asia-east1

# 切換到指定 revision
gcloud run services update-traffic firestore-demo-api \
  --region asia-east1 \
  --to-revisions=firestore-demo-api-00001-abc=100
```

## 手動部署 Firestore（可選）

腳本不包含 Firestore Rules 和 Indexes 的部署，需手動執行：

```bash
# 登入 Firebase CLI
firebase login
firebase use liang-dev

# 部署 Rules 和 Indexes
firebase deploy --only firestore:rules,firestore:indexes --project liang-dev
```

## 環境變數

部署使用 `env.liang-dev.yaml` 作為環境變數配置。

如需修改環境變數：
1. 編輯 `env.liang-dev.yaml`
2. 重新執行部署腳本

## 專案資訊

- **專案 ID**：liang-dev
- **區域**：asia-east1
- **服務名稱**：firestore-demo-api
- **容器倉庫**：asia-east1-docker.pkg.dev/liang-dev/my-docker

## 腳本特性

### 完整的前置檢查
- ✅ gcloud CLI 安裝檢查
- ✅ Docker 安裝檢查
- ✅ gcloud 登入狀態檢查
- ✅ 專案設定檢查（自動切換到 liang-dev）
- ✅ 必要檔案存在性檢查（Dockerfile, env.liang-dev.yaml）
- ✅ Git 工作目錄乾淨狀態檢查（強制）

### 版本管理
- ✅ 顯示最近的版本標籤供參考
- ✅ 驗證版本號格式
- ✅ 檢查 Git tag 是否已存在（避免覆蓋）
- ✅ 在 Docker build 成功後建立 Git tag
- ✅ 可選推送 tag 到遠端

### 錯誤處理
- ✅ 使用 `set -e` 自動在錯誤時退出
- ✅ 每個步驟都有明確的成功/失敗提示
- ✅ 清晰的錯誤信息和解決建議

### 使用者體驗
- ✅ 彩色輸出（綠色/紅色/黃色/藍色）
- ✅ 清晰的步驟編號（[1/8], [2/8], ...）
- ✅ 部署摘要（版本、映像、URL）
- ✅ 可選的健康檢查

## 部署流程圖

```
開始
  ↓
[1/8] 前置檢查
  ├─ gcloud CLI 已安裝？
  ├─ Docker 已安裝？
  ├─ gcloud 已登入？
  ├─ 專案設定正確？
  ├─ Dockerfile 存在？
  ├─ env.liang-dev.yaml 存在？
  └─ Git 工作目錄乾淨？
  ↓
[2/8] 輸入版本號
  ├─ 顯示最近的 tags
  ├─ 驗證版本號格式
  └─ 檢查 tag 是否已存在
  ↓
[3/8] 建立 Docker 映像
  └─ docker build -t ...
  ↓
[4/8] 建立 Git tag
  ├─ git tag -a ...
  └─ 詢問是否推送到遠端
  ↓
[5/8] 配置 Docker 認證
  └─ gcloud auth configure-docker
  ↓
[6/8] 推送 Docker 映像
  └─ docker push ...
  ↓
[7/8] 部署到 Cloud Run
  └─ gcloud run deploy ...
  ↓
[8/8] 顯示部署資訊
  ├─ 版本號
  ├─ 映像名稱
  ├─ 服務 URL
  └─ 可選：健康檢查
  ↓
完成
```

## 故障排除

### 部署失敗：Image not found

如果部署時出現 "Image not found" 錯誤，可能是因為：
- Docker 映像推送失敗
- 映像名稱不正確
- Container Registry 權限問題

解決方式：
```bash
# 檢查映像是否存在
gcloud artifacts docker images list \
  asia-east1-docker.pkg.dev/liang-dev/my-docker

# 手動推送映像
docker push asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:版本號
```

### 部署失敗：Permission denied

如果部署時出現權限錯誤，可能是因為：
- 帳號沒有 Cloud Run Admin 權限
- 帳號沒有 Artifact Registry Writer 權限

解決方式：
```bash
# 檢查當前登入的帳號
gcloud auth list

# 確認帳號有足夠的權限
gcloud projects get-iam-policy liang-dev --flatten="bindings[].members" --filter="bindings.members:user:你的帳號"
```

### 健康檢查失敗

如果健康檢查失敗，可能是因為：
- 應用程式啟動失敗
- `/health` 端點未正確實作
- 環境變數設定錯誤

解決方式：
```bash
# 查看 Cloud Run 日誌
gcloud run services logs read firestore-demo-api --region=asia-east1

# 手動測試健康端點
curl https://你的服務URL/health
```

## 相關文件

- [快速部署指南](../docs/fast-deploy.md)
- [完整部署文檔](../docs/cloud-run-deployment.md)
- [專案開發指南](../CLAUDE.md)
