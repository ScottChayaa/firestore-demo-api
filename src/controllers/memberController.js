const { db, FieldValue } = require("@/config/firebase");
const { defaultMapper } = require("@/utils/pagination");
const { NotFoundError, ValidationError } = require("@/middleware/errorHandler");
const logger = require("@/config/logger");

const COLLECTION_NAME = "members";

class MemberController {
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
      data: defaultMapper(doc),
    });
  }

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
      data: defaultMapper(updatedMember),
      message: "會員資料更新成功",
    });
  }

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
      message: "會員刪除成功",
      data: { id },
    });
  }

  /**
   * 列出所有會員（簡化版，實際應用應加入分頁）
   */
  listMembers = async (req, res) => {
    const snapshot = await db.collection(COLLECTION_NAME).orderBy("createdAt", "desc").limit(100).get();

    const members = [];
    snapshot.forEach((doc) => {
      members.push(defaultMapper(doc));
    });

    res.json({
      data: members,
      count: members.length,
    });
  }
}

// 導出實例
module.exports = new MemberController();
