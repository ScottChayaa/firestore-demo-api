/**
 * 認證工具
 *
 * 功能：
 * 1. 取得管理員登入 Token（用於腳本和測試）
 * 2. 快取 Token 以避免重複登入
 */

const request = require('supertest');
const app = require('@/app');

let cachedAdminToken = null;

/**
 * 取得管理員登入 Token
 *
 * @returns {Promise<string>} Token (不含 "Bearer " 前綴)
 */
async function getAdminToken() {
  if (cachedAdminToken) {
    return cachedAdminToken;
  }

  const res = await request(app)
    .post('/api/auth/admin/signInWithPassword')
    .send({
      email: process.env.TEST_ADMIN_EMAIL || 'admin@example.com',
      password: process.env.TEST_ADMIN_PASSWORD || 'qwer1234',
    });

  if (res.status !== 200 || !res.body.data || !res.body.data.idToken) {
    throw new Error(`無法取得管理員 Token: ${JSON.stringify(res.body)}`);
  }

  cachedAdminToken = res.body.data.idToken;
  return cachedAdminToken;
}

/**
 * 清除快取的 Token
 */
function clearCachedToken() {
  cachedAdminToken = null;
}

module.exports = {
  getAdminToken,
  clearCachedToken,
};
