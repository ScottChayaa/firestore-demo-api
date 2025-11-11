# 快速部屬

**GCP Authorize**
```sh
gcloud config configurations create my-liang-dev
gcloud config configurations list
gcloud config configurations activate my-liang-dev        # 切換設定
gcloud config set project liang-dev                       # 設定專案ID

gcloud config list                                        # 顯示目前設定

gcloud auth login
gcloud auth configure-docker asia-east1-docker.pkg.dev
```

```bash

# 登入並設定專案
gcloud auth login
gcloud config set project liang-dev


# 建立映像
docker build -t asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1 .

# 推送映像到 Container Registry
docker push asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1

# 部署到 Cloud Run（包含完整環境變數）
gcloud run deploy firestore-demo-api \
  --image asia-east1-docker.pkg.dev/liang-dev/my-docker/firestore-demo-api:0.1 \
  --platform managed \
  --region asia-east1 \
  --allow-unauthenticated \
  --env-vars-file env.liang-dev.yaml \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 300

```


```bash

# 查看服務的所有 revisions
gcloud run revisions list \
  --service firestore-demo-api \
  --region asia-east1

# 查看當前生產版本（正在服務的版本）
gcloud run services describe firestore-demo-api \
  --region asia-east1 \
  --format="value(status.latestReadyRevisionName)"

# 查看特定 revision 的詳細資訊
gcloud run revisions describe firestore-demo-api-00008-8t6 --region asia-east1

```