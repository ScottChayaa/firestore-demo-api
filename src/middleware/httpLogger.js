const pinoHttp = require("pino-http");
const logger = require("../config/logger");

/**
 * HTTP 請求日誌中間件
 * 使用 pino-http 自動記錄所有 HTTP 請求和響應
 *
 * 在正式環境自動禁用
 */

let httpLogger;

// 如果是正式環境，使用空中間件
if (process.env.NODE_ENV === "production") {
  httpLogger = (req, res, next) => next();
} else {
  httpLogger = pinoHttp({
    logger,

    // 自動記錄每個請求的資訊
    autoLogging: true,

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

    // 添加自定義屬性（在請求完成時執行，此時 req.user 已被 authenticate middleware 設置）
    customProps: (req, res) => {
      if (req.user) {
        return {
          user: req.user
        };
      }
      return {};
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
      // 在開發環境記錄 req.body（此時 body 已被 express.json() 解析）
      if (req.body && Object.keys(req.body).length > 0) {
        return {
          ...loggableObject,
          reqBody: req.body,
        };
      }
      return loggableObject;
    },

    // 自訂錯誤請求的額外日誌資料
    customErrorObject: function (req, res, err, loggableObject) {
      // 在開發環境記錄 req.body（幫助除錯錯誤請求）
      if (req.body && Object.keys(req.body).length > 0) {
        return {
          ...loggableObject,
          reqBody: req.body,
        };
      }
      return loggableObject;
    },

    serializers: {
      req: (req) => {
        const logData = {
          method: req.method,
          url: req.url,
          query: req.query,
          params: req.params,
          headers: { // 簡化 hearders 的 log 顯示
            "user-agent": req.headers["user-agent"],
            "content-type": req.headers["content-type"],
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
        }
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
}

module.exports = httpLogger;
