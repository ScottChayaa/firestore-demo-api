const request = require("supertest");
const app = require("../../src/app");
const logger = require('../../src/config/logger');

describe("MyTest", () => {
  test("測試項目1", async () => {
    
    const url = `/api/products?limit=1`;

    const res = await request(app).get(url);
    
    logger.info("hihihi");

    expect(true).toBe(true);
  });
  
  test("測試項目2", async () => {
    
    const url = `/api/products?limit=1`;

    const res = await request(app).get(url);
    
    logger.info("hihihi");
    
    expect(true).toBe(true);
  });
});
