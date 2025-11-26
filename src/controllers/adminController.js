const { db, auth, FieldValue, Timestamp } = require('@/config/firebase');
const { executePaginatedQuery, mapDocumentToJSON } = require('@/utils/firestore');
const { NotFoundError, ValidationError, BadError } = require('@/middleware/errorHandler');

const COLLECTION_NAME = 'admins';

class AdminController {
  /**
   * 取得管理員列表（支援 Cursor 分頁和日期篩選）
   *
   * Query 參數：
   * - limit: 每頁數量（預設 20，最大 100）
   * - cursor: 分頁游標（文檔 ID）
   * - startDate: 建立日期起始（ISO 8601 格式）
   * - endDate: 建立日期結束（ISO 8601 格式）
   * - order: 排序方向（asc | desc，預設 desc）
   */
  getAdmins = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);
    const { limit, cursor } = req.pagination;
    const dateRange = req.dateRange || {};
    const { order = 'desc', orderBy = 'createdAt' } = req.query;

    // 建立基礎查詢
    let query = collection;

    // 篩選：日期範圍
    if (dateRange.startDate) {
      query = query.where('createdAt', '>=', Timestamp.fromDate(dateRange.startDate));
    }
    if (dateRange.endDate) {
      query = query.where('createdAt', '<=', Timestamp.fromDate(dateRange.endDate));
    }

    // 排序
    query = query.orderBy(orderBy, order);

    // 執行分頁查詢
    const result = await executePaginatedQuery(query, collection, limit, cursor, mapDocumentToJSON);

    res.json(result);
  };

  /**
   * 取得單一管理員資料
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   */
  getAdminById = async (req, res) => {
    const { id } = req.params;

    const doc = await db.collection(COLLECTION_NAME).doc(id).get();

    if (!doc.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    res.json(mapDocumentToJSON(doc));
  };

  /**
   * 建立管理員（同時建立 Firebase Auth 帳號和 Firestore 文檔）
   *
   * Body 參數：
   * - email: 管理員 Email（必填，唯一）
   * - password: 密碼（必填，至少 6 字元）
   * - name: 管理員姓名（必填）
   */
  createAdmin = async (req, res) => {
    const { email, password, name } = req.body;

    // 驗證必填欄位
    if (!email || !password || !name) {
      throw new ValidationError('email, password, name 為必填欄位');
    }

    if (password.length < 6) {
      throw new ValidationError('密碼至少需要 6 個字元');
    }

    // 1. 建立 Firebase Auth 帳號
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    req.log.info({ uid: userRecord.uid, email }, '建立 Firebase Auth 帳號成功');

    // 2. 在 Firestore 建立管理員文檔
    const adminData = {
      email: userRecord.email,
      name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION_NAME).doc(userRecord.uid).set(adminData);

    req.log.info({ uid: userRecord.uid }, '建立管理員 Firestore 文檔成功');

    // 3. 取得完整的管理員資料
    const adminDoc = await db.collection(COLLECTION_NAME).doc(userRecord.uid).get();

    res.status(201).json(mapDocumentToJSON(adminDoc));
  };

  /**
   * 更新管理員資料
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   *
   * Body 參數（可選）：
   * - name: 管理員姓名
   */
  updateAdmin = async (req, res) => {
    const { id } = req.params;
    const { name } = req.body;

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    // 建立更新資料（只更新有提供的欄位）
    const updateData = {
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (name !== undefined) {
      updateData.name = name;

      // 同步更新 Firebase Auth 的 displayName
      await auth.updateUser(id, { displayName: name });
    }

    await adminRef.update(updateData);

    // 取得更新後的資料
    const updatedAdmin = await adminRef.get();

    res.json(mapDocumentToJSON(updatedAdmin));
  };

  /**
   * 刪除管理員
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   */
  deleteAdmin = async (req, res) => {
    const { id } = req.params;

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    // 刪除 Firestore 文檔
    await adminRef.delete();

    req.log.info({ uid: id }, '刪除管理員 Firestore 文檔成功');

    // 注意：不刪除 Firebase Auth 帳號，因為可能同時是會員
    // 如果需要完全刪除帳號，請另外呼叫 Firebase Auth API

    res.json({
      id: id,
    });
  };

  /**
   * 為現有帳號賦予會員角色
   * （只建立 Firestore 文檔，不修改 Custom Claims）
   *
   * Body 參數：
   * - uid: Firebase Auth UID（必填）
   * - name: 會員姓名（必填）
   * - phone: 電話（可選）
   */
  createMemberRole = async (req, res) => {
    const { uid, name, phone } = req.body;

    // 1. 檢查 Firebase Auth 帳號是否存在
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (error) {
      throw new NotFoundError(`找不到 Firebase Auth 帳號: ${uid}`);
    }

    // 2. 檢查是否已經是會員
    const existingMember = await db.collection('members').doc(uid).get();
    if (existingMember.exists) {
      throw new BadError('該帳號已經具有會員角色');
    }

    // 3. 在 Firestore 建立會員文檔
    const memberData = {
      email: userRecord.email,
      name,
      phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection('members').doc(uid).set(memberData);

    req.log.info({ uid }, `為現有帳號賦予會員角色成功 : ${uid}`);

    // 4. 取得完整的會員資料
    const memberDoc = await db.collection('members').doc(uid).get();

    res.status(201).json({
      message: '會員角色建立成功',
      data: mapDocumentToJSON(memberDoc),
    });
  };

  /**
   * 為現有帳號賦予管理員角色
   * （只建立 Firestore 文檔，不修改 Custom Claims）
   *
   * Body 參數：
   * - uid: Firebase Auth UID（必填）
   * - name: 管理員姓名（必填）
   */
  createAdminRole = async (req, res) => {
    const { uid, name } = req.body;

    // 驗證必填欄位
    if (!uid || !name) {
      throw new ValidationError('uid, name 為必填欄位');
    }

    // 1. 檢查 Firebase Auth 帳號是否存在
    let userRecord;
    try {
      userRecord = await auth.getUser(uid);
    } catch (error) {
      throw new NotFoundError(`找不到 Firebase Auth 帳號: ${uid}`);
    }

    // 2. 檢查是否已經是管理員
    const existingAdmin = await db.collection(COLLECTION_NAME).doc(uid).get();
    if (existingAdmin.exists) {
      throw new ValidationError('該帳號已經具有管理員角色');
    }

    // 3. 在 Firestore 建立管理員文檔
    const adminData = {
      email: userRecord.email,
      name,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION_NAME).doc(uid).set(adminData);

    req.log.info({ uid }, '為現有帳號賦予管理員角色成功');

    // 4. 取得完整的管理員資料
    const adminDoc = await db.collection(COLLECTION_NAME).doc(uid).get();

    res.status(201).json({
      message: '管理員角色建立成功',
      data: mapDocumentToJSON(adminDoc),
    });
  };
}

// 導出實例
module.exports = new AdminController();
