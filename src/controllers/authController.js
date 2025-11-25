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
      message: "註冊成功，請使用 /api/auth/member/signInWithPassword 登入取得 token",
      data: {
        uid: userRecord.uid,
        email: userRecord.email,
        name,
        phone,
      },
    });
  }

  /**
   * 會員登入（Email/Password 直接取得含角色的 ID Token）
   * 驗證密碼、檢查會員身份、設定 Custom Claims 並返回可用的 ID Token
   *
   * Body 參數：
   * - email: Email（必填）
   * - password: 密碼（必填）
   *
   * 回傳：
   * - idToken: 包含 loginAs='member' 的 ID Token（可直接用於 API 請求）
   * - refreshToken: Refresh Token
   * - expiresIn: Token 有效期限（秒）
   * - user: 用戶資料
   */
  memberSignInWithPassword = async (req, res) => {
    const { email, password } = req.body;

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new AppError(500, "伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY");
    }

    // 1. 使用 Firebase REST API 驗證密碼
    let authResponse = null;
    try {
      authResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      // Firebase REST API 錯誤處理
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;

        if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD" || errorCode === "INVALID_LOGIN_CREDENTIALS") {
          throw new UnauthorizedError("Email 或密碼錯誤");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else if (errorCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          throw new TooManyRequestsError("登入嘗試次數過多，請稍後再試");
        } else {
          throw new BadError(`登入失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "登入服務異常，請稍後再試");
    }

    const { localId: uid } = authResponse.data;

    // 2. 檢查是否為會員（嚴格驗證）
    const memberDoc = await db.collection("members").doc(uid).get();
    if (!memberDoc.exists) {
      throw new NotFoundError("該帳號不是會員，請先註冊");
    }

    // 3. 設定 custom claims
    await auth.setCustomUserClaims(uid, {
      loginAs: "member",
    });

    req.log.info({ uid, email }, "設定會員 Custom Claims 成功");

    // 4. 生成 custom token
    const customToken = await auth.createCustomToken(uid);

    // 5. 使用 Custom Token 換取包含 claims 的 ID Token
    let tokenResponse = null;
    try {
      tokenResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          token: customToken,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;
        req.log.error({ uid, errorCode }, "Custom Token 轉換失敗");

        if (errorCode === "INVALID_CUSTOM_TOKEN") {
          throw new UnauthorizedError("Token 生成失敗，請重試");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else {
          throw new BadError(`Token 轉換失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "Token 生成失敗，請稍後再試");
    }

    const { idToken, refreshToken, expiresIn } = tokenResponse.data;

    // 6. 取得會員資料
    const memberData = memberDoc.data();

    req.log.info({ uid, email }, "會員登入成功");

    res.json({
      message: "會員登入成功",
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid,
          email: memberData.email,
          role: "member",
          name: memberData.name,
          phone: memberData.phone,
        },
      },
    });
  };

  /**
   * 管理員登入（Email/Password 直接取得含角色的 ID Token）
   * 驗證密碼、檢查管理員身份、設定 Custom Claims 並返回可用的 ID Token
   *
   * Body 參數：
   * - email: Email（必填）
   * - password: 密碼（必填）
   *
   * 回傳：
   * - idToken: 包含 loginAs='admin' 的 ID Token（可直接用於 API 請求）
   * - refreshToken: Refresh Token
   * - expiresIn: Token 有效期限（秒）
   * - user: 用戶資料
   */
  adminSignInWithPassword = async (req, res) => {
    const { email, password } = req.body;

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new AppError(500, "伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY");
    }

    // 1. 使用 Firebase REST API 驗證密碼
    let authResponse = null;
    try {
      authResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${apiKey}`,
        {
          email,
          password,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      // Firebase REST API 錯誤處理
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;

        if (errorCode === "EMAIL_NOT_FOUND" || errorCode === "INVALID_PASSWORD" || errorCode === "INVALID_LOGIN_CREDENTIALS") {
          throw new UnauthorizedError("Email 或密碼錯誤");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else if (errorCode === "TOO_MANY_ATTEMPTS_TRY_LATER") {
          throw new TooManyRequestsError("登入嘗試次數過多，請稍後再試");
        } else {
          throw new BadError(`登入失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "登入服務異常，請稍後再試");
    }

    const { localId: uid } = authResponse.data;

    // 2. 檢查是否為管理員（嚴格驗證）
    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      throw new NotFoundError("該帳號不是管理員");
    }

    // 3. 設定 custom claims
    await auth.setCustomUserClaims(uid, {
      loginAs: "admin",
    });

    req.log.info({ uid, email }, "設定管理員 Custom Claims 成功");

    // 4. 生成 custom token
    const customToken = await auth.createCustomToken(uid);

    // 5. 使用 Custom Token 換取包含 claims 的 ID Token
    let tokenResponse = null;
    try {
      tokenResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          token: customToken,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;
        req.log.error({ uid, errorCode }, "Custom Token 轉換失敗");

        if (errorCode === "INVALID_CUSTOM_TOKEN") {
          throw new UnauthorizedError("Token 生成失敗，請重試");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else {
          throw new BadError(`Token 轉換失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "Token 生成失敗，請稍後再試");
    }

    const { idToken, refreshToken, expiresIn } = tokenResponse.data;

    // 6. 取得管理員資料
    const adminData = adminDoc.data();

    req.log.info({ uid, email }, "管理員登入成功");

    res.json({
      message: "管理員登入成功",
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid,
          email: adminData.email,
          role: "admin",
          name: adminData.name,
        },
      },
    });
  };

  /**
   * 會員 Custom Token 轉換（用於手機 App 等外部來源）
   * 將 customToken 轉換為包含會員角色的 ID Token
   *
   * Body 參數：
   * - customToken: Custom Token（必填，來自外部如手機 App）
   *
   * 回傳：
   * - idToken: 包含 loginAs='member' 的 ID Token
   * - refreshToken: Refresh Token
   * - expiresIn: Token 有效期限（秒）
   * - user: 用戶資料
   */
  memberSignInWithCustomToken = async (req, res) => {
    const { customToken } = req.body;

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new AppError(500, "伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY");
    }

    // 1. 使用 Custom Token 換取 ID Token
    let tokenResponse = null;
    try {
      tokenResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          token: customToken,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;

        if (errorCode === "INVALID_CUSTOM_TOKEN") {
          throw new UnauthorizedError("Custom Token 無效或已過期");
        } else if (errorCode === "CREDENTIAL_TOO_OLD_LOGIN_AGAIN") {
          throw new UnauthorizedError("Custom Token 已過期，請重新登入");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else {
          throw new BadError(`Token 轉換失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "Token 轉換失敗，請稍後再試");
    }

    const { idToken, refreshToken, expiresIn } = tokenResponse.data;

    // 2. 驗證 ID Token 並檢查角色（嚴格驗證）
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const role = decodedToken.loginAs;

    if (role !== "member") {
      throw new ForbiddenError("此 Token 不是會員角色，請使用正確的登入端點");
    }

    // 3. 取得會員資料
    const memberDoc = await db.collection("members").doc(uid).get();
    if (!memberDoc.exists) {
      throw new NotFoundError("找不到對應的會員資料");
    }

    const memberData = memberDoc.data();

    req.log.info({ uid, role }, "會員 Custom Token 轉換成功");

    res.json({
      message: "Token 轉換成功",
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid,
          email: decodedToken.email,
          role: "member",
          name: memberData.name,
          phone: memberData.phone,
        },
      },
    });
  };

  /**
   * 管理員 Custom Token 轉換（用於手機 App 等外部來源）
   * 將 customToken 轉換為包含管理員角色的 ID Token
   *
   * Body 參數：
   * - customToken: Custom Token（必填，來自外部如手機 App）
   *
   * 回傳：
   * - idToken: 包含 loginAs='admin' 的 ID Token
   * - refreshToken: Refresh Token
   * - expiresIn: Token 有效期限（秒）
   * - user: 用戶資料
   */
  adminSignInWithCustomToken = async (req, res) => {
    const { customToken } = req.body;

    // 取得 Firebase Web API Key
    const apiKey = process.env.FIREBASE_WEB_API_KEY;
    if (!apiKey) {
      throw new AppError(500, "伺服器設定錯誤：缺少 FIREBASE_WEB_API_KEY");
    }

    // 1. 使用 Custom Token 換取 ID Token
    let tokenResponse = null;
    try {
      tokenResponse = await axios.post(
        `https://identitytoolkit.googleapis.com/v1/accounts:signInWithCustomToken?key=${apiKey}`,
        {
          token: customToken,
          returnSecureToken: true,
        }
      );
    } catch (error) {
      if (error.response && error.response.data) {
        const errorCode = error.response.data.error.message;

        if (errorCode === "INVALID_CUSTOM_TOKEN") {
          throw new UnauthorizedError("Custom Token 無效或已過期");
        } else if (errorCode === "CREDENTIAL_TOO_OLD_LOGIN_AGAIN") {
          throw new UnauthorizedError("Custom Token 已過期，請重新登入");
        } else if (errorCode === "USER_DISABLED") {
          throw new ForbiddenError("此帳號已被停用");
        } else {
          throw new BadError(`Token 轉換失敗: ${errorCode}`);
        }
      }
      throw new AppError(500, "Token 轉換失敗，請稍後再試");
    }

    const { idToken, refreshToken, expiresIn } = tokenResponse.data;

    // 2. 驗證 ID Token 並檢查角色（嚴格驗證）
    const decodedToken = await auth.verifyIdToken(idToken);
    const uid = decodedToken.uid;
    const role = decodedToken.loginAs;

    if (role !== "admin") {
      throw new ForbiddenError("此 Token 不是管理員角色，請使用正確的登入端點");
    }

    // 3. 取得管理員資料
    const adminDoc = await db.collection("admins").doc(uid).get();
    if (!adminDoc.exists) {
      throw new NotFoundError("找不到對應的管理員資料");
    }

    const adminData = adminDoc.data();

    req.log.info({ uid, role }, "管理員 Custom Token 轉換成功");

    res.json({
      message: "Token 轉換成功",
      data: {
        idToken,
        refreshToken,
        expiresIn,
        user: {
          uid,
          email: decodedToken.email,
          role: "admin",
          name: adminData.name,
        },
      },
    });
  };
}

// 導出實例
module.exports = new AuthController();
