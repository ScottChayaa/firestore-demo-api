/**
 * Firebase Console 索引連結解析器測試
 *
 * 測試 parseFirebaseIndexUrl.js 的解析邏輯是否正確
 */

const {
  parseFirebaseIndexUrl,
  extractCollectionGroup,
  convertToFirestoreIndexDefinition
} = require('../src/utils/parseIndexUrl');

describe('Firebase Index URL Parser', () => {
  describe('範例 1: admins collection (deletedAt + isActive + createdAt + __name__)', () => {
    const url = 'https://console.firebase.google.com/u/0/project/liang-dev/firestore/databases/firestore-demo-api/indexes?create_composite=ClFwcm9qZWN0cy9saWFuZy1kZXYvZGF0YWJhc2VzL2ZpcmVzdG9yZS1kZW1vLWFwaS9jb2xsZWN0aW9uR3JvdXBzL2FkbWlucy9pbmRleGVzL18QARoNCglkZWxldGVkQXQQARoMCghpc0FjdGl2ZRABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI';

    it('應該正確解析 collectionGroup', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.collectionGroup).toBe('admins');
    });

    it('應該正確解析欄位列表長度', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields).toHaveLength(4);
    });

    it('應該正確解析 deletedAt (ASCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[0]).toEqual({
        fieldPath: 'deletedAt',
        order: 'ASCENDING'
      });
    });

    it('應該正確解析 isActive (ASCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[1]).toEqual({
        fieldPath: 'isActive',
        order: 'ASCENDING'
      });
    });

    it('應該正確解析 createdAt (DESCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[2]).toEqual({
        fieldPath: 'createdAt',
        order: 'DESCENDING'
      });
    });

    it('應該正確解析 __name__ (DESCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[3]).toEqual({
        fieldPath: '__name__',
        order: 'DESCENDING'
      });
    });

    it('應該能轉換為 Firestore 索引定義格式', () => {
      const result = parseFirebaseIndexUrl(url);
      const indexDef = convertToFirestoreIndexDefinition(result);

      expect(indexDef).toEqual({
        collectionGroup: 'admins',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'deletedAt', order: 'ASCENDING' },
          { fieldPath: 'isActive', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' },
          { fieldPath: '__name__', order: 'DESCENDING' }
        ],
        density: 'SPARSE_ALL'
      });
    });
  });

  describe('範例 2: admins collection (deletedAt + createdAt + __name__)', () => {
    const url = 'https://console.firebase.google.com/v1/r/project/liang-dev/firestore/databases/firestore-demo-api/indexes?create_composite=ClFwcm9qZWN0cy9saWFuZy1kZXYvZGF0YWJhc2VzL2ZpcmVzdG9yZS1kZW1vLWFwaS9jb2xsZWN0aW9uR3JvdXBzL2FkbWlucy9pbmRleGVzL18QARoNCglkZWxldGVkQXQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC';

    it('應該正確解析 collectionGroup', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.collectionGroup).toBe('admins');
    });

    it('應該正確解析欄位列表長度', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields).toHaveLength(3);
    });

    it('應該正確解析 deletedAt (ASCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[0]).toEqual({
        fieldPath: 'deletedAt',
        order: 'ASCENDING'
      });
    });

    it('應該正確解析 createdAt (DESCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[1]).toEqual({
        fieldPath: 'createdAt',
        order: 'DESCENDING'
      });
    });

    it('應該正確解析 __name__ (DESCENDING)', () => {
      const result = parseFirebaseIndexUrl(url);
      expect(result.fields[2]).toEqual({
        fieldPath: '__name__',
        order: 'DESCENDING'
      });
    });

    it('應該能轉換為 Firestore 索引定義格式', () => {
      const result = parseFirebaseIndexUrl(url);
      const indexDef = convertToFirestoreIndexDefinition(result);

      expect(indexDef).toEqual({
        collectionGroup: 'admins',
        queryScope: 'COLLECTION',
        fields: [
          { fieldPath: 'deletedAt', order: 'ASCENDING' },
          { fieldPath: 'createdAt', order: 'DESCENDING' },
          { fieldPath: '__name__', order: 'DESCENDING' }
        ],
        density: 'SPARSE_ALL'
      });
    });
  });

  describe('extractCollectionGroup', () => {
    it('應該正確提取 admins collectionGroup', () => {
      const path = 'projects/liang-dev/databases/firestore-demo-api/collectionGroups/admins/indexes/_';
      expect(extractCollectionGroup(path)).toBe('admins');
    });

    it('應該正確提取 orders collectionGroup', () => {
      const path = 'projects/liang-dev/databases/firestore-demo-api/collectionGroups/orders/indexes/_';
      expect(extractCollectionGroup(path)).toBe('orders');
    });

    it('應該正確提取 members collectionGroup', () => {
      const path = 'projects/liang-dev/databases/firestore-demo-api/collectionGroups/members/indexes/_';
      expect(extractCollectionGroup(path)).toBe('members');
    });

    it('應該正確提取 products collectionGroup', () => {
      const path = 'projects/liang-dev/databases/firestore-demo-api/collectionGroups/products/indexes/_';
      expect(extractCollectionGroup(path)).toBe('products');
    });

    it('應該處理無效路徑', () => {
      const path = 'invalid/path/without/collectionGroups';
      expect(extractCollectionGroup(path)).toBeNull();
    });
  });

  describe('錯誤處理', () => {
    it('應該拋出錯誤當 URL 無效（沒有 create_composite 參數）', () => {
      expect(() => {
        parseFirebaseIndexUrl('https://example.com');
      }).toThrow('Invalid URL: No create_composite parameter found');
    });

    it('應該拋出錯誤當 URL 無效（完全錯誤的格式）', () => {
      expect(() => {
        parseFirebaseIndexUrl('not-a-url');
      }).toThrow('Invalid URL: No create_composite parameter found');
    });

    it('應該處理帶有其他參數的 URL', () => {
      const url = 'https://console.firebase.google.com/indexes?foo=bar&create_composite=ClFwcm9qZWN0cy9saWFuZy1kZXYvZGF0YWJhc2VzL2ZpcmVzdG9yZS1kZW1vLWFwaS9jb2xsZWN0aW9uR3JvdXBzL2FkbWlucy9pbmRleGVzL18QARoNCglkZWxldGVkQXQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC&baz=qux';
      const result = parseFirebaseIndexUrl(url);

      expect(result.collectionGroup).toBe('admins');
      expect(result.fields).toHaveLength(3);
    });
  });

  describe('完整解析驗證', () => {
    it('範例 1 應該產出完整且正確的索引定義', () => {
      const url = 'https://console.firebase.google.com/u/0/project/liang-dev/firestore/databases/firestore-demo-api/indexes?create_composite=ClFwcm9qZWN0cy9saWFuZy1kZXYvZGF0YWJhc2VzL2ZpcmVzdG9yZS1kZW1vLWFwaS9jb2xsZWN0aW9uR3JvdXBzL2FkbWlucy9pbmRleGVzL18QARoNCglkZWxldGVkQXQQARoMCghpc0FjdGl2ZRABGg0KCWNyZWF0ZWRBdBACGgwKCF9fbmFtZV9fEAI';
      const result = parseFirebaseIndexUrl(url);

      // 驗證結構完整性
      expect(result).toHaveProperty('collectionGroup');
      expect(result).toHaveProperty('fields');
      expect(Array.isArray(result.fields)).toBe(true);

      // 驗證每個欄位都有必要屬性
      result.fields.forEach(field => {
        expect(field).toHaveProperty('fieldPath');
        expect(field).toHaveProperty('order');
        expect(typeof field.fieldPath).toBe('string');
        expect(['ASCENDING', 'DESCENDING']).toContain(field.order);
      });

      // 驗證欄位數量
      expect(result.fields.length).toBe(4);

      // 驗證具體欄位值
      expect(result.collectionGroup).toBe('admins');
      expect(result.fields[0].fieldPath).toBe('deletedAt');
      expect(result.fields[1].fieldPath).toBe('isActive');
      expect(result.fields[2].fieldPath).toBe('createdAt');
      expect(result.fields[3].fieldPath).toBe('__name__');

      // 驗證排序方向
      expect(result.fields[0].order).toBe('ASCENDING');
      expect(result.fields[1].order).toBe('ASCENDING');
      expect(result.fields[2].order).toBe('DESCENDING');
      expect(result.fields[3].order).toBe('DESCENDING');
    });

    it('範例 2 應該產出完整且正確的索引定義', () => {
      const url = 'https://console.firebase.google.com/v1/r/project/liang-dev/firestore/databases/firestore-demo-api/indexes?create_composite=ClFwcm9qZWN0cy9saWFuZy1kZXYvZGF0YWJhc2VzL2ZpcmVzdG9yZS1kZW1vLWFwaS9jb2xsZWN0aW9uR3JvdXBzL2FkbWlucy9pbmRleGVzL18QARoNCglkZWxldGVkQXQQARoNCgljcmVhdGVkQXQQAhoMCghfX25hbWVfXxAC';
      const result = parseFirebaseIndexUrl(url);

      // 驗證結構完整性
      expect(result).toHaveProperty('collectionGroup');
      expect(result).toHaveProperty('fields');
      expect(Array.isArray(result.fields)).toBe(true);

      // 驗證每個欄位都有必要屬性
      result.fields.forEach(field => {
        expect(field).toHaveProperty('fieldPath');
        expect(field).toHaveProperty('order');
        expect(typeof field.fieldPath).toBe('string');
        expect(['ASCENDING', 'DESCENDING']).toContain(field.order);
      });

      // 驗證欄位數量
      expect(result.fields.length).toBe(3);

      // 驗證具體欄位值
      expect(result.collectionGroup).toBe('admins');
      expect(result.fields[0].fieldPath).toBe('deletedAt');
      expect(result.fields[1].fieldPath).toBe('createdAt');
      expect(result.fields[2].fieldPath).toBe('__name__');

      // 驗證排序方向
      expect(result.fields[0].order).toBe('ASCENDING');
      expect(result.fields[1].order).toBe('DESCENDING');
      expect(result.fields[2].order).toBe('DESCENDING');
    });
  });
});
