const mongoose = require('mongoose');

const stockPurchaseSchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  sourceType: {
    type: String,
    enum: ['DEALERSHIP', 'EXTERNAL_SHOP', 'OLD_CUSTOMER_BUY'], // ডিলার, বাইরের দোকান, বা কাস্টমার থেকে পুরাতন কেনা
    required: true
  },
  supplierName: {
    type: String,
    trim: true,
    default: '' // যেমন: "রহিম ট্রেডার্স" বা "ডিলার" (অপশনাল)
  },
  quantity: {
    type: Number,
    required: true,
    min: 1
  },
  unitBuyingPrice: {
    type: Number,
    required: true
  },
  totalCost: {
    type: Number,
    required: true // quantity * unitBuyingPrice
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true
  }
}, { timestamps: true });

module.exports = mongoose.model('StockPurchase', stockPurchaseSchema);