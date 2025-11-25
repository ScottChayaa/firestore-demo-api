const { authenticate } = require("./auth");
const { db } = require("@/config/firebase");
const { ForbiddenError } = require("./errorHandler");

/**
 * 會員認證中間件
 * 驗證用戶是否以會員身份登入
 *
 * 使用方式：
 * router.get('/member/orders', authMember, (req, res) => {
 *   // req.user.loginAs === 'member'
 *   // req.user.uid 已驗證為會員
 * });
 */
async function authMember(req, res, next) {
  // 先執行基礎驗證
  await authenticate(req, res, async () => {
    // 1. 檢查 loginAs
    if (req.user.loginAs !== "member") {
      throw new ForbiddenError("請使用會員身份登入");
    }

    // 2. 雙重驗證：確認存在於 members collection
    const memberDoc = await db.collection("members").doc(req.user.uid).get();
    if (!memberDoc.exists) {
      throw new ForbiddenError("會員資料不存在");
    }

    // 驗證通過，繼續
    next();
  });
}

module.exports = { authMember };
