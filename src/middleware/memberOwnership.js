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

module.exports = { memberOwnership };
