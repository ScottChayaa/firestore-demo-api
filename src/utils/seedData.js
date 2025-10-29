/**
 * 測試資料生成腳本
 * 生成 100 會員 + 500 訂單 + 50 商品
 *
 * 使用方式：
 * 1. 透過 API: POST /api/seed
 * 2. 直接執行: node src/utils/seedData.js
 */

const { db, FieldValue } = require('../config/firebase');

// 配置
const CONFIG = {
  MEMBERS_COUNT: parseInt(process.env.SEED_MEMBERS_COUNT) || 100,
  ORDERS_COUNT: parseInt(process.env.SEED_ORDERS_COUNT) || 500,
  PRODUCTS_COUNT: parseInt(process.env.SEED_PRODUCTS_COUNT) || 50,
};

// 測試資料：姓名
const FIRST_NAMES = ['王', '李', '張', '劉', '陳', '楊', '黃', '趙', '吳', '周'];
const LAST_NAMES = ['小明', '小華', '小芳', '小美', '大明', '大華', '志明', '春嬌', '建國', '淑芬'];

// 測試資料：商品分類
const CATEGORIES = ['electronics', 'clothing', 'food', 'books', 'sports'];

// 測試資料：商品名稱
const PRODUCT_NAMES = {
  electronics: ['無線藍牙耳機', '智慧手錶', '行動電源', 'USB 充電線', '滑鼠', '鍵盤'],
  clothing: ['T恤', '牛仔褲', '運動鞋', '外套', '襯衫', '帽子'],
  food: ['巧克力', '餅乾', '咖啡豆', '茶葉', '堅果', '果乾'],
  books: ['小說', '漫畫', '工具書', '雜誌', '繪本', '字典'],
  sports: ['瑜珈墊', '啞鈴', '跳繩', '運動水壺', '毛巾', '護具'],
};

// 訂單狀態分佈
const ORDER_STATUS_DISTRIBUTION = [
  { status: 'pending', weight: 20 },
  { status: 'processing', weight: 30 },
  { status: 'completed', weight: 40 },
  { status: 'cancelled', weight: 10 },
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
  const domains = ['example.com', 'test.com', 'demo.com'];
  const domain = domains[Math.floor(Math.random() * domains.length)];
  return `user${index}@${domain}`;
}

/**
 * 生成隨機電話
 */
function generatePhone() {
  return `09${Math.floor(Math.random() * 100000000).toString().padStart(8, '0')}`;
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

  return 'pending';
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
 */
async function seedMembers() {
  console.log(`\n📝 開始生成 ${CONFIG.MEMBERS_COUNT} 筆會員資料...`);

  const members = [];

  for (let i = 1; i <= CONFIG.MEMBERS_COUNT; i++) {
    members.push({
      name: generateName(),
      email: generateEmail(i),
      phone: generatePhone(),
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });
  }

  await batchWrite(db.collection('members'), members);

  console.log(`✅ 成功生成 ${CONFIG.MEMBERS_COUNT} 筆會員資料`);

  return members;
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

  await batchWrite(db.collection('products'), products);

  console.log(`✅ 成功生成 ${CONFIG.PRODUCTS_COUNT} 筆商品資料`);

  return products;
}

/**
 * 生成訂單測試資料
 */
async function seedOrders() {
  console.log(`\n📝 開始生成 ${CONFIG.ORDERS_COUNT} 筆訂單資料...`);

  // 取得所有會員 ID
  const membersSnapshot = await db.collection('members').select('__name__').get();
  const memberIds = membersSnapshot.docs.map(doc => doc.id);

  if (memberIds.length === 0) {
    throw new Error('找不到會員資料，請先生成會員資料');
  }

  // 取得所有商品
  const productsSnapshot = await db.collection('products').get();
  const products = productsSnapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data(),
  }));

  if (products.length === 0) {
    throw new Error('找不到商品資料，請先生成商品資料');
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
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const orderNumber = `ORD-${dateStr}-${String(i + 1).padStart(6, '0')}`;

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

  await batchWrite(db.collection('orders'), orders);

  console.log(`✅ 成功生成 ${CONFIG.ORDERS_COUNT} 筆訂單資料`);

  return orders;
}

/**
 * 主函數：生成所有測試資料
 */
async function seedAll() {
  try {
    console.log('\n🚀 開始生成測試資料...\n');
    console.log('配置：');
    console.log(`  - 會員數量: ${CONFIG.MEMBERS_COUNT}`);
    console.log(`  - 訂單數量: ${CONFIG.ORDERS_COUNT}`);
    console.log(`  - 商品數量: ${CONFIG.PRODUCTS_COUNT}`);

    const startTime = Date.now();

    // 生成會員資料
    await seedMembers();

    // 生成商品資料
    await seedProducts();

    // 生成訂單資料
    await seedOrders();

    const duration = ((Date.now() - startTime) / 1000).toFixed(2);

    console.log('\n✅ 所有測試資料生成完成！');
    console.log(`⏱️  總耗時: ${duration} 秒\n`);

    return {
      success: true,
      data: {
        membersCreated: CONFIG.MEMBERS_COUNT,
        ordersCreated: CONFIG.ORDERS_COUNT,
        productsCreated: CONFIG.PRODUCTS_COUNT,
      },
    };
  } catch (error) {
    console.error('\n❌ 生成測試資料失敗:', error.message);
    throw error;
  }
}

// 如果直接執行此腳本
if (require.main === module) {
  seedAll()
    .then(() => {
      console.log('🎉 腳本執行完成');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 腳本執行失敗:', error);
      process.exit(1);
    });
}

module.exports = {
  seedAll,
  seedMembers,
  seedProducts,
  seedOrders,
};
