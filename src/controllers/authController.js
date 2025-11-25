const { auth, db, FieldValue } = require("@/config/firebase");
const {
  ValidationError,
  BadError,
  UnauthorizedError,
  ForbiddenError,
  TooManyRequestsError,
  AppError,
  NotFoundError,
} = require("@/middleware/errorHandler");
const axios = require("axios");

class AuthController {
  /**
   * 會員註冊
   * 同時建立 Firebase Auth 用戶和 Firestore member document
   *
   * Body 參數：
   * - email: Email（必填）
   * - password: 密碼（必填，至少 6 字元）
   * - name: 姓名（必填）
   * - phone: 電話（必填）
   */
  memberRegister = async (req, res) => {
    const { email, password, name, phone } = req.body;

    // 檢查 Email 是否已存在於 Firestore
    const existingMember = await db.collection("members").where("email", "==", email).limit(1).get();
    if (!existingMember.empty) {
      throw new BadError("此 Email 已被使用");
    }

    let userRecord = null;
    try {
      // 1. 在 Firebase Auth 建立用戶
      userRecord = await auth.createUser({
        email,
        password,
        displayName: name,
      });
    } catch (error) {
      // Firebase Auth 錯誤處理
      if (error.code === "auth/email-already-exists") {
        throw new BadError(`此 Email 已在中註冊`);
      } else if (error.code === "auth/invalid-email") {
        throw new BadError(`Email 格式不正確`);
      } else if (error.code === "auth/weak-password") {
        throw new BadError(`密碼強度不足（至少 6 個字元）`);
      } else {
        throw new BadError(`${error.code}, ${error.message}`);
      }
    }

    // 2. 在 Firestore 建立 member document（使用 Firebase Auth 的 UID）
    const memberData = {
      name,
      email,
      phone,
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    };

    await db.collection("members").doc(userRecord.uid).set(memberData);

    res.status(201).json({
      message: "註冊成功，請使用 /api/auth/login 登入取得 token",
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name,
        phone,
      },
    });
  }

  /**
   * 基礎身份驗證（Email/Password 取得 Token）
   * 使用 Firebase REST API 驗證密碼並取得 ID Token
   * 此方法僅進行基礎驗證，不設定角色 (loginAs)
   *
   * 若要設定角色，請使用：
   * - memberLogin() - 設定為會員身份
   * - adminLogin() - 設定為管理員身份
   *
   * Body 參數：
   * - email: Email（必填）
   * - password: 密碼（必填）
   *
   * 回傳：
   * - idToken: Firebase ID Token（用於後續 API 請求）
   * - refreshToken: Refresh Token（用於更新 token）
   * - expiresIn: Token 有效期限（秒）
   */
  getTokenByEmail = async (req, res) => {
    const { email, password } = req.body;

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new AppError(500, "伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY");
    }

    let response = null;

    try {
      // 使用 Firebase REST API 驗證密碼
      response = await axios.post(`https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`, {
        email,
        password,
        returnSecureToken: true,
      });
    } catch (error) {
      // Firebase REST API 錯誤處理
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;

        if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD" || errorCode === "INVALID_LOGIN_CREDENTIALS") {
          throw new UnauthorizedError(`Email 或密碼錯誤`);
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError(`此帳號已被停用`);
        } else if (errorCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          throw new TooManyRequestsError(`登入嘗試次數過多，請稍後再試`);
        } else {
          throw new BadError(`${error.response.data.error.message}`);
        }
      }
    }

    const { idToken, refreshToken, expiresIn, localId } = response.data;

    // 取得 Firestore 中的會員資料
    const memberDoc = await db.collection("members").doc(localId).get();
    if (!memberDoc.exists) {
      throw new NotFoundError("找不到對應的會員資料");
    }

    const memberData = memberDoc.data();

    res.status(200).json({
      message: "登入成功",
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid: localId,
          email: memberData.email,
          name: memberData.name,
          phone: memberData.phone,
        },
      },
    });
  }

  /**
   * 會員登入（設定角色）
   * 驗證用戶的會員身份並設定 Custom Claims
   *
   * Body 參數：
   * - idToken: Firebase ID Token（必填，從 getTokenByEmail 取得）
   *
   * 回傳：
   * - 包含 loginAs='member' 的新 Token
   */
  memberLogin = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ValidationError("idToken 為必填欄位");
    }

    // 1. 驗證 token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. 檢查是否為會員
    const memberDoc = await db.collection("members").doc(uid).get();
    if (!memberDoc.exists) {
      throw new ValidationError("該帳號不是會員，請先註冊");
    }

    // 3. 設定 custom claims
    await auth.setCustomUserClaims(uid, {
      loginAs: "member",
    });

    req.log.info({ uid }, '設定會員 Custom Claims 成功');

    // 4. 生成 custom token
    const customToken = await auth.createCustomToken(uid);

    // 5. 取得會員資料
    const memberData = memberDoc.data();

    res.json({
      message: "會員登入成功",
      data: {
        uid,
        email: decodedToken.email,
        role: "member",
        customToken: customToken,
        user: {
          name: memberData.name,
          phone: memberData.phone,
        },
      },
      instructions: "請使用 customToken 呼叫 Firebase signInWithCustomToken() 換取新的 ID Token",
    });
  }

  /**
   * 管理員登入（設定角色）
   * 驗證用戶的管理員身份並設定 Custom Claims
   *
   * Body 參數：
   * - idToken: Firebase ID Token（必填，從 getTokenByEmail 取得）
   *
   * 回傳：
   * - 包含 loginAs='admin' 的新 Token
   */
  adminLogin = async (req, res) => {
    const { idToken } = req.body;

    if (!idToken) {
      throw new ValidationError("idToken 為必填欄位");
    }

    // 1. 驗證 token
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;

    // 2. 檢查是否為管理員
    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      throw new ValidationError("該帳號不是管理員");
    }

    // 3. 設定 custom claims
    await auth.setCustomUserClaims(uid, {
      loginAs: "admin",
    });

    req.log.info({ uid }, '設定管理員 Custom Claims 成功');

    // 4. 生成 custom token
    const customToken = await auth.createCustomToken(uid);

    // 5. 取得管理員資料
    const adminData = adminDoc.data();

    res.json({
      message: "管理員登入成功",
      data: {
        uid,
        email: decodedToken.email,
        role: "admin",
        customToken: customToken,
        user: {
          name: adminData.name,
        },
      },
      instructions: "請使用 customToken 呼叫 Firebase signInWithCustomToken() 換取新的 ID Token",
    });
  }
}

// 導出實例
module.exports = new AuthController();
