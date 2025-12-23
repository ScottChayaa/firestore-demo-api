const { TooManyRequestsError } = require("./errorHandler");
const logger = require("@/config/logger");

// 記憶體儲存（簡單實作，生產環境建議使用 Redis）
const requestStore = new Map();

/**
 * 頻率限制中介軟體
 * @param {number} maxRequests - 時間視窗內最大請求數
 * @param {number} windowMinutes - 時間視窗（分鐘）
 */
function rateLimiter(maxRequests = 10, windowMinutes = 2) {
  return (req, res, next) => {
    // 取得客戶端 IP
    const ip = req.ip || req.connection.remoteAddress;

    // 取得或建立該 IP 的記錄
    if (!requestStore.has(ip)) {
      requestStore.set(ip, {
        count: 0,
        firstRequestTime: Date.now(),
        requests: [],
      });
    }

    const record = requestStore.get(ip);
    const now = Date.now();
    const windowMs = windowMinutes * 60 * 1000;

    // 移除過期的請求記錄
    record.requests = record.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // 檢查是否超過限制
    if (record.requests.length >= maxRequests) {
      const oldestRequest = Math.min(...record.requests);
      const resetTime = new Date(oldestRequest + windowMs);

      logger.warn({
        ip: ip,
        requests: record.requests.length,
        limit: maxRequests,
      }, "頻率限制觸發");

      throw new TooManyRequestsError(
        `請求過於頻繁，請在 ${windowMinutes} 分鐘後再試。重置時間：${resetTime.toISOString()}`
      );
    }

    // 記錄本次請求
    record.requests.push(now);
    requestStore.set(ip, record);

    // 設定回應標頭（標準 Rate Limit 標頭）
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": maxRequests - record.requests.length,
      "X-RateLimit-Reset": new Date(now + windowMs).toISOString(),
    });

    next();
  };
}

module.exports = rateLimiter;
