const { db, FieldValue, Timestamp } = require('@/config/firebase');
const { executePaginatedQuery, mapDocumentToJSON } = require('@/utils/firestore');
const { NotFoundError, ValidationError } = require('@/middleware/errorHandler');

const COLLECTION_NAME = 'members';

class MemberController {
  /**
   * 取得會員列表（支援 Cursor 分頁和日期篩選）
   *
   * Query 參數：
   * - limit: 每頁數量（預設 20，最大 100）
   * - cursor: 分頁游標（文檔 ID）
   * - startDate: 註冊日期起始（ISO 8601 格式）
   * - endDate: 註冊日期結束（ISO 8601 格式）
   * - order: 排序方向（asc | desc，預設 desc）
   */
  getMembers = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);
    const { limit, cursor } = req.pagination;
    const dateRange = req.dateRange || {};
    const { order, orderBy } = req.query;

    // 建立基礎查詢
    let query = collection;

    // 篩選：日期範圍
    if (dateRange.startDate) {
      query = query.where('createdAt', '>=', Timestamp.fromDate(dateRange.startDate));
    }
    if (dateRange.endDate) {
      query = query.where('createdAt', '<=', Timestamp.fromDate(dateRange.endDate));
    }

    // 排序：固定使用 createdAt
    if (orderBy === "createdAt") {
      query = query.orderBy("createdAt", order);
    }
    
    // 執行分頁查詢
    const result = await executePaginatedQuery(query, collection, limit, cursor, mapDocumentToJSON);

    res.json({
      message: "取得會員列表",
      ...result,
    });
  };

  /**
   * 取得單一會員資料
   *
   * Path 參數：
   * - id: 會員 ID
   */
  getMemberById = async (req, res) => {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    res.json({
      data: mapDocumentToJSON(doc),
    });
  };

  /**
   * 更新會員資料
   *
   * Path 參數：
   * - id: 會員 ID
   *
   * Body 參數（可選）：
   * - name: 會員姓名
   * - phone: 電話
   */
  updateMember = async (req, res) => {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    // TODO: 如果要更新 Email, 需要一併更新 firebase auth email (待確認)

    // 建立更新資料（只更新有提供的欄位）
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;

    await memberRef.update(updateData);

    // 取得更新後的資料
    const updatedMember = await memberRef.get();

    res.json({
      data: mapDocumentToJSON(updatedMember),
      message: '會員資料更新成功',
    });
  };

  /**
   * 刪除會員
   *
   * Path 參數：
   * - id: 會員 ID
   */
  deleteMember = async (req, res) => {
    const { id } = req.params;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    // 刪除會員
    await memberRef.delete();

    res.json({
      message: '會員刪除成功',
      data: { id },
    });
  };
}

// 導出實例
module.exports = new MemberController();
