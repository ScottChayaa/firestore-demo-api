const { db, auth, FieldValue, Timestamp } = require("@/config/firebase");
const { executePaginatedQuery, mapDocumentToJSON } = require("@/utils/firestore");
const { NotFoundError, ValidationError, BadError } = require("@/middleware/errorHandler");

const COLLECTION_NAME = "members";

class MemberController {
  /**
   * 取得會員列表（支援 Cursor 分頁和日期篩選）
   *
   * Query 參數：
   * - limit: 每頁數量（預設 20，最大 100）
   * - cursor: 分頁游標（文檔 ID）
   * - minCreatedAt: 註冊日期起始（ISO 8601 格式）
   * - maxCreatedAt: 註冊日期結束（ISO 8601 格式）
   * - order: 排序方向（asc | desc，預設 desc）
   * - includeDeleted: 是否包含已軟刪除的記錄（預設 false）
   * - isActive: 篩選啟用狀態（true | false | all，預設 all）
   */
  getMembers = async (req, res) => {
    const collection = db.collection(COLLECTION_NAME);

    const { limit, cursor, order, orderBy, minCreatedAt, maxCreatedAt, includeDeleted, isActive } = req.query;

    // 建立基礎查詢
    let query = collection;

    // 篩選：預設排除已軟刪除的記錄
    if (includeDeleted == "false") {
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

    // 排序：固定使用 createdAt
    query = query.orderBy(orderBy, order);

    // 執行分頁查詢
    const result = await executePaginatedQuery(query, collection, limit, cursor, mapDocumentToJSON);

    res.json(result);
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

    res.json(mapDocumentToJSON(doc));
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
    const { name, phone } = req.body;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    // 建立更新資料（只更新有提供的欄位）
    const updateData = {
      name: name,
      phone: phone,
      updatedAt: FieldValue.serverTimestamp(),
    };

    await memberRef.update(updateData);

    // 取得更新後的資料
    const updatedMember = await memberRef.get();

    res.json(mapDocumentToJSON(updatedMember));
  };

  /**
   * 建立會員（同時建立 Firebase Auth 帳號和 Firestore 文檔）
   *
   * Body 參數：
   * - email: 會員 Email（必填，唯一）
   * - password: 密碼（必填，至少 6 字元）
   * - name: 會員姓名（必填）
   * - phone: 電話（可選）
   */
  createMember = async (req, res) => {
    const { email, password, name, phone } = req.body;

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

    // 2. 在 Firestore 建立會員文檔
    const memberData = {
      email: userRecord.email,
      name,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    if (phone) {
      memberData.phone = phone;
    }

    await db.collection(COLLECTION_NAME).doc(userRecord.uid).set(memberData);

    req.log.info({ uid: userRecord.uid }, "建立會員 Firestore 文檔成功");

    // 3. 取得完整的會員資料
    const memberDoc = await db.collection(COLLECTION_NAME).doc(userRecord.uid).get();

    res.status(201).json(mapDocumentToJSON(memberDoc));
  };

  /**
   * 軟刪除會員（設定 deletedAt 和 deletedBy）
   *
   * Path 參數：
   * - id: 會員 ID
   */
  deleteMember = async (req, res) => {
    const { id } = req.params;
    const deletedBy = req.user?.uid || "system";

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    // 檢查是否已被軟刪除
    const memberData = member.data();
    if (memberData.deletedAt) {
      throw new BadError("該會員已被刪除");
    }

    // 軟刪除：設定 deletedAt 和 deletedBy
    await memberRef.update({
      deletedAt: FieldValue.serverTimestamp(),
      deletedBy: deletedBy,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id, deletedBy }, "軟刪除會員成功");

    res.json({
      id: id,
      deletedBy: deletedBy,
      message: "會員已軟刪除",
    });
  };

  /**
   * 切換會員啟用/停用狀態
   *
   * Path 參數：
   * - id: 會員 ID
   */
  toggleMemberStatus = async (req, res) => {
    const { id } = req.params;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    const memberData = member.data();

    // 檢查是否已被軟刪除
    if (memberData.deletedAt) {
      throw new BadError("無法操作已刪除的會員，請先恢復");
    }

    // 切換 isActive 狀態
    const newStatus = !memberData.isActive;

    await memberRef.update({
      isActive: newStatus,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id, isActive: newStatus }, `會員狀態已${newStatus ? "啟用" : "停用"}`);

    res.json({
      id: id,
      isActive: newStatus,
      message: `會員已${newStatus ? "啟用" : "停用"}`,
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
    const existingMember = await db.collection("members").doc(uid).get();
    if (existingMember.exists) {
      throw new BadError("該帳號已經具有會員角色");
    }

    // 3. 在 Firestore 建立會員文檔
    const memberData = {
      email: userRecord.email, // 如果有使用 auth email 機制, 就會有值 (可能沒有)
      name,
      phone,
      isActive: true,
      deletedAt: null,
      deletedBy: null,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("members").doc(uid).set(memberData);

    req.log.info({ uid }, `為現有帳號賦予會員角色成功 : ${uid}`);

    // 4. 取得完整的會員資料
    const memberDoc = await db.collection("members").doc(uid).get();

    res.status(201).json({
      message: "會員角色建立成功",
      data: mapDocumentToJSON(memberDoc),
    });
  };

  /**
   * 恢復已軟刪除的會員
   *
   * Path 參數：
   * - id: 會員 ID
   */
  restoreMember = async (req, res) => {
    const { id } = req.params;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    const memberData = member.data();

    // 檢查是否已被軟刪除
    if (!memberData.deletedAt) {
      throw new BadError("該會員未被刪除，無需恢復");
    }

    // 恢復：清除 deletedAt 和 deletedBy
    await memberRef.update({
      deletedAt: null,
      deletedBy: null,
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id }, "恢復已刪除的會員成功");

    // 取得恢復後的資料
    const restoredMember = await memberRef.get();

    res.json({
      message: "會員已恢復",
      data: mapDocumentToJSON(restoredMember),
    });
  };

  /**
   * 更新會員密碼
   *
   * Path 參數：
   * - id: 會員 ID（UID）
   *
   * Body 參數：
   * - password: 新密碼
   */
  updateMemberPassword = async (req, res) => {
    const { id } = req.params;
    const { password } = req.body;

    // 檢查會員是否存在
    const memberRef = db.collection(COLLECTION_NAME).doc(id);
    const member = await memberRef.get();

    if (!member.exists) {
      throw new NotFoundError(`找不到會員 ID: ${id}`);
    }

    const memberData = member.data();

    // 檢查是否已被軟刪除
    if (memberData.deletedAt) {
      throw new BadError("無法更新已刪除的會員密碼");
    }

    // 更新 Firebase Auth 密碼
    await auth.updateUser(id, { password: password });

    // 更新 Firestore updatedAt 時間戳
    await memberRef.update({
      updatedAt: FieldValue.serverTimestamp(),
    });

    req.log.info({ uid: id }, "會員密碼已更新");

    res.json({
      id: id,
      message: "會員密碼已更新",
    });
  };
}

// 導出實例
module.exports = new MemberController();
