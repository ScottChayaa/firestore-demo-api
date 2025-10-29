const { db, FieldValue } = require('../config/firebase');
const { defaultMapper } = require('../utils/pagination');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

const COLLECTION_NAME = 'members';

/**
 * 創建會員
 *
 * Body 參數：
 * - name: 會員姓名（必填）
 * - email: Email（必填）
 * - phone: 電話（必填）
 */
async function createMember(req, res) {
  try {
    const { name, email, phone } = req.body;

    // 驗證必填欄位
    if (!name || !email || !phone) {
      throw new ValidationError('name, email, phone 為必填欄位');
    }

    // 檢查 Email 是否已存在
    const existingMember = await db.collection(COLLECTION_NAME)
      .where('email', '==', email)
      .limit(1)
      .get();

    if (!existingMember.empty) {
      throw new ValidationError('此 Email 已被使用');
    }

    // 建立會員資料
    const memberData = {
      name,
      email,
      phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    const docRef = await db.collection(COLLECTION_NAME).add(memberData);

    // 取得新建立的會員資料
    const newMember = await docRef.get();

    res.status(201).json({
      success: true,
      data: defaultMapper(newMember),
      message: '會員建立成功',
    });
  } catch (error) {
    if (error instanceof ValidationError) {
      return res.status(400).json({
        success: false,
        error: 'ValidationError',
        message: error.message,
      });
    }

    console.error('❌ Error creating member:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '建立會員失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 取得單一會員資料
 *
 * Path 參數：
 * - id: 會員 ID
 */
async function getMemberById(req, res) {
  try {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
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

    console.error('❌ Error fetching member:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢會員失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
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
 * - email: Email
 */
async function updateMember(req, res) {
  try {
    const { id } = req.params;
    const { name, phone, email } = req.body;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    // 如果要更新 Email，檢查是否已被其他會員使用
    if (email && email !== member.data().email) {
      const existingMember = await db.collection(COLLECTION_NAME)
        .where('email', '==', email)
        .limit(1)
        .get();

      if (!existingMember.empty) {
        throw new ValidationError('此 Email 已被其他會員使用');
      }
    }

    // 建立更新資料（只更新有提供的欄位）
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) updateData.name = name;
    if (phone !== undefined) updateData.phone = phone;
    if (email !== undefined) updateData.email = email;

    await memberRef.update(updateData);

    // 取得更新後的資料
    const updatedMember = await memberRef.get();

    res.json({
      success: true,
      data: defaultMapper(updatedMember),
      message: '會員資料更新成功',
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

    console.error('❌ Error updating member:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '更新會員失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 刪除會員
 *
 * Path 參數：
 * - id: 會員 ID
 */
async function deleteMember(req, res) {
  try {
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
      success: true,
      message: '會員刪除成功',
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

    console.error('❌ Error deleting member:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '刪除會員失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

/**
 * 列出所有會員（簡化版，實際應用應加入分頁）
 */
async function listMembers(req, res) {
  try {
    const snapshot = await db.collection(COLLECTION_NAME)
      .orderBy('createdAt', 'desc')
      .limit(100)
      .get();

    const members = [];
    snapshot.forEach(doc => {
      members.push(defaultMapper(doc));
    });

    res.json({
      success: true,
      data: members,
      count: members.length,
    });
  } catch (error) {
    console.error('❌ Error listing members:', error);
    res.status(500).json({
      success: false,
      error: 'InternalServerError',
      message: '查詢會員列表失敗',
      details: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
}

module.exports = {
  createMember,
  getMemberById,
  updateMember,
  deleteMember,
  listMembers,
};
