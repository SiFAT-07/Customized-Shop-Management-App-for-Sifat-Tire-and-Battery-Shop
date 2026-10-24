const Product = require('../models/Product');
const StockPurchase = require('../models/StockPurchase');
const SaleAndService = require('../models/SaleAndService');
const Expense = require('../models/Expense');

const isFiniteNumber = (value) => Number.isFinite(Number(value));

const parseDate = (value) => {
  if (!value) return new Date();
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(year, month - 1, day);
    if (parsed.getFullYear() !== year || parsed.getMonth() !== month - 1 || parsed.getDate() !== day) {
      throw new Error('তারিখটি সঠিক নয়।');
    }
    return parsed;
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) throw new Error('তারিখটি সঠিক নয়।');
  return parsed;
};

// Local calendar boundaries are used consistently with the date entered in the UI.
const getDayBounds = (dateString) => {
  const target = parseDate(dateString);
  const start = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 0, 0, 0, 0);
  const end = new Date(target.getFullYear(), target.getMonth(), target.getDate(), 23, 59, 59, 999);
  return { start, end };
};

const getLocalDateKey = (date) => {
  const value = new Date(date);
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const changeStock = async (productId, delta) => {
  const filter = { _id: productId };
  if (delta < 0) filter.currentStock = { $gte: -delta };
  const product = await Product.findOneAndUpdate(
    filter,
    { $inc: { currentStock: delta } },
    { new: true, runValidators: true }
  );
  if (!product) {
    const exists = await Product.exists({ _id: productId });
    throw new Error(exists ? 'পর্যাপ্ত স্টক নেই!' : 'পণ্যটি পাওয়া যায়নি!');
  }
  return product;
};

const validateSaleInput = (data) => {
  const entryType = data.entryType;
  if (!['PRODUCT_SALE', 'SERVICE'].includes(entryType)) throw new Error('এন্ট্রির ধরন সঠিক নয়।');
  const quantity = Number(data.quantity);
  const sellingPrice = Number(data.unitSellingPrice);
  if (!Number.isInteger(quantity) || quantity < 1) throw new Error('পরিমাণ কমপক্ষে ১ হতে হবে।');
  if (!isFiniteNumber(sellingPrice) || sellingPrice < 0) throw new Error('বিক্রির দাম সঠিক নয়।');
  if (entryType === 'SERVICE') {
    if (!['BATTERY_CHARGE', 'VULCANIZING', 'OTHER_SERVICE'].includes(data.serviceType)) {
      throw new Error('সার্ভিসের ধরন সঠিক নয়।');
    }
  } else {
    if (!data.isDirectFromOutside && !data.product) throw new Error('স্টকের পণ্য নির্বাচন করুন।');
    if (data.isDirectFromOutside && !String(data.customProductName || '').trim()) {
      throw new Error('বাইরের পণ্যের নাম লিখুন।');
    }
    if (!isFiniteNumber(data.unitBuyingPrice) || Number(data.unitBuyingPrice) < 0) {
      throw new Error('কেনা দাম সঠিক নয়।');
    }
  }
  if (data.date) parseDate(data.date);
};

// ==========================================
// ১. PRODUCT & STOCK MANAGEMENT (পণ্য ও স্টক)
// ==========================================

// সব পণ্যের তালিকা দেখা (Category বা Condition দিয়ে ফিল্টার করার সুবিধা সহ)
exports.getProducts = async (req, res) => {
  try {
    const { category, condition } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (condition) filter.condition = condition;

    const products = await Product.find(filter).sort({ category: 1, name: 1 });
    res.json({ success: true, data: products });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// নতুন পণ্যের নাম তালিকায় যোগ করা (Initial Setup বা নতুন আইটেম)
exports.createProduct = async (req, res) => {
  try {
    const product = await Product.create(req.body);
    res.status(201).json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// Product master details update; stock is intentionally not changed here.
exports.updateProduct = async (req, res) => {
  try {
    const allowedFields = [
      'name', 'category', 'subCategory', 'condition', 'defaultBuyingPrice',
      'defaultRetailPrice', 'defaultWholesalePrice', 'lowStockAlert'
    ];
    const updates = {};
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) updates[field] = req.body[field];
    }
    if (updates.name !== undefined && !String(updates.name).trim()) {
      return res.status(400).json({ success: false, message: 'পণ্যের নাম দিন।' });
    }
    if (updates.name !== undefined) updates.name = String(updates.name).trim();
    for (const field of ['defaultBuyingPrice', 'defaultRetailPrice', 'defaultWholesalePrice', 'lowStockAlert']) {
      if (updates[field] !== undefined && (!isFiniteNumber(updates[field]) || Number(updates[field]) < 0)) {
        return res.status(400).json({ success: false, message: 'দাম বা স্টক সতর্কতার মান সঠিক নয়।' });
      }
      if (updates[field] !== undefined) updates[field] = Number(updates[field]);
    }
    const product = await Product.findByIdAndUpdate(
      req.params.id,
      updates,
      { new: true, runValidators: true }
    );
    if (!product) return res.status(404).json({ success: false, message: 'পণ্যটি পাওয়া যায়নি!' });
    res.json({ success: true, data: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// দোকানে মাল তোলা / স্টক যোগ করা (Stock In)
exports.addStockPurchase = async (req, res) => {
  try {
    const { productId, sourceType, supplierName, quantity, unitBuyingPrice, newRetailPrice, newWholesalePrice, note, date } = req.body;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).json({ success: false, message: 'পণ্যটি পাওয়া যায়নি!' });

    const qty = Number(quantity);
    const buyPrice = Number(unitBuyingPrice);
    if (!Number.isInteger(qty) || qty < 1) {
      return res.status(400).json({ success: false, message: 'পরিমাণ কমপক্ষে ১ হতে হবে।' });
    }
    if (!isFiniteNumber(buyPrice) || buyPrice < 0) {
      return res.status(400).json({ success: false, message: 'কেনা দাম সঠিক নয়।' });
    }
    if (!sourceType) return res.status(400).json({ success: false, message: 'মালের উৎস নির্বাচন করুন।' });

    // ১. স্টক রেকর্ড তৈরি
    const purchase = await StockPurchase.create({
      product: productId,
      sourceType,
      supplierName,
      quantity: qty,
      unitBuyingPrice: buyPrice,
      totalCost: qty * buyPrice,
      date: date || Date.now(),
      note
    });

    // ২. মেইন প্রোডাক্টের স্টক বাড়ানো এবং সর্বশেষ কেনা দাম আপডেট করা
    product.currentStock += qty;
    product.defaultBuyingPrice = buyPrice;
    if (newRetailPrice !== undefined && newRetailPrice !== '') {
      if (!isFiniteNumber(newRetailPrice) || Number(newRetailPrice) < 0) {
        await purchase.deleteOne();
        return res.status(400).json({ success: false, message: 'খুচরা দাম সঠিক নয়।' });
      }
      product.defaultRetailPrice = Number(newRetailPrice);
    }
    if (newWholesalePrice !== undefined && newWholesalePrice !== '') {
      if (!isFiniteNumber(newWholesalePrice) || Number(newWholesalePrice) < 0) {
        await purchase.deleteOne();
        return res.status(400).json({ success: false, message: 'পাইকারি দাম সঠিক নয়।' });
      }
      product.defaultWholesalePrice = Number(newWholesalePrice);
    }
    try {
      await product.save();
    } catch (error) {
      await purchase.deleteOne();
      throw error;
    }

    res.status(201).json({ success: true, data: purchase, updatedProduct: product });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// স্টক এন্ট্রি ডিলিট করলে স্টক আবার মাইনাস হয়ে যাবে (ভুল সংশোধনের জন্য)
exports.deleteStockPurchase = async (req, res) => {
  try {
    const purchase = await StockPurchase.findById(req.params.id);
    if (!purchase) return res.status(404).json({ success: false, message: 'স্টক এন্ট্রি পাওয়া যায়নি!' });

    const product = await Product.findById(purchase.product);
    if (product) await changeStock(purchase.product, -purchase.quantity);
    try {
      await purchase.deleteOne();
    } catch (error) {
      if (product) await changeStock(purchase.product, purchase.quantity);
      throw error;
    }
    res.json({ success: true, message: 'স্টক এন্ট্রি ডিলিট হয়েছে এবং স্টক সমন্বয় করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ==========================================
// ২. SALES & SERVICES (বিক্রি ও সার্ভিস + অটো স্টক রিভার্সাল)
// ==========================================

// নতুন বিক্রি বা সার্ভিস যোগ করা
exports.addSaleOrService = async (req, res) => {
  try {
    const {
      entryType, product: productId, customProductName,
      saleChannel, isDirectFromOutside, serviceType,
      quantity, unitBuyingPrice, unitSellingPrice, date, note
    } = req.body;

    validateSaleInput(req.body);
    const qty = Number(quantity);
    let stockChanged = false;

    // যদি পণ্য বিক্রি হয় এবং বাইরের দোকান থেকে সরাসরি না এনে নিজের স্টক থেকে বিক্রি হয়
    if (entryType === 'PRODUCT_SALE' && !isDirectFromOutside && productId) {
      await changeStock(productId, -qty);
      stockChanged = true;
    }

    let entry;
    try {
      entry = await SaleAndService.create({
      entryType,
      product: productId || null,
      customProductName,
      saleChannel: entryType === 'SERVICE' ? 'NA' : saleChannel,
      isDirectFromOutside: Boolean(isDirectFromOutside),
      serviceType: entryType === 'SERVICE' ? serviceType : 'NA',
      quantity: qty,
      unitBuyingPrice: entryType === 'SERVICE' ? 0 : Number(unitBuyingPrice),
      unitSellingPrice: Number(unitSellingPrice),
      date: date || Date.now(),
      note
      });
    } catch (error) {
      if (stockChanged) await changeStock(productId, qty);
      throw error;
    }

    const populatedEntry = await entry.populate('product', 'name category condition currentStock');
    res.status(201).json({ success: true, data: populatedEntry });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// বিক্রি বা সার্ভিস এডিট করা (আব্বু ভুল সংশোধন করলে স্টক ও লাভ অটো অ্যাডজাস্ট হবে)
exports.updateSaleOrService = async (req, res) => {
  try {
    const oldEntry = await SaleAndService.findById(req.params.id);
    if (!oldEntry) return res.status(404).json({ success: false, message: 'হিসাবটি পাওয়া যায়নি!' });
    if (req.body.entryType && req.body.entryType !== oldEntry.entryType) {
      return res.status(400).json({ success: false, message: 'এন্ট্রির ধরন এডিট করা যাবে না।' });
    }

    const nextData = { ...oldEntry.toObject(), ...req.body, entryType: oldEntry.entryType };
    validateSaleInput(nextData);
    const oldStockProductId = oldEntry.entryType === 'PRODUCT_SALE' && !oldEntry.isDirectFromOutside
      ? String(oldEntry.product || '') : null;
    const oldQuantity = oldEntry.quantity;
    const nextStockProductId = nextData.entryType === 'PRODUCT_SALE' && !nextData.isDirectFromOutside
      ? String(nextData.product || '') : null;
    if (nextStockProductId && !mongoose.isValidObjectId(nextStockProductId)) {
      return res.status(400).json({ success: false, message: 'পণ্য আইডি সঠিক নয়।' });
    }

    // ধাপ ১: আগে যদি স্টক থেকে মাল কমে থাকে, তবে সেই স্টকটা আগে ফেরত (Restore) দেওয়া
    if (oldStockProductId) await changeStock(oldStockProductId, oldEntry.quantity);

    // ধাপ ২: নতুন ডাটা আপডেট করা
    const allowedFields = [
      'product', 'customProductName', 'saleChannel', 'isDirectFromOutside',
      'serviceType', 'quantity', 'unitBuyingPrice', 'unitSellingPrice', 'date', 'note'
    ];
    for (const field of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, field)) oldEntry[field] = req.body[field];
    }
    
    // pre-validate হুক অটোমেটিক নতুন লাভ (profit) হিসাব করে ফেলবে
    let savedEntry;
    let nextStockChanged = false;
    try {
      if (nextStockProductId) {
        await changeStock(nextStockProductId, -nextData.quantity);
        nextStockChanged = true;
      }
      savedEntry = await oldEntry.save();
    } catch (error) {
      if (nextStockChanged) await changeStock(nextStockProductId, nextData.quantity);
      if (oldStockProductId) await changeStock(oldStockProductId, -oldQuantity);
      throw error;
    }

    // ধাপ ৩: নতুন ডাটা অনুযায়ী আবার স্টক থেকে মাইনাস করা
    const populated = await savedEntry.populate('product', 'name category condition currentStock');
    res.json({ success: true, data: populated, message: 'হিসাব সংশোধন করা হয়েছে!' });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

// বিক্রি বা সার্ভিস ডিলিট করা (স্টক অটোমেটিক ফেরত যাবে)
exports.deleteSaleOrService = async (req, res) => {
  try {
    const entry = await SaleAndService.findById(req.params.id);
    if (!entry) return res.status(404).json({ success: false, message: 'হিসাবটি পাওয়া যায়নি!' });

    // যদি স্টক থেকে বিক্রি হয়ে থাকে, তবে ডিলিট করলে স্টকে মাল ফেরত যোগ হবে
    const shouldRestoreStock = entry.entryType === 'PRODUCT_SALE' && !entry.isDirectFromOutside && entry.product;
    if (shouldRestoreStock) await changeStock(entry.product, entry.quantity);
    try {
      await entry.deleteOne();
    } catch (error) {
      if (shouldRestoreStock) await changeStock(entry.product, -entry.quantity);
      throw error;
    }
    res.json({ success: true, message: 'হিসাবটি মুছে ফেলা হয়েছে এবং স্টক ঠিক করা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};


// ==========================================
// ৩. EXPENSES (দোকানের খরচ: দৈনিক ও মাসিক)
// ==========================================

exports.addExpense = async (req, res) => {
  try {
    if (!req.body.expenseType || !req.body.category || !isFiniteNumber(req.body.amount) || Number(req.body.amount) < 0) {
      return res.status(400).json({ success: false, message: 'খরচের ধরন, খাত এবং সঠিক পরিমাণ দিন।' });
    }
    if (req.body.date) parseDate(req.body.date);
    const expense = await Expense.create(req.body);
    res.status(201).json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.updateExpense = async (req, res) => {
  try {
    if (req.body.amount !== undefined && (!isFiniteNumber(req.body.amount) || Number(req.body.amount) < 0)) {
      return res.status(400).json({ success: false, message: 'খরচের পরিমাণ সঠিক নয়।' });
    }
    if (req.body.date) parseDate(req.body.date);
    const expense = await Expense.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!expense) return res.status(404).json({ success: false, message: 'খরচের হিসাব পাওয়া যায়নি!' });
    res.json({ success: true, data: expense });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};

exports.deleteExpense = async (req, res) => {
  try {
    const deleted = await Expense.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ success: false, message: 'খরচের হিসাব পাওয়া যায়নি!' });
    res.json({ success: true, message: 'খরচের হিসাব মুছে ফেলা হয়েছে।' });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// Expense report with local date-range and category filters.
exports.getExpenses = async (req, res) => {
  try {
    const { startDate, endDate, category } = req.query;
    const filter = {};
    if (startDate || endDate) {
      const range = {};
      if (startDate) range.$gte = getDayBounds(startDate).start;
      if (endDate) range.$lte = getDayBounds(endDate).end;
      if (range.$gte && range.$lte && range.$gte > range.$lte) {
        return res.status(400).json({ success: false, message: 'শুরুর তারিখ শেষের তারিখের পরে হতে পারবে না।' });
      }
      filter.date = range;
    }
    if (category && category !== 'ALL') filter.category = category;

    const expenses = await Expense.find(filter).sort({ date: -1, createdAt: -1 });
    const totalAmount = expenses.reduce((sum, expense) => sum + expense.amount, 0);
    res.json({
      success: true,
      data: expenses,
      summary: { totalCount: expenses.length, totalAmount }
    });
  } catch (err) {
    res.status(400).json({ success: false, message: err.message });
  }
};


// ==========================================
// ৪. REPORTS: প্রতিদিনের হিসাব ও মাস শেষের হিসাব
// ==========================================

// প্রতিদিনের ড্যাশবোর্ড সামারি (Today's / Selected Date's Summary)
exports.getDailySummary = async (req, res) => {
  try {
    const { date } = req.query; // YYYY-MM-DD (না দিলে আজকের তারিখ)
    const { start, end } = getDayBounds(date);

    // আজকের সব বিক্রি ও সার্ভিস
    const salesAndServices = await SaleAndService.find({
      date: { $gte: start, $lte: end }
    }).populate('product', 'name category condition').sort({ createdAt: -1 });

    // আজকের সব খরচ (শুধুমাত্র DAILY খরচগুলো প্রতিদিনের ক্যাশ থেকে বাদ যাবে, আর সব লিস্টে দেখাবে)
    const expenses = await Expense.find({
      date: { $gte: start, $lte: end }
    }).sort({ createdAt: -1 });

    // আজকের স্টক কেনা (ঐচ্ছিক লিস্টের জন্য)
    const stockPurchases = await StockPurchase.find({
      date: { $gte: start, $lte: end }
    }).populate('product', 'name category condition').sort({ createdAt: -1 });

    // হিসাব নিকাশ
    let totalProductSales = 0;
    let totalProductProfit = 0;
    let totalServiceIncome = 0;

    salesAndServices.forEach(item => {
      if (item.entryType === 'PRODUCT_SALE') {
        totalProductSales += item.totalSellingPrice;
        totalProductProfit += item.profit;
      } else if (item.entryType === 'SERVICE') {
        totalServiceIncome += item.totalSellingPrice; // সার্ভিসে পুরোটাই লাভ
      }
    });

    const totalDailyExpenses = expenses
      .filter(e => e.expenseType === 'DAILY')
      .reduce((sum, e) => sum + e.amount, 0);

    const totalGrossProfit = totalProductProfit + totalServiceIncome;
    const netDailyProfit = totalGrossProfit - totalDailyExpenses;
    const cashInHandToday = (totalProductSales + totalServiceIncome) - totalDailyExpenses;

    res.json({
      success: true,
      summary: {
        totalSalesRevenue: totalProductSales + totalServiceIncome,
        totalProductSales,
        totalProductProfit,
        totalServiceIncome,
        totalGrossProfit,      // আজকের মোট লাভ (খরচ বাদ দেওয়ার আগে)
        totalDailyExpenses,    // আজকের দোকানের খরচ
        netDailyProfit,        // খরচ বাদে আজকের নিট লাভ
        cashInHandToday        // আজকের মোট ক্যাশ (বিক্রি - দৈনিক খরচ)
      },
      logs: {
        salesAndServices,
        expenses,
        stockPurchases
      }
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};

// মাস শেষের চূড়ান্ত হিসাব (Monthly Complete Report)
exports.getMonthlyReport = async (req, res) => {
  try {
    const year = Number(req.query.year) || new Date().getFullYear();
    const month = Number(req.query.month) || (new Date().getMonth() + 1); // 1 = Jan, 10 = Oct
    if (!Number.isInteger(year) || year < 1970 || !Number.isInteger(month) || month < 1 || month > 12) {
      return res.status(400).json({ success: false, message: 'মাস বা বছর সঠিক নয়।' });
    }

    const startOfMonth = new Date(year, month - 1, 1, 0, 0, 0, 0);
    const endOfMonth = new Date(year, month, 0, 23, 59, 59, 999);

    const sales = await SaleAndService.find({ date: { $gte: startOfMonth, $lte: endOfMonth } });
    const expenses = await Expense.find({ date: { $gte: startOfMonth, $lte: endOfMonth } });

    let productSalesRevenue = 0;
    let productProfit = 0;
    let batteryChargeIncome = 0;
    let vulcanizingIncome = 0;

    // প্রতিদিনের ব্রেকডাউন টেবিলের জন্য ম্যাপ
    const dailyMap = {};

    sales.forEach(s => {
      const dayKey = getLocalDateKey(s.date);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, sales: 0, grossProfit: 0, dailyExpense: 0, netProfit: 0 };
      }

      dailyMap[dayKey].sales += s.totalSellingPrice;
      dailyMap[dayKey].grossProfit += s.profit;

      if (s.entryType === 'PRODUCT_SALE') {
        productSalesRevenue += s.totalSellingPrice;
        productProfit += s.profit;
      } else {
        if (s.serviceType === 'BATTERY_CHARGE') batteryChargeIncome += s.totalSellingPrice;
        else vulcanizingIncome += s.totalSellingPrice;
      }
    });

    let totalDailyExpenses = 0;
    let totalMonthlyFixedExpenses = 0;
    const fixedExpenseBreakdown = {
      SHOP_RENT: 0,
      STAFF_SALARY: 0,
      ELECTRICITY_BILL: 0,
      OTHER_MONTHLY: 0
    };

    expenses.forEach(e => {
      const dayKey = getLocalDateKey(e.date);
      if (!dailyMap[dayKey]) {
        dailyMap[dayKey] = { date: dayKey, sales: 0, grossProfit: 0, dailyExpense: 0, netProfit: 0 };
      }

      if (e.expenseType === 'DAILY') {
        totalDailyExpenses += e.amount;
        dailyMap[dayKey].dailyExpense += e.amount;
      } else if (e.expenseType === 'MONTHLY_FIXED') {
        totalMonthlyFixedExpenses += e.amount;
        fixedExpenseBreakdown[e.category] = (fixedExpenseBreakdown[e.category] || 0) + e.amount;
      }
    });

    // প্রতিদিনের নিট লাভ আপডেট করা
    const dailyBreakdown = Object.values(dailyMap)
      .map(d => ({ ...d, netProfit: d.grossProfit - d.dailyExpense }))
      .sort((a, b) => new Date(b.date) - new Date(a.date));

    const totalServiceIncome = batteryChargeIncome + vulcanizingIncome;
    const totalGrossProfit = productProfit + totalServiceIncome;
    const totalAllExpenses = totalDailyExpenses + totalMonthlyFixedExpenses;
    const finalMonthlyNetProfit = totalGrossProfit - totalAllExpenses;

    res.json({
      success: true,
      month,
      year,
      report: {
        productSalesRevenue,
        productProfit,
        batteryChargeIncome,
        vulcanizingIncome,
        totalServiceIncome,
        totalGrossProfit,          // মোট লাভ (পণ্য লাভ + সার্ভিস আয়)
        totalDailyExpenses,        // মাসের মোট খুচরা খরচ
        totalMonthlyFixedExpenses, // দোকান ভাড়া + কর্মচারী বেতন + কারেন্ট বিল
        fixedExpenseBreakdown,     // ভাড়ার খাত, বেতনের খাত আলাদা দেখানোর জন্য
        totalAllExpenses,          // সর্বমোট খরচ
        finalMonthlyNetProfit      // মাস শেষে চূড়ান্ত নিট লাভ বা লস
      },
      dailyBreakdown
    });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
};