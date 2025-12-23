# gcloud

gcloud install
```sh

# 安裝必要套件
sudo apt-get update
sudo apt-get install apt-transport-https ca-certificates gnupg curl

# 添加 Google Cloud 的 GPG 金鑰
curl https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg

# 添加 gcloud CLI 發行版 URI
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee -a /etc/apt/sources.list.d/google-cloud-sdk.list

# 更新並安裝 gcloud CLI：
sudo apt-get update
sudo apt-get install google-cloud-cli
```

gcloud verify
```sh

# 檢查版本
gcloud version

# 檢查已安裝的元件
gcloud components list

# 查看當前配置
gcloud config list

```

gcloud cli
```sh

# 初始化
gcloud init

# Authorize gcloud to access the Cloud Platform with Google user credentials.
gcloud auth login

# 確認目前登入的帳號
gcloud auth list

# 檢查專案
gcloud config get-value project

# 確認儲存庫存在
gcloud artifacts repositories list --location=asia-east1 --project=wd-dev-sp-project-gameserver

# 列出儲存庫中的所有映像
gcloud artifacts docker images list asia-east1-docker.pkg.dev/wd-dev-sp-project-gameserver/sre

# 查看特定映像的所有標籤
gcloud artifacts docker tags list asia-east1-docker.pkg.dev/wd-dev-sp-project-gameserver/sre/game-system-service
```