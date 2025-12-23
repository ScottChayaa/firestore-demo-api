const { TooManyRequestsError } = require("./errorHandler");
const logger = require("@/config/logger");

// 内存存储（简单实现，生产环境建议使用 Redis）
const requestStore = new Map();

/**
 * 频率限制中间件
 * @param {number} maxRequests - 时间窗口内最大请求数
 * @param {number} windowMinutes - 时间窗口（分钟）
 */
function rateLimiter(maxRequests = 10, windowMinutes = 2) {
  return (req, res, next) => {
    // 获取客户端 IP
    const ip = req.ip || req.connection.remoteAddress;

    // 获取或创建该 IP 的记录
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

    // 移除过期的请求记录
    record.requests = record.requests.filter(
      (timestamp) => now - timestamp < windowMs
    );

    // 检查是否超过限制
    if (record.requests.length >= maxRequests) {
      const oldestRequest = Math.min(...record.requests);
      const resetTime = new Date(oldestRequest + windowMs);

      logger.warn({
        ip: ip,
        requests: record.requests.length,
        limit: maxRequests,
      }, "频率限制触发");

      throw new TooManyRequestsError(
        `请求过于频繁，请在 ${windowMinutes} 分钟后再试。重置时间：${resetTime.toISOString()}`
      );
    }

    // 记录本次请求
    record.requests.push(now);
    requestStore.set(ip, record);

    // 设置响应头（标准 Rate Limit 头）
    res.set({
      "X-RateLimit-Limit": maxRequests,
      "X-RateLimit-Remaining": maxRequests - record.requests.length,
      "X-RateLimit-Reset": new Date(now + windowMs).toISOString(),
    });

    next();
  };
}

module.exports = rateLimiter;
