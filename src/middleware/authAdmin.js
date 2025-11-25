const { authenticate } = require("./auth");
const { requireAdmin } = require("./adminCheck");
const { ForbiddenError } = require("./errorHandler");

/**
 * 管理員認證中間件
 * 驗證用戶是否以管理員身份登入
 *
 * 使用方式：
 * router.get('/admin/orders', authAdmin, (req, res) => {
 *   // req.user.loginAs === 'admin'
 *   // req.user.isAdmin === true
 * });
 */
async function authAdmin(req, res, next) {
  // 先執行基礎驗證
  await authenticate(req, res, () => {
    // 1. 檢查 loginAs
    if (req.user.loginAs !== "admin") {
      throw new ForbiddenError("請使用管理員身份登入");
    }

    // 2. 使用現有的 admin 檢查（已在 authenticate 中執行）
    // 這會確認 req.user.isAdmin === true
    requireAdmin(req, res, next);
  });
}

module.exports = { authAdmin };
