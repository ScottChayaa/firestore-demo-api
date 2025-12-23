/**
 * Firebase Console 索引連結解析器
 *
 * 解析 Firebase Console 中 create_composite 參數的 Protocol Buffer 編碼
 *
 * Protocol Buffer 編碼規則：
 * - Wire Type 0: Varint（整數）
 * - Wire Type 2: Length-delimited（字串、bytes、嵌套消息）
 * - Tag = (field_number << 3) | wire_type
 *
 * 索引定義結構：
 * - Field 1: 資源路徑（包含 collectionGroup）
 * - Field 2: 查詢範圍（通常是 1）
 * - Field 3: 欄位定義列表（重複）
 *
 * 欄位定義結構：
 * - Field 1: 欄位名稱（string）
 * - Field 2: 排序方向（1 = ASCENDING, 2 = DESCENDING）
 */

const ORDERS = {
  1: 'ASCENDING',
  2: 'DESCENDING'
};

/**
 * 解析 Firebase Console 索引創建連結
 * @param {string} url - Firebase Console 索引創建連結
 * @returns {Object} 解析結果 { collectionGroup, fields }
 *
 * @example
 * const url = 'https://console.firebase.google.com/.../indexes?create_composite=ClF...';
 * const result = parseFirebaseIndexUrl(url);
 * // { collectionGroup: 'admins', fields: [...] }
 */
function parseFirebaseIndexUrl(url) {
  // 1. 提取 create_composite 參數
  const match = url.match(/create_composite=([^&]+)/);
  if (!match) {
    throw new Error('Invalid URL: No create_composite parameter found');
  }

  const base64Data = decodeURIComponent(match[1]);

  // 2. Base64 解碼
  const buffer = Buffer.from(base64Data, 'base64');

  // 3. 解析 Protocol Buffer
  return parseProtobuf(buffer);
}

/**
 * 解析 Protocol Buffer 編碼的索引定義
 * @param {Buffer} buffer - 二進制數據
 * @returns {Object} { collectionGroup, fields }
 * 
 * @example
 * {
 *   collectionGroup: 'admins',
 *   fields: [
 *     { fieldPath: 'deletedAt', order: 'ASCENDING' },
 *     { fieldPath: 'isActive', order: 'ASCENDING' },
 *     { fieldPath: 'createdAt', order: 'DESCENDING' },
 *     { fieldPath: '__name__', order: 'DESCENDING' }
 *   ]
 * }
 */
function parseProtobuf(buffer) {
  let result = {};
  let offset = 0;
  let collectionGroup = null;
  const fields = [];

  while (offset < buffer.length) {
    // 讀取 Tag (field number + wire type)
    const tag = readVarint(buffer, offset);
    offset = tag.offset;

    const fieldNumber = tag.value >>> 3;
    const wireType = tag.value & 0x07;

    if (wireType === 2) {  // Length-delimited (string/bytes/embedded message)
      const length = readVarint(buffer, offset);
      offset = length.offset;

      const data = buffer.slice(offset, offset + length.value);
      offset += length.value;

      if (fieldNumber === 1) {
        // 第一個欄位是資源路徑
        const path = data.toString('utf8');
        collectionGroup = extractCollectionGroup(path);
      } else if (fieldNumber === 3) {
        // 欄位 3 是索引欄位定義（可能重複多次）
        const field = parseField(data);
        fields.push(field);
      }
    } else if (wireType === 0) {  // Varint
      const value = readVarint(buffer, offset);
      offset = value.offset;
      // 忽略其他 Varint 欄位（如 queryScope）
    }
  }

  result = { collectionGroup, fields };
  
  // console.log('result', result);

  return result;
}

/**
 * 解析單一欄位定義
 * @param {Buffer} buffer - 欄位數據
 * @returns {Object} { fieldPath, order }
 */
function parseField(buffer) {
  let offset = 0;
  let fieldPath = null;
  let order = null;

  while (offset < buffer.length) {
    const tag = readVarint(buffer, offset);
    offset = tag.offset;

    const fieldNumber = tag.value >>> 3;
    const wireType = tag.value & 0x07;

    if (wireType === 2) {  // String (欄位名稱)
      const length = readVarint(buffer, offset);
      offset = length.offset;

      fieldPath = buffer.slice(offset, offset + length.value).toString('utf8');
      offset += length.value;
    } else if (wireType === 0) {  // Varint (排序方向)
      const value = readVarint(buffer, offset);
      offset = value.offset;

      if (fieldNumber === 2) {
        // Field 2 是排序方向
        order = ORDERS[value.value] || 'UNKNOWN';
      }
    }
  }

  return { fieldPath, order };
}

/**
 * 讀取 Varint 編碼的整數
 *
 * Varint 編碼規則：
 * - 每個 byte 使用 7 bits 存儲數值
 * - 最高位（MSB）表示是否還有後續 byte
 * - 0x80 = 0b10000000（MSB = 1，表示繼續）
 * - 0x7F = 0b01111111（數據位元遮罩）
 *
 * @param {Buffer} buffer - 數據緩衝區
 * @param {number} offset - 起始位置
 * @returns {Object} { value, offset }
 *
 * @example
 * // 0x01 = 1
 * // 0x7F = 127
 * // 0x80 0x01 = 128
 */
function readVarint(buffer, offset) {
  let value = 0;
  let shift = 0;

  while (offset < buffer.length) {
    const byte = buffer[offset++];
    value |= (byte & 0x7F) << shift;

    // 如果 MSB 為 0，表示這是最後一個 byte
    if ((byte & 0x80) === 0) {
      break;
    }

    shift += 7;
  }

  return { value, offset };
}

/**
 * 從資源路徑提取 collectionGroup
 * @param {string} path - 資源路徑
 * @returns {string} collectionGroup 名稱
 *
 * @example
 * // Input: "projects/liang-dev/databases/(default)/collectionGroups/admins/indexes/_"
 * // Output: "admins"
 */
function extractCollectionGroup(path) {
  // projects/.../collectionGroups/admins/indexes/...
  const match = path.match(/collectionGroups\/([^/]+)/);
  return match ? match[1] : null;
}

/**
 * 將解析結果轉換為 Firestore 索引定義格式
 * @param {Object} parsed - 解析結果
 * @returns {Object} Firestore 索引定義
 */
function convertToFirestoreIndexDefinition(parsed) {
  return {
    collectionGroup: parsed.collectionGroup,
    queryScope: 'COLLECTION',
    fields: parsed.fields.map(f => ({
      fieldPath: f.fieldPath,
      order: f.order
    })),
    density: 'SPARSE_ALL'
  };
}

module.exports = {
  parseFirebaseIndexUrl,
  parseProtobuf,
  parseField,
  readVarint,
  extractCollectionGroup,
  convertToFirestoreIndexDefinition
};
