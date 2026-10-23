const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  name: { 
    type: String, 
    required: true, 
    trim: true 
    // উদাহরণ: "Maxxis 185/65 R15", "Hamko 100Ah IPS Battery", "Mobil Super 1000 4L"
  },
  category: {
    type: String,
    required: true,
    enum: ['TIRE', 'BATTERY', 'TUBE', 'MOBIL', 'BATTERY_WATER']
  },
  subCategory: {
    type: String,
    enum: ['PRIVATE_CAR_TIRE', 'CAR_BATTERY', 'IPS_BATTERY', 'SOLAR_BATTERY', 'GENERAL', 'NONE'],
    default: 'GENERAL'
  },
  condition: {
    type: String,
    enum: ['NEW', 'OLD', 'NA'], // মবিল বা পানির ক্ষেত্রে 'NA'
    default: 'NEW'
  },
  currentStock: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  // সর্বশেষ কেনা দাম (বিক্রির সময় অটো-ফিল হওয়ার জন্য, তবে আব্বু চাইলে বিক্রির সময় এডিট করতে পারবেন)
  defaultBuyingPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0
  },
  defaultRetailPrice: {
    type: Number,
    default: 0,
    min: 0
  },
  defaultWholesalePrice: {
    type: Number,
    default: 0,
    min: 0
  },
  lowStockAlert: {
    type: Number,
    default: 2 // স্টক ২ এর নিচে নামলে লাল সিগন্যাল দেখাবে
  }
}, { timestamps: true });

module.exports = mongoose.model('Product', productSchema);