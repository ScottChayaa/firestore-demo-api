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

    const memberData = memberDoc.data();

    // 3. 檢查是否已被軟刪除
    if (memberData.deletedAt) {
      throw new ForbiddenError("會員帳號已被刪除");
    }

    // 4. 檢查是否已被停用
    if (memberData.isActive === false) {
      throw new ForbiddenError("會員帳號已被停用");
    }

    // 驗證通過，繼續
    next();
  });
}

/**
 * 會員所有權中間件
 * 自動將查詢限制為會員自己的資源
 *
 * 使用方式：
 * router.get('/member/orders', authMember, memberOwnership, orderController.getOrders);
 *
 * 功能：
 * - 自動設定 req.query.memberId = req.user.uid
 * - 確保會員只能查詢自己的訂單
 */
function memberOwnership(req, res, next) {
  // 強制設定 memberId 為當前用戶的 uid
  req.query.memberId = req.user.uid;

  // 防止用戶覆寫此參數
  // 即使 URL 包含 ?memberId=other_user_id，也會被覆寫
  next();
}

module.exports = { authMember, memberOwnership };
