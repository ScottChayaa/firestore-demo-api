const pinoHttp = require("pino-http");
const logger = require("../config/logger");
const crypto = require("crypto");

/**
 * HTTP 請求日誌中間件
 * 使用 pino-http 自動記錄所有 HTTP 請求和響應
 *
 * 特性：
 * - 自動生成唯一的 Request ID (UUID)
 * - 將 request logger 掛載到 req.log
 * - 所有使用 req.log 的日誌都會包含相同的 requestId
 */

const httpLogger = pinoHttp({
  logger,

  // 自動記錄每個請求的資訊
  autoLogging: true,

  // 生成唯一的 Request ID
  genReqId: function (req, res) {
    // 優先使用上游傳遞的 request ID（如 Load Balancer、API Gateway）
    const existingID = req.id ?? req.headers["x-request-id"];
    if (existingID) {
      return existingID;
    }
    const id = crypto.randomUUID();
    req.headers["x-request-id"] = id; // req.headers 新增 request 的追蹤的 uuid, 後續 req.log.info() 都可以套用
    res.setHeader("X-Request-ID", id);
    return id;
  },

  customProps: (req, res) => {
    const props = {};

    // 如果有 authenticated user，也加入
    if (req.user) {
      props.user = {
        uid: req.user.uid,
        email: req.user.email,
      };
    }

    return props;
  },

  // 根據狀態碼決定日誌等級
  customLogLevel: function (req, res, err) {
    if (res.statusCode >= 400 && res.statusCode < 500) {
      return "warn"; // 4xx 客戶端錯誤 → WARN
    } else if (res.statusCode >= 500 || err) {
      return "error"; // 5xx 伺服器錯誤 → ERROR
    } else if (res.statusCode >= 300 && res.statusCode < 400) {
      return "info"; // 3xx 重導向 → INFO
    }
    return "info"; // 2xx 成功 → INFO
  },

  // 將 res.err 對應到日誌的 err 欄位
  customAttributeKeys: {
    err: "err",
  },

  // 自訂成功訊息（顯示請求方法和路徑）
  customSuccessMessage: function (req, res) {
    return `${req.method} ${req.originalUrl}`;
  },

  // 自訂錯誤訊息（顯示錯誤訊息）
  customErrorMessage: function (req, res, err) {
    return res.err?.message || err?.message || "Request failed";
  },

  // 自訂成功請求的額外日誌資料
  customSuccessObject: function (req, res, loggableObject) {
    const extras = {};

    // 在開發環境記錄 req.body（此時 body 已被 express.json() 解析）
    if (process.env.NODE_ENV !== "production" && req.body && Object.keys(req.body).length > 0) {
      extras.reqBody = req.body;
    }

    // 記錄 response body（從 res.locals 取得，由 responseBodyLogger 設定）
    if (res.locals.responseBody !== undefined) {
      extras.resBody = res.locals.responseBody;
    }

    return {
      ...loggableObject,
      ...extras,
    };
  },

  // 自訂錯誤請求的額外日誌資料
  customErrorObject: function (req, res, err, loggableObject) {
    const extras = {};

    // 在開發環境記錄 req.body（幫助除錯錯誤請求）
    if (process.env.NODE_ENV !== "production" && req.body && Object.keys(req.body).length > 0) {
      extras.reqBody = req.body;
    }

    // 錯誤時也記錄 response body
    if (res.locals.responseBody !== undefined) {
      extras.resBody = res.locals.responseBody;
    }

    return {
      ...loggableObject,
      ...extras,
    };
  },

  serializers: {
    req: (req) => {
      const logData = {
        method: req.method,
        url: req.url,
        query: req.query,
        params: req.params,
        headers: {
          // 簡化 hearders 的 log 顯示
          "user-agent": req.headers["user-agent"],
          "content-type": req.headers["content-type"],
          "x-request-id": req.headers["x-request-id"],
        },
        remoteAddress: req.remoteAddress,
        remotePort: req.remotePort,
      };

      return logData;
    },

    res: (res) => ({
      statusCode: res.statusCode,
      headers: {
        "content-type": res.getHeader("content-type"),
      },
    }),

    err: (err) => {
      if (!err) return undefined;
      return {
        statusCode: err.statusCode,
        stack: err.stack?.split("\n") ?? [],
      };
    },
  },
});

module.exports = httpLogger;
