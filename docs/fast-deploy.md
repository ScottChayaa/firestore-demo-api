# 快速部屬


```bash

# 登入並設定專案
gcloud auth login
gcloud config set project liang-dev

# 查看目前所有配置
gcloud config configurations list

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
  --env-vars-file env.yaml \
  --memory 512Mi \
  --max-instances 10 \
  --timeout 300

```