const mongoose = require('mongoose');

const saleAndServiceSchema = new mongoose.Schema({
  entryType: {
    type: String,
    enum: ['PRODUCT_SALE', 'SERVICE'], // পণ্য বিক্রি নাকি সার্ভিস
    required: true
  },

  // --- যদি PRODUCT_SALE হয় ---
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    default: null // যদি সরাসরি বাইরের দোকান থেকে এনে বিক্রি করে (স্টকে না থাকে), তবে null হতে পারে
  },
  customProductName: {
    type: String, 
    default: '' // স্টকের বাইরে থেকে হুট করে এনে বিক্রি করলে বা প্রোডাক্টের নাম শর্টকাটে লিখলে
  },
  saleChannel: {
    type: String,
    enum: ['RETAIL', 'WHOLESALE', 'NA'], // খুচরা নাকি পাইকারি (সার্ভিসের ক্ষেত্রে NA)
    default: 'RETAIL'
  },
  isDirectFromOutside: {
    type: Boolean,
    default: false // true হলে স্টক থেকে মাইনাস হবে না (পাশের দোকান থেকে এনে সাথে সাথে বিক্রি)
  },

  // --- যদি SERVICE হয় ---
  serviceType: {
    type: String,
    enum: ['BATTERY_CHARGE', 'VULCANIZING', 'AIR', 'OTHER_SERVICE', 'NA'],
    default: 'NA'
  },

  // --- কমন হিসাব (পণ্য ও সার্ভিস উভয়ের জন্য) ---
  quantity: {
    type: Number,
    required: true,
    default: 1,
    min: 1
  },
  unitBuyingPrice: {
    type: Number,
    required: true,
    default: 0,
    min: 0 // সার্ভিসের ক্ষেত্রে কেনা দাম 0, তাই পুরোটাই লাভ
  },
  unitSellingPrice: {
    type: Number,
    required: true,
    min: 0
  },
  totalSellingPrice: {
    type: Number,
    required: true // quantity * unitSellingPrice
  },
  totalBuyingCost: {
    type: Number,
    required: true // quantity * unitBuyingPrice
  },
  profit: {
    type: Number,
    required: true // totalSellingPrice - totalBuyingCost (লস হলে মাইনাস ভ্যালু আসবে)
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    default: '' // যেমন: "করিম ভাইয়ের দোকান (পাইকারি)" বা "প্রাইভেট কার ভলকানাইজিং"
  }
}, { timestamps: true });

// Save করার আগে অটোমেটিক টোটাল এবং লাভ-লস ক্যালকুলেশন
saleAndServiceSchema.pre('validate', function() {
  if (this.entryType === 'SERVICE') {
    this.unitBuyingPrice = 0;
  }
  this.totalBuyingCost = this.quantity * this.unitBuyingPrice;
  this.totalSellingPrice = this.quantity * this.unitSellingPrice;
  this.profit = this.totalSellingPrice - this.totalBuyingCost;
});

module.exports = mongoose.model('SaleAndService', saleAndServiceSchema);