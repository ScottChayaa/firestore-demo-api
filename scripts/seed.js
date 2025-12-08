/**
 * 測試資料生成腳本
 * 生成 100 會員 + 500 訂單 + 50 商品
 *
 * 使用方式：
 * 1. 直接執行: node src/utils/seedData.js
 *
 * 注意：會員會同時建立在 Firebase Auth 和 Firestore
 * 密碼統一為：qwer1234
 */

const { auth, db, FieldValue } = require("../src/config/firebase");

// 配置
const CONFIG = {
  MEMBERS_COUNT: parseInt(process.env.SEED_MEMBERS_COUNT) || 100,
  ORDERS_COUNT: parseInt(process.env.SEED_ORDERS_COUNT) || 500,
  PRODUCTS_COUNT: parseInt(process.env.SEED_PRODUCTS_COUNT) || 50,
};

// 測試資料：姓名
const FIRST_NAMES = ["王", "李", "張", "劉", "陳", "楊", "黃", "趙", "吳", "周"];
const LAST_NAMES = ["小明", "小華", "小芳", "小美", "大明", "大華", "志明", "春嬌", "建國", "淑芬"];

// 測試資料：商品分類
const CATEGORIES = ["electronics", "clothing", "food", "books", "sports"];

// 測試資料：商品名稱
const PRODUCT_NAMES = {
  electronics: ["無線藍牙耳機", "智慧手錶", "行動電源", "USB 充電線", "滑鼠", "鍵盤"],
  clothing: ["T恤", "牛仔褲", "運動鞋", "外套", "襯衫", "帽子"],
  food: ["巧克力", "餅乾", "咖啡豆", "茶葉", "堅果", "果乾"],
  books: ["小說", "漫畫", "工具書", "雜誌", "繪本", "字典"],
  sports: ["瑜珈墊", "啞鈴", "跳繩", "運動水壺", "毛巾", "護具"],
};

// 訂單狀態分佈
const ORDER_STATUS_DISTRIBUTION = [
  { status: "pending", weight: 20 },
  { status: "processing", weight: 30 },
  { status: "completed", weight: 40 },
  { status: "cancelled", weight: 10 },
];

/**
 * 生成隨機姓名
 */
function generateName() {
  const first = FIRST_NAMES[Math.floor(Math.random() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(Math.random() * LAST_NAMES.length)];
  return first + last;
}

/**
 * 生成隨機 Email
 */
function generateEmail(index) {
  const domains = ["example.com", "test.com", "demo.com"];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `user${index}@${domain}`;
}

/**
 * 生成隨機電話
 */
function generatePhone() {
  return `09${Math.floor(Math.random() * 100000000)
    .toString()
    .padStart(8, "0")}`;
}

/**
 * 根據權重隨機選擇訂單狀態
 */
function getRandomStatus() {
  const totalWeight = ORDER_STATUS_DISTRIBUTION.reduce((sum, item) => sum + item.weight, 0);
  let random = Math.random() * totalWeight;

  for (const item of ORDER_STATUS_DISTRIBUTION) {
    if (random < item.weight) {
      return item.status;
    }
    random -= item.weight;
  }

  return "pending";
}

/**
 * 生成隨機日期（過去 90 天內）
 */
function generateRandomDate() {
  const now = Date.now();
  const ninetyDaysAgo = now - 90 * 24 * 60 * 60 * 1000;
  const randomTime = ninetyDaysAgo + Math.random() * (now - ninetyDaysAgo);
  return new Date(randomTime);
}

/**
 * 批次寫入資料（使用 batch）
 */
async function batchWrite(collection, data, batchSize = 500) {
  const batches = [];
  let batch = db.batch();
  let count = 0;

  for (const item of data) {
    const docRef = collection.doc();
    batch.set(docRef, item);
    count++;

    if (count >= batchSize) {
      batches.push(batch.commit());
      batch = db.batch();
      count = 0;
    }
  }

  if (count > 0) {
    batches.push(batch.commit());
  }

  await Promise.all(batches);
}

/**
 * 生成會員測試資料
 * 同時建立 Firebase Auth 用戶和 Firestore document
 * 密碼統一為：qwer1234
 */
async function seedMembers() {
  console.log(`\n📝 開始生成 ${CONFIG.MEMBERS_COUNT} 筆會員資料...`);

  const DEFAULT_PASSWORD = "qwer1234";
  const memberIds = [];
  let successCount = 0;
  let skipCount = 0;

  // 逐一建立會員（因為需要使用 Firebase Auth）
  for (let i = 1; i <= CONFIG.MEMBERS_COUNT; i++) {
    const name = generateName();
    const email = generateEmail(i);
    const phone = generatePhone();

    try {
      // 1. 在 Firebase Auth 建立用戶
      const userRecord = await auth.createUser({
        email,
        password: DEFAULT_PASSWORD,
        displayName: name,
      });

      // 2. 在 Firestore 建立 member document（使用 Firebase Auth 的 UID）
      await db.collection("members").doc(userRecord.uid).set({
        name,
        email,
        phone,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });

      memberIds.push(userRecord.uid);
      successCount++;

      // 每 10 筆顯示進度
      if (successCount % 10 === 0) {
        console.log(`  進度: ${successCount}/${CONFIG.MEMBERS_COUNT}`);
      }
    } catch (error) {
      // 如果 Email 已存在，跳過
      if (error.code === "auth/email-already-exists") {
        console.log(`  ⚠️  跳過已存在的 Email: ${email}`);
        skipCount++;
      } else {
        console.error(`  ❌ 建立會員失敗 (${email}):`, error.message);
      }
    }
  }

  console.log(`✅ 成功生成 ${successCount} 筆會員資料`);
  if (skipCount > 0) {
    console.log(`⚠️  跳過 ${skipCount} 筆已存在的會員`);
  }

  return memberIds;
}

/**
 * 建立管理員帳號
 */
async function seedAdmin() {
  console.log("\n📝 建立管理員帳號...");

  const ADMIN_EMAIL = "admin@example.com";
  const ADMIN_PASSWORD = "qwer1234";
  const ADMIN_NAME = "系統管理員";
  const ADMIN_PHONE = "0900000000";

  try {
    // 檢查是否已存在
    let userRecord;
    try {
      userRecord = await auth.getUserByEmail(ADMIN_EMAIL);
      console.log(`  ℹ️  管理員帳號已存在: ${ADMIN_EMAIL}`);
    } catch (error) {
      if (error.code === "auth/user-not-found") {
        // 建立管理員用戶
        userRecord = await auth.createUser({
          email: ADMIN_EMAIL,
          password: ADMIN_PASSWORD,
          displayName: ADMIN_NAME,
        });
        console.log(`  ✅ 建立管理員 Firebase Auth 用戶: ${ADMIN_EMAIL}`);
      } else {
        throw error;
      }
    }

    // 建立或更新 Firestore member document
    await db.collection("members").doc(userRecord.uid).set(
      {
        name: ADMIN_NAME,
        email: ADMIN_EMAIL,
        phone: ADMIN_PHONE,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        createdAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    // 建立或更新 admins document
    await db.collection("admins").doc(userRecord.uid).set(
      {
        uid: userRecord.uid,
        email: ADMIN_EMAIL,
        displayName: ADMIN_NAME,
        isActive: true,
        deletedAt: null,
        deletedBy: null,
        createdAt: FieldValue.serverTimestamp(),
      },
      { merge: true }
    );

    console.log(`✅ 管理員設定完成`);
    console.log(`  Email: ${ADMIN_EMAIL}`);
    console.log(`  密碼: ${ADMIN_PASSWORD}`);
  } catch (error) {
    console.error("❌ 建立管理員失敗:", error.message);
    throw error;
  }
}

/**
 * 生成商品測試資料
 */
async function seedProducts() {
  console.log(`\n📝 開始生成 ${CONFIG.PRODUCTS_COUNT} 筆商品資料...`);

  const products = [];

  for (let i = 0; i < CONFIG.PRODUCTS_COUNT; i++) {
    const category = CATEGORIES[Math.floor(Math.random() * CATEGORIES.length)];
    const productNames = PRODUCT_NAMES[category];
    const productName = productNames[Math.floor(Math.random() * productNames.length)];

    products.push({
      name: `${productName} ${i + 1}`,
      description: `優質的${productName}，品質保證`,
      price: Math.floor(Math.random() * 5000) + 100,
      category,
      stock: Math.floor(Math.random() * 100) + 10,
      imageUrl: `https://via.placeholder.com/300?text=${encodeURIComponent(productName)}`,
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  await batchWrite(db.collection("products"), products);

  console.log(`✅ 成功生成 ${CONFIG.PRODUCTS_COUNT} 筆商品資料`);

  return products;
}

/**
 * 生成訂單測試資料
 */
async function seedOrders() {
  console.log(`\n📝 開始生成 ${CONFIG.ORDERS_COUNT} 筆訂單資料...`);

  // 取得所有會員 ID
  const membersSnapshot = await db.collection("members").select("__name__").get();
  const memberIds = membersSnapshot.docs.map((doc) => doc.id);

  if (memberIds.length === 0) {
    throw new Error("找不到會員資料，請先生成會員資料");
  }

  // 取得所有商品
  const productsSnapshot = await db.collection("products").get();
  const products = productsSnapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (products.length === 0) {
    throw new Error("找不到商品資料，請先生成商品資料");
  }

  const orders = [];

  for (let i = 0; i < CONFIG.ORDERS_COUNT; i++) {
    // 隨機選擇會員
    const memberId = memberIds[Math.floor(Math.random() * memberIds.length)];

    // 隨機選擇 1-3 個商品
    const itemCount = Math.floor(Math.random() * 3) + 1;
    const items = [];
    let totalAmount = 0;

    for (let j = 0; j < itemCount; j++) {
      const product = products[Math.floor(Math.random() * products.length)];
      const quantity = Math.floor(Math.random() * 3) + 1;
      const itemTotal = product.price * quantity;

      items.push({
        productId: product.id,
        productName: product.name,
        quantity,
        price: product.price,
      });

      totalAmount += itemTotal;
    }

    // 生成訂單編號
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const orderNumber = `ORD-${dateStr}-${String(i + 1).padStart(6, "0")}`;

    const createdAt = generateRandomDate();

    orders.push({
      memberId,
      orderNumber,
      items,
      totalAmount,
      status: getRandomStatus(),
      createdAt,
      updatedAt: createdAt,
    });
  }

  await batchWrite(db.collection("orders"), orders);

  console.log(`✅ 成功生成 ${CONFIG.ORDERS_COUNT} 筆訂單資料`);

  return orders;
}

/**
 * 主函數：生成所有測試資料
 */
async function seedAll() {
  try {
    console.log("\n🚀 開始生成測試資料...\n");
    console.log("配置：");
    console.log(`  - 會員數量: ${CONFIG.MEMBERS_COUNT}`);
    console.log(`  - 訂單數量: ${CONFIG.ORDERS_COUNT}`);
    console.log(`  - 商品數量: ${CONFIG.PRODUCTS_COUNT}`);
    console.log(`  - 預設密碼: qwer1234`);

    const startTime = Date.now();

    // 建立管理員帳號
    await seedAdmin();

    // 生成會員資料
    await seedMembers();

    // 生成商品資料
    await seedProducts();

    // 生成訂單資料
    await seedOrders();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log("\n✅ 所有測試資料生成完成！");
    console.log(`⏱️  總耗時: ${duration} 秒`);
    console.log("\n📋 登入資訊：");
    console.log("  管理員帳號: admin@example.com");
    console.log(`  會員帳號: ${CONFIG.MEMBERS_COUNT} 筆`);
    console.log("  密碼（統一）: qwer1234\n");

    return {
      data: {
        membersCreated: CONFIG.MEMBERS_COUNT,
        ordersCreated: CONFIG.ORDERS_COUNT,
        productsCreated: CONFIG.PRODUCTS_COUNT,
      },
    };
  } catch (error) {
    console.error("\n❌ 生成測試資料失敗:", error.message);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log("🎉 腳本執行完成");
      process.exit(0);
    })
    .catch((error) => {
      console.error("💥 腳本執行失敗:", error);
      process.exit(1);
    });
}

module.exports = {
  seedAll,
  seedMembers,
  seedAdmin,
  seedProducts,
  seedOrders,
};
