# Cloud Run 部署指南

本文檔提供完整的 Google Cloud Run 部署流程和管理指南。

---

## 📋 目錄

- [前置準備](#前置準備)
- [快速部署](#快速部署)
- [詳細步驟](#詳細步驟)
- [環境變數設定](#環境變數設定)
- [自訂網域設定](#自訂網域設定)
- [監控與日誌](#監控與日誌)
- [更新與回滾](#更新與回滾)
- [費用估算](#費用估算)
- [故障排除](#故障排除)

---

## ✅ 前置準備

### 1. Google Cloud 帳號

- 擁有 Google Cloud 帳號
- 已啟用計費（需要信用卡）
- 新用戶可獲得 $300 美元免費額度

### 2. 安裝 Google Cloud SDK

#### Linux

```bash
# 下載並安裝
curl https://sdk.cloud.google.com | bash

# 重新載入 shell
exec -l $SHELL

# 驗證安裝
gcloud --version
```

### 3. 安裝 Docker

請參考 [Docker 官方文檔](https://docs.docker.com/get-docker/)

---

## 🚀 快速部署

```bash
# 1. 登入 GCP
gcloud auth login

# 2. 設定專案
gcloud config set project YOUR_PROJECT_ID

# 3. 啟用所需服務
gcloud services enable run.googleapis.com containerregistry.googleapis.com

# 4. 建立 Docker 映像
docker build -t gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 .

# 5. 認證 Docker
gcloud auth configure-docker

# 6. 推送映像
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1

# 7. 部署到 Cloud Run
gcloud run deploy firestore-demo-api \
  --image gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated

# 8. 設定環境變數（Base64 編碼）
base64 firebase-service-account.json | tr -d '\n' > encoded.txt
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --set-env-vars "FIREBASE_PROJECT_ID=YOUR_PROJECT_ID" \
  --region asia-east1
```

---

## 📖 詳細步驟

### 步驟 1：登入並設定 GCP

#### 1.1 登入 Google Cloud

```bash
gcloud auth login
```

瀏覽器會開啟，完成 Google 帳號登入和授權。

#### 1.2 列出專案

```bash
gcloud projects list
```

**輸出範例：**
```
PROJECT_ID              NAME                    PROJECT_NUMBER
firestore-demo-12345    Firestore Demo          123456789012
```

#### 1.3 設定預設專案

```bash
gcloud config set project YOUR_PROJECT_ID
```

**驗證：**
```bash
gcloud config get-value project
```

---

### 步驟 2：啟用所需的 GCP 服務

```bash
# 啟用 Cloud Run
gcloud services enable run.googleapis.com

# 啟用 Container Registry
gcloud services enable containerregistry.googleapis.com

# 啟用 Cloud Build（可選，用於自動建構）
gcloud services enable cloudbuild.googleapis.com
```

**驗證：**
```bash
gcloud services list --enabled
```

---

### 步驟 3：建立 Docker 映像

#### 3.1 確認 Dockerfile 存在

```bash
cat Dockerfile
```

專案已包含優化的 Dockerfile：
- 使用 Node.js 18 Alpine（輕量）
- 多階段建構
- 非 root 用戶執行
- 健康檢查

#### 3.2 建立映像

```bash
docker build -t gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 .
```

**注意事項：**
- `YOUR_PROJECT_ID` 替換為您的 GCP 專案 ID
- `:v1` 是版本標籤，可自訂（如 `:v1.0.0`, `:latest`）


#### 3.3 驗證映像

```bash
# 列出映像
docker images | grep firestore-demo-api

# 本地測試（可選）
docker run -p 8080:8080 \
  -e FIREBASE_PROJECT_ID=YOUR_PROJECT_ID \
  -e GOOGLE_CREDENTIALS_BASE64=$(base64 firebase-service-account.json | tr -d '\n') \
  gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

測試：
```bash
curl http://localhost:8080/health
```

---

### 步驟 4：推送映像到 Container Registry

#### 4.1 認證 Docker

```bash
gcloud auth configure-docker
```

這會設定 Docker 使用 GCP 認證。

#### 4.2 推送映像

```bash
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

**預期輸出：**
```
The push refers to repository [gcr.io/YOUR_PROJECT_ID/firestore-demo-api]
v1: digest: sha256:abc123... size: 1234
```

#### 4.3 驗證推送成功

```bash
# 列出 Container Registry 中的映像
gcloud container images list

# 查看特定映像的標籤
gcloud container images list-tags gcr.io/YOUR_PROJECT_ID/firestore-demo-api
```

---

### 步驟 5：部署到 Cloud Run

#### 5.1 執行部署指令

```bash
gcloud run deploy firestore-demo-api \
  --image gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 60s
```

**參數說明：**
- `firestore-demo-api`：服務名稱
- `--image`：Docker 映像位置
- `--platform managed`：使用全託管 Cloud Run
- `--region asia-east1`：部署區域（台灣）
- `--allow-unauthenticated`：允許公開存取（因有公開 API）
- `--memory 512Mi`：記憶體配置
- `--max-instances 10`：最大實例數
- `--timeout 60s`：請求逾時時間

**可選參數：**
```bash
--min-instances 0              # 最小實例數（0 = 完全縮減到零）
--concurrency 80               # 每實例並發請求數
--cpu 1                        # CPU 配置
--port 8080                    # 容器埠號
```

#### 5.2 確認部署

部署完成後會顯示服務 URL：
```
Service [firestore-demo-api] revision [firestore-demo-api-00001-abc] has been deployed and is serving 100 percent of traffic.
Service URL: https://firestore-demo-api-xxxxx-xx.a.run.app
```

#### 5.3 測試部署

```bash
# 健康檢查
curl https://firestore-demo-api-xxxxx-xx.a.run.app/health

# 測試公開 API
curl https://firestore-demo-api-xxxxx-xx.a.run.app/api/public/products
```

---

## ⚙️ 環境變數設定

### 方法一：使用 gcloud CLI（推薦）

#### 準備 Service Account Base64

```bash
# 將 JSON 轉為 Base64（移除換行符）
base64 firebase-service-account.json | tr -d '\n' > encoded.txt

# 驗證長度（約 2000-3000 字元）
wc -c encoded.txt
```

#### 設定環境變數

```bash
gcloud run services update firestore-demo-api \
  --set-env-vars "GOOGLE_CREDENTIALS_BASE64=$(cat encoded.txt)" \
  --set-env-vars "FIREBASE_PROJECT_ID=YOUR_PROJECT_ID" \
  --set-env-vars "NODE_ENV=production" \
  --set-env-vars "CORS_ORIGIN=https://example.com" \
  --set-env-vars "DEFAULT_PAGE_LIMIT=20" \
  --set-env-vars "MAX_PAGE_LIMIT=100" \
  --region asia-east1
```

### 方法二：使用 YAML 檔案

建立 `service.yaml`：

```yaml
apiVersion: serving.knative.dev/v1
kind: Service
metadata:
  name: firestore-demo-api
spec:
  template:
    metadata:
      annotations:
        autoscaling.knative.dev/maxScale: '10'
        autoscaling.knative.dev/minScale: '0'
    spec:
      containers:
      - image: gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
        resources:
          limits:
            memory: 512Mi
            cpu: '1'
        env:
        - name: NODE_ENV
          value: production
        - name: FIREBASE_PROJECT_ID
          value: YOUR_PROJECT_ID
        - name: GOOGLE_CREDENTIALS_BASE64
          value: BASE64_ENCODED_STRING
        - name: CORS_ORIGIN
          value: https://example.com
        - name: DEFAULT_PAGE_LIMIT
          value: '20'
        - name: MAX_PAGE_LIMIT
          value: '100'
```

部署：
```bash
gcloud run services replace service.yaml --region asia-east1
```

---

## 🌐 自訂網域設定

### 步驟 1：驗證網域所有權

前往 [Google Search Console](https://search.google.com/search-console) 驗證網域。

### 步驟 2：對應網域到服務

```bash
gcloud run domain-mappings create \
  --service firestore-demo-api \
  --domain api.example.com \
  --region asia-east1
```

### 步驟 3：設定 DNS 記錄

根據指示在您的 DNS 提供商新增記錄：

**類型 A（IPv4）：**
```
api.example.com  A  216.239.32.21
                 A  216.239.34.21
                 A  216.239.36.21
                 A  216.239.38.21
```

**或 CNAME：**
```
api  CNAME  ghs.googlehosted.com.
```

### 步驟 4：等待 SSL 證書

Cloud Run 會自動申請 Let's Encrypt SSL 證書，通常需要 15 分鐘。

---

## 📊 監控與日誌

### 使用 Cloud Console

1. 前往 [Cloud Run Console](https://console.cloud.google.com/run)
2. 選擇服務
3. 點擊「日誌」標籤

### 效能監控

查看：
- 請求數量
- 回應時間（延遲）
- 錯誤率
- 實例數量
- 記憶體使用率

### 設定警示

```bash
# 錯誤率超過 5% 時發送警示
gcloud alpha monitoring policies create \
  --notification-channels=CHANNEL_ID \
  --display-name="High Error Rate" \
  --condition-display-name="Error rate > 5%" \
  --condition-threshold-value=0.05
```

---

## 🔄 更新與回滾

### 部署新版本

```bash
# 1. 建立新映像
docker build -t gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v2 .
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v2

# 2. 更新服務
gcloud run deploy firestore-demo-api \
  --image gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v2 \
  --region asia-east1
```

### 查看修訂版本

```bash
gcloud run revisions list \
  --service firestore-demo-api \
  --region asia-east1
```

### 回滾到舊版本

```bash
# 查看修訂版本名稱
gcloud run revisions list --service firestore-demo-api --region asia-east1

# 回滾到特定修訂版本
gcloud run services update-traffic firestore-demo-api \
  --to-revisions firestore-demo-api-00001-abc=100 \
  --region asia-east1
```

### 金絲雀部署（逐步推出）

```bash
# 新版本分配 20% 流量
gcloud run services update-traffic firestore-demo-api \
  --to-revisions firestore-demo-api-00002-xyz=20,firestore-demo-api-00001-abc=80 \
  --region asia-east1

# 逐步增加到 50%
gcloud run services update-traffic firestore-demo-api \
  --to-revisions firestore-demo-api-00002-xyz=50,firestore-demo-api-00001-abc=50 \
  --region asia-east1

# 全部切換到新版本
gcloud run services update-traffic firestore-demo-api \
  --to-latest \
  --region asia-east1
```

---

## 💰 費用估算

### Cloud Run 計費項目

| 項目 | 價格（亞洲） | 免費額度 |
|------|------------|---------|
| CPU | $0.00003456/vCPU-second | 180,000 vCPU-seconds/月 |
| 記憶體 | $0.00000384/GiB-second | 360,000 GiB-seconds/月 |
| 請求 | $0.40/百萬請求 | 200 萬請求/月 |

### 估算範例

**低流量（測試/開發）：**
- 每月 10,000 請求
- 平均回應時間：500ms
- 512Mi 記憶體，1 vCPU

**計算：**
```
請求費用 = (10,000 / 1,000,000) × $0.40 = $0.004
CPU 費用 = (10,000 × 0.5 × 1) × $0.00003456 = $0.17
記憶體費用 = (10,000 × 0.5 × 0.5) × $0.00000384 = $0.0096

總計 ≈ $0.18/月（可能完全免費）
```

**中流量（生產環境）：**
- 每月 100萬請求
- 平均回應時間：300ms

**估算：** 約 $10-20/月

### 費用優化建議

1. **設定最小實例為 0**：完全縮減到零
2. **優化記憶體配置**：根據實際需求調整（256Mi, 512Mi）
3. **減少冷啟動**：優化 Docker 映像大小
4. **使用 Firestore 快取**：減少資料庫讀取次數

---

## 🐛 故障排除

### 問題 1：部署失敗 - 無法拉取映像

**錯誤訊息：**
```
ERROR: (gcloud.run.deploy) Image 'gcr.io/...' not found.
```

**解決方式：**
```bash
# 驗證映像是否存在
gcloud container images list-tags gcr.io/YOUR_PROJECT_ID/firestore-demo-api

# 重新推送映像
docker push gcr.io/YOUR_PROJECT_ID/firestore-demo-api:v1
```

---

### 問題 2：記憶體不足

**錯誤訊息（日誌）：**
```
Memory limit exceeded
```

**解決方式：**
```bash
# 增加記憶體配置
gcloud run services update firestore-demo-api \
  --memory 1Gi \
  --region asia-east1
```

## 🔗 相關文檔

- [Firebase 專案設定](./firebase-setup.md)
- [Service Account 設定](./service-account.md)
- [環境變數設定](./environment-variables.md)

---

## 📚 官方文檔

- [Cloud Run 快速入門](https://cloud.google.com/run/docs/quickstarts)
- [Cloud Run 計費](https://cloud.google.com/run/pricing)
- [Container Registry](https://cloud.google.com/container-registry/docs)
- [自訂網域設定](https://cloud.google.com/run/docs/mapping-custom-domains)
