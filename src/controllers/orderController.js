const { db, FieldValue, Timestamp } = require("@/config/firebase");
const { executePaginatedQuery, mapDocumentToJSON } = require("@/utils/firestore");
const { NotFoundError, ValidationError } = require("@/middleware/errorHandler");

const COLLECTION_NAME = "orders";

class OrderController {
  /**
   * 取得訂單列表（支援 Cursor 分頁和多條件篩選）
   *
   * Query 參數：
   * - limit: 每頁數量
   * - cursor: 分頁游標
   * - memberId: 會員 ID
   * - status: 訂單狀態（pending, processing, completed, cancelled）
   * - minCreatedAt: 開始日期（ISO 8601）
   * - maxCreatedAt: 結束日期（ISO 8601）
   * - minAmount: 最低金額
   * - maxAmount: 最高金額
   * - orderBy: 排序欄位（createdAt, totalAmount）
   * - order: 排序方向（asc, desc）
   */
  getOrders = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);

    const { limit, cursor, order, orderBy, memberId, status, minCreatedAt, maxCreatedAt, minAmount, maxAmount, includeDeleted } = req.query;

    // req.log.info({
    //   details: {
    //     reqQuery: req.query,
    //   },
    // });

    // 建立基礎查詢
    let query = collection;

    // 篩選：會員 ID
    if (memberId) {
      query = query.where("memberId", "==", memberId);
    }

    // 篩選：訂單狀態
    if (status) {
      query = query.where("status", "==", status);
    }

    // 篩選：日期範圍
    if (minCreatedAt) {
      query = query.where("createdAt", ">=", Timestamp.fromDate(minCreatedAt));
    }
    if (maxCreatedAt) {
      query = query.where("createdAt", "<=", Timestamp.fromDate(maxCreatedAt));
    }

    // 篩選：金額範圍
    if (minAmount) {
      query = query.where("totalAmount", ">=", minAmount);
    }
    if (maxAmount) {
      query = query.where("totalAmount", "<=", maxAmount);
    }

    // 排序
    query = query.orderBy(orderBy, order);

    // 執行分頁查詢
    const result = await executePaginatedQuery(query, collection, limit, cursor, mapDocumentToJSON);

    res.json(result);
  };

  /**
   * 取得單一訂單
   *
   * Path 參數：
   * - id: 訂單 ID
   */
  getOrderById = async (req, res) => {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到訂單 ID: ${id}`);
    }

    res.json(mapDocumentToJSON(doc));
  };

  /**
   * 創建訂單
   *
   * Body 參數：
   * - memberId: 會員 ID（必填）
   * - items: 訂單項目陣列（必填）
   * - totalAmount: 總金額（必填）
   * - status: 訂單狀態（可選，預設 pending）
   */
  createOrder = async (req, res) => {
    const { memberId, items, totalAmount, status } = req.body;

    // 驗證必填欄位
    if (!memberId || !items || !totalAmount) {
      throw new ValidationError("memberId, items, totalAmount 為必填欄位");
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError("items 必須是非空陣列");
    }

    // 驗證會員是否存在
    const memberDoc = await db.collection("members").doc(memberId).get();
    if (!memberDoc.exists) {
      throw new ValidationError(`找不到會員 ID: ${memberId}`);
    }

    // 產生訂單編號
    const orderNumber = this.generateOrderNumber();

    // 建立訂單資料
    const orderData = {
      memberId,
      orderNumber,
      items,
      totalAmount: parseFloat(totalAmount),
      status,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTION_NAME).add(orderData);

    // 取得新建立的訂單資料
    const newOrder = await docRef.get();

    res.status(201).json(mapDocumentToJSON(newOrder));
  };

  /**
   * 更新訂單
   *
   * Path 參數：
   * - id: 訂單 ID
   *
   * Body 參數（可選）：
   * - status: 訂單狀態
   * - items: 訂單項目
   * - totalAmount: 總金額
   */
  updateOrder = async (req, res) => {
    const { id } = req.params;
    const { status, items, totalAmount } = req.body;

    // 檢查訂單是否存在
    const orderRef = db.collection(COLLECTION_NAME).doc(id);
    const order = await orderRef.get();

    if (!order.exists) {
      throw new NotFoundError(`找不到訂單 ID: ${id}`);
    }

    // 建立更新資料
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (status !== undefined) {
      const validStatuses = ["pending", "processing", "completed", "cancelled"];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`status 必須是以下其中之一: ${validStatuses.join(", ")}`);
      }
      updateData.status = status;
    }

    if (items !== undefined) {
      if (!Array.isArray(items)) {
        throw new ValidationError("items 必須是陣列");
      }
      updateData.items = items;
    }

    if (totalAmount !== undefined) {
      updateData.totalAmount = parseFloat(totalAmount);
    }

    await orderRef.update(updateData);

    // 取得更新後的資料
    const updatedOrder = await orderRef.get();

    res.json(mapDocumentToJSON(updatedOrder));
  };

  /**
   * 刪除訂單
   *
   * Path 參數：
   * - id: 訂單 ID
   */
  deleteOrder = async (req, res) => {
    const { id } = req.params;

    // 檢查訂單是否存在
    const orderRef = db.collection(COLLECTION_NAME).doc(id);
    const order = await orderRef.get();

    if (!order.exists) {
      throw new NotFoundError(`找不到訂單 ID: ${id}`);
    }

    // 刪除訂單
    await orderRef.delete();

    res.json({
      id: id,
    });
  };

  /**
   * 產生訂單編號（私有方法）
   * 格式：ORD-YYYYMMDD-序號
   */
  generateOrderNumber() {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `ORD-${dateStr}-${randomStr}`;
  }
}

// 導出實例
module.exports = new OrderController();
