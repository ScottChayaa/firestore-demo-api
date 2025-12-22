const { db, auth, FieldValue, Timestamp } = require("@/config/firebase");
const { executePaginatedQuery, mapDocumentToJSON } = require("@/utils/firestore");
const { NotFoundError, ValidationError, BadError } = require("@/middleware/errorHandler");

const COLLECTION_NAME = "admins";

class AdminController {
  /**
   * 取得管理員列表（支援 Cursor 分頁和日期篩選）
   *
   * Query 參數：
   * - limit: 每頁數量（預設 20，最大 100）
   * - cursor: 分頁游標（文檔 ID）
   * - minCreatedAt: 建立日期起始（ISO 8601 格式）
   * - maxCreatedAt: 建立日期結束（ISO 8601 格式）
   * - order: 排序方向（asc | desc，預設 desc）
   * - includeDeleted: 是否包含已軟刪除的記錄（預設 false）
   * - isActive: 篩選啟用狀態（true | false | all，預設 all）
   */
  getAdmins = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);

    const { limit, cursor, order, orderBy, minCreatedAt, maxCreatedAt, isActive, includeDeleted } = req.query;

    // 建立基礎查詢
    let query = collection;

    // 篩選：預設排除已軟刪除的記錄
    if (includeDeleted !== "true") {
      query = query.where("deletedAt", "==", null);
    }

    // 篩選：啟用狀態
    if (isActive === "true") {
      query = query.where("isActive", "==", true);
    } else if (isActive === "false") {
      query = query.where("isActive", "==", false);
    }

    // 篩選：日期範圍
    if (minCreatedAt) {
      query = query.where("createdAt", ">=", Timestamp.fromDate(minCreatedAt));
    }
    if (maxCreatedAt) {
      query = query.where("createdAt", "<=", Timestamp.fromDate(maxCreatedAt));
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
      throw new ValidationError("email, password, name 為必填欄位");
    }

    if (password.length < 6) {
      throw new ValidationError("密碼至少需要 6 個字元");
    }

    // 1. 建立 Firebase Auth 帳號
    const userRecord = await auth.createUser({
      email,
      password,
      displayName: name,
    });

    req.log.info({ uid: userRecord.uid, email }, "建立 Firebase Auth 帳號成功");

    // 2. 在 Firestore 建立管理員文檔
    const adminData = {
      email: userRecord.email,
      name,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION_NAME).doc(userRecord.uid).set(adminData);

    req.log.info({ uid: userRecord.uid }, "建立管理員 Firestore 文檔成功");

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
   * 軟刪除管理員（設定 deletedAt 和 deletedBy）
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   */
  deleteAdmin = async (req, res) => {
    const { id } = req.params;
    const deletedBy = req.user?.uid || "system";

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    // 檢查是否已被軟刪除
    const adminData = admin.data();
    if (adminData.deletedAt) {
      throw new BadError("該管理員已被刪除");
    }

    // 軟刪除：設定 deletedAt 和 deletedBy
    await adminRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: deletedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id, deletedBy }, "軟刪除管理員成功");

    res.json({
      id: id,
      deletedBy: deletedBy,
      message: "管理員已軟刪除",
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
      throw new ValidationError("uid, name 為必填欄位");
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
      throw new BadError("該帳號已經具有管理員角色");
    }

    // 3. 在 Firestore 建立管理員文檔
    const adminData = {
      email: userRecord.email,
      name,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection(COLLECTION_NAME).doc(uid).set(adminData);

    req.log.info({ uid }, "為現有帳號賦予管理員角色成功");

    // 4. 取得完整的管理員資料
    const adminDoc = await db.collection(COLLECTION_NAME).doc(uid).get();

    res.status(201).json({
      message: "管理員角色建立成功",
      data: mapDocumentToJSON(adminDoc),
    });
  };

  /**
   * 切換管理員啟用/停用狀態
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   */
  toggleAdminStatus = async (req, res) => {
    const { id } = req.params;

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    const adminData = admin.data();

    // 檢查是否已被軟刪除
    if (adminData.deletedAt) {
      throw new BadError("無法操作已刪除的管理員，請先恢復");
    }

    // 切換 isActive 狀態
    const newStatus = !adminData.isActive;

    await adminRef.update({
      isActive: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id, isActive: newStatus }, `管理員狀態已${newStatus ? "啟用" : "停用"}`);

    res.json({
      id: id,
      isActive: newStatus,
      message: `管理員已${newStatus ? "啟用" : "停用"}`,
    });
  };

  /**
   * 恢復已軟刪除的管理員
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   */
  restoreAdmin = async (req, res) => {
    const { id } = req.params;

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    const adminData = admin.data();

    // 檢查是否已被軟刪除
    if (!adminData.deletedAt) {
      throw new BadError("該管理員未被刪除，無需恢復");
    }

    // 恢復：清除 deletedAt 和 deletedBy
    await adminRef.update({
      deletedAt: null,
      deletedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id }, "恢復已刪除的管理員成功");

    // 取得恢復後的資料
    const restoredAdmin = await adminRef.get();

    res.json({
      message: "管理員已恢復",
      data: mapDocumentToJSON(restoredAdmin),
    });
  };

  /**
   * 更新管理員密碼
   *
   * Path 參數：
   * - id: 管理員 ID（UID）
   *
   * Body 參數：
   * - password: 新密碼
   */
  updateAdminPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    // 檢查管理員是否存在
    const adminRef = db.collection(COLLECTION_NAME).doc(id);
    const admin = await adminRef.get();

    if (!admin.exists) {
      throw new NotFoundError(`找不到管理員 ID: ${id}`);
    }

    const adminData = admin.data();

    // 檢查是否已被軟刪除
    if (adminData.deletedAt) {
      throw new BadError("無法更新已刪除的管理員密碼");
    }

    // 更新 Firebase Auth 密碼
    await auth.updateUser(id, { password: password });

    // 更新 Firestore updatedAt 時間戳
    await adminRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id }, "管理員密碼已更新");

    res.json({
      id: id,
      message: "管理員密碼已更新",
    });
  };
}

// 導出實例
module.exports = new AdminController();
