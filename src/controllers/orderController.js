const { db, FieldValue, Timestamp } = require('../config/firebase');
const { executePaginatedQuery, defaultMapper } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const COLLECTION_NAME = 'orders';

/**
 * 取得訂單列表（支援 Cursor 分頁和多條件篩選）
 *
 * Query 參數：
 * - limit: 每頁數量
 * - cursor: 分頁游標
 * - memberId: 會員 ID
 * - status: 訂單狀態（pending, processing, completed, cancelled）
 * - startDate: 開始日期（ISO 8601）
 * - endDate: 結束日期（ISO 8601）
 * - minAmount: 最低金額
 * - maxAmount: 最高金額
 * - orderBy: 排序欄位（createdAt, totalAmount）
 * - order: 排序方向（asc, desc）
 */
async function getOrders(req, res) {
  try {
    const collection = db.collection(COLLECTION_NAME);
    const {
      memberId,
      status,
      minAmount,
      maxAmount,
      orderBy = 'createdAt',
      order = 'desc',
    } = req.query;
    const { limit, cursor } = req.pagination;
    const dateRange = req.dateRange || {};

    // 建立基礎查詢
    let query = collection;

    // 篩選：會員 ID
    if (memberId) {
      query = query.where('memberId', '==', memberId);
    }

    // 篩選：訂單狀態
    if (status) {
      const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`status 必須是以下其中之一: ${validStatuses.join(', ')}`);
      }
      query = query.where('status', '==', status);
    }

    // 篩選：日期範圍
    if (dateRange.startDate) {
      query = query.where('createdAt', '>=', Timestamp.fromDate(dateRange.startDate));
    }
    if (dateRange.endDate) {
      query = query.where('createdAt', '<=', Timestamp.fromDate(dateRange.endDate));
    }

    // 篩選：金額範圍
    if (minAmount) {
      const min = parseFloat(minAmount);
      if (!isNaN(min)) {
        query = query.where('totalAmount', '>=', min);
      }
    }
    if (maxAmount) {
      const max = parseFloat(maxAmount);
      if (!isNaN(max)) {
        query = query.where('totalAmount', '<=', max);
      }
    }

    // 排序
    const orderDirection = order === 'asc' ? 'asc' : 'desc';
    if (orderBy === 'totalAmount') {
      query = query.orderBy('totalAmount', orderDirection);
    } else {
      query = query.orderBy('createdAt', orderDirection);
    }

    // 執行分頁查詢
    const result = await executePaginatedQuery(
      query,
      collection,
      limit,
      cursor,
      defaultMapper
    );

    res.json({
      success: true,
      ...result,
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error fetching orders:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢訂單失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 取得單一訂單
 *
 * Path 參數：
 * - id: 訂單 ID
 */
async function getOrderById(req, res) {
  try {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到訂單 ID: ${id}`);
    }

    res.json({
      success: true,
      data: defaultMapper(doc),
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.message,
      });
    }

    console.error('❌ Error fetching order:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢訂單失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 創建訂單
 *
 * Body 參數：
 * - memberId: 會員 ID（必填）
 * - items: 訂單項目陣列（必填）
 * - totalAmount: 總金額（必填）
 * - status: 訂單狀態（可選，預設 pending）
 */
async function createOrder(req, res) {
  try {
    const { memberId, items, totalAmount, status = 'pending' } = req.body;

    // 驗證必填欄位
    if (!memberId || !items || !totalAmount) {
      throw new ValidationError('memberId, items, totalAmount 為必填欄位');
    }

    if (!Array.isArray(items) || items.length === 0) {
      throw new ValidationError('items 必須是非空陣列');
    }

    // 驗證會員是否存在
    const memberDoc = await db.collection('members').doc(memberId).get();
    if (!memberDoc.exists) {
      throw new ValidationError(`找不到會員 ID: ${memberId}`);
    }

    // 產生訂單編號
    const orderNumber = generateOrderNumber();

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

    res.status(201).json({
      success: true,
      data: defaultMapper(newOrder),
      message: '訂單建立成功',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error creating order:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '建立訂單失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

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
async function updateOrder(req, res) {
  try {
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
      const validStatuses = ['pending', 'processing', 'completed', 'cancelled'];
      if (!validStatuses.includes(status)) {
        throw new ValidationError(`status 必須是以下其中之一: ${validStatuses.join(', ')}`);
      }
      updateData.status = status;
    }

    if (items !== undefined) {
      if (!Array.isArray(items)) {
        throw new ValidationError('items 必須是陣列');
      }
      updateData.items = items;
    }

    if (totalAmount !== undefined) {
      updateData.totalAmount = parseFloat(totalAmount);
    }

    await orderRef.update(updateData);

    // 取得更新後的資料
    const updatedOrder = await orderRef.get();

    res.json({
      success: true,
      data: defaultMapper(updatedOrder),
      message: '訂單更新成功',
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.message,
      });
    }

    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error updating order:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '更新訂單失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 刪除訂單
 *
 * Path 參數：
 * - id: 訂單 ID
 */
async function deleteOrder(req, res) {
  try {
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
      success: true,
      message: '訂單刪除成功',
      data: { id },
    });
  } catch (error) {
    if (error instanceof NotFoundError) {
      return res.status(404).json({
        success: false,
        error: 'NotFound',
        message: error.message,
      });
    }

    console.error('❌ Error deleting order:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '刪除訂單失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 產生訂單編號
 * 格式：ORD-YYYYMMDD-序號
 */
function generateOrderNumber() {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomStr = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `ORD-${dateStr}-${randomStr}`;
}

module.exports = {
  getOrders,
  getOrderById,
  createOrder,
  updateOrder,
  deleteOrder,
};
