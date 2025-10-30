# 使用官方 Node.js 18 LTS 映像作為基礎
FROM node:18-alpine

# 設定工作目錄
WORKDIR /app

# 複製 package.json 和 package-lock.json
COPY package*.json ./

# 安裝生產環境依賴
# 使用 --only=production 只安裝 dependencies，不安裝 devDependencies
RUN npm ci --only=production

# 複製應用程式原始碼
COPY . .

# 建立非 root 用戶來運行應用程式（安全性考量）
RUN addgroup -g 1001 -S nodejs && \
    adduser -S nodejs -u 1001

# 更改檔案擁有者
RUN chown -R nodejs:nodejs /app

# 切換到非 root 用戶
USER nodejs

# 暴露應用程式埠號（Cloud Run 預設使用環境變數 PORT）
EXPOSE 8080

# 設定環境變數
ENV NODE_ENV=production

# 健康檢查
# 每 30 秒檢查一次，超時 10 秒，啟動後 40 秒才開始檢查，失敗 3 次判定為不健康
HEALTHCHECK --interval=30s --timeout=10s --start-period=40s --retries=3 \
  CMD node -e "require('http').get('http://localhost:' + (process.env.PORT || 8080) + '/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})"

# 啟動應用程式
CMD ["node", "index.js"]
