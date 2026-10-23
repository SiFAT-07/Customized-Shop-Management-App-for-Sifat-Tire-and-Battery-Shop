const test = require('node:test');
const assert = require('node:assert/strict');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const controller = require('../controllers/shopController');
const Product = require('../models/Product');
const SaleAndService = require('../models/SaleAndService');

let mongo;

const call = async (handler, body = {}, query = {}, params = {}) => {
  const result = { statusCode: 200, body: null };
  const res = {
    status(code) {
      result.statusCode = code;
      return this;
    },
    json(value) {
      result.body = value;
      return this;
    }
  };
  await handler({ body, query, params }, res);
  return result;
};

test.before(async () => {
  mongo = await MongoMemoryServer.create();
  await mongoose.connect(mongo.getUri(), { dbName: 'shop-tests' });
});

test.after(async () => {
  await mongoose.disconnect();
  await mongo.stop();
});

test.beforeEach(async () => {
  await Promise.all([Product.deleteMany({}), SaleAndService.deleteMany({})]);
});

test('sale stock, edit reconciliation, delete reversal, and profit stay consistent', async () => {
  const product = await Product.create({
    name: 'Test tyre',
    category: 'TIRE',
    condition: 'NEW',
    currentStock: 5,
    defaultBuyingPrice: 100,
    defaultRetailPrice: 150,
    defaultWholesalePrice: 130
  });

  const created = await call(controller.addSaleOrService, {
    entryType: 'PRODUCT_SALE',
    product: product._id,
    saleChannel: 'RETAIL',
    quantity: 2,
    unitBuyingPrice: 100,
    unitSellingPrice: 150,
    date: '2026-10-23'
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.profit, 100);
  assert.equal((await Product.findById(product._id)).currentStock, 3);

  const updated = await call(controller.updateSaleOrService, {
    quantity: 1,
    unitBuyingPrice: 100,
    unitSellingPrice: 130
  }, {}, { id: created.body.data._id });
  assert.equal(updated.statusCode, 200);
  assert.equal(updated.body.data.profit, 30);
  assert.equal((await Product.findById(product._id)).currentStock, 4);

  const deleted = await call(controller.deleteSaleOrService, {}, {}, { id: created.body.data._id });
  assert.equal(deleted.statusCode, 200);
  assert.equal((await Product.findById(product._id)).currentStock, 5);
});

test('services have zero buying cost and local date reports include the entry', async () => {
  const created = await call(controller.addSaleOrService, {
    entryType: 'SERVICE',
    serviceType: 'BATTERY_CHARGE',
    quantity: 1,
    unitSellingPrice: 250,
    date: '2026-10-23'
  });
  assert.equal(created.statusCode, 201);
  assert.equal(created.body.data.totalBuyingCost, 0);
  assert.equal(created.body.data.profit, 250);

  const report = await call(controller.getDailySummary, {}, { date: '2026-10-23' });
  assert.equal(report.statusCode, 200);
  assert.equal(report.body.summary.totalServiceIncome, 250);
  assert.equal(report.body.logs.salesAndServices.length, 1);
});
