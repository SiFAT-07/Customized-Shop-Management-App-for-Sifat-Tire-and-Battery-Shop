const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  expenseType: {
    type: String,
    enum: ['DAILY', 'MONTHLY_FIXED'], // প্রতিদিনের খরচ নাকি মাসিক নির্দিষ্ট খরচ
    required: true
  },
  category: {
    type: String,
    required: true,
    enum: [
      // DAILY Categories
      'TEA_SNACKS',      // চা-নাস্তা
      'TRANSPORT',       // মাল আনা-নেওয়া / ভ্যান ভাড়া
      'DAILY_LABOR',     // দৈনিক হাজিরা / লেবার
      'SHOP_SUPPLIES',   // দোকানের টুকিটাকি (ভলকানাইজিং সলিউশন, রাবার ইত্যাদি)
      'OTHER_DAILY',     // অন্যান্য খুচরা খরচ
      
      // MONTHLY_FIXED Categories
      'SHOP_RENT',       // দোকান ভাড়া
      'STAFF_SALARY',    // কর্মচারী বেতন
      'ELECTRICITY_BILL',// কারেন্ট বিল (ব্যাটারি চার্জে কারেন্ট বিল বেশি আসে)
      'OTHER_MONTHLY'    // অন্যান্য মাসিক খরচ
    ]
  },
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  date: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    default: '' // যেমন: "রফিকের বেতন" বা "ব্যাটারি আনার ভ্যান ভাড়া"
  }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);