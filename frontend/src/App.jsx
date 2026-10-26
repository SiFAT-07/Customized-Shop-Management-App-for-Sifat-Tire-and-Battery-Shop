import React, { useState, useEffect } from 'react';
import { 
  PlusCircle, Wrench, PackagePlus, Wallet, Trash2, Edit3, 
  Calendar, TrendingUp, AlertTriangle, Layers, BarChart3, Home, Check, X, FileText, Download
} from 'lucide-react';

// Set VITE_API_BASE in frontend/.env.local for local or Vercel deployment.
const API_BASE = `${import.meta.env.VITE_API_BASE || 'http://localhost:5000'}/api/shop`;
const getLocalDateInputValue = (date = new Date()) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const submitRequest = async (url, options) => {
  try {
    const response = await fetch(url, options);
    let result;
    try {
      result = await response.json();
    } catch {
      result = {};
    }
    if (!response.ok || !result.success) {
      const technicalMessage = String(result.message || '');
      const friendlyMessage = technicalMessage.includes('next is not a function')
        ? 'সেভ করার সময় সার্ভারে সমস্যা হয়েছে। দয়া করে আবার চেষ্টা করুন।'
        : technicalMessage || 'অনুরোধটি সম্পন্ন করা যায়নি।';
      throw new Error(friendlyMessage);
    }
    window.dispatchEvent(new CustomEvent('shop:toast', {
      detail: { type: 'success', message: 'সফলভাবে সেভ হয়েছে' }
    }));
    return true;
  } catch (error) {
    window.dispatchEvent(new CustomEvent('shop:toast', {
      detail: { type: 'error', message: error.message || 'সার্ভারের সাথে যোগাযোগ করা যাচ্ছে না।' }
    }));
    return false;
  }
};

function Spinner({ className = 'w-4 h-4' }) {
  return <span className={`inline-block rounded-full border-2 border-current border-r-transparent animate-spin ${className}`} aria-label="লোড হচ্ছে" />;
}

function LoadingOverlay() {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/20 backdrop-blur-[1px]" role="status">
      <div className="flex items-center gap-3 rounded-2xl bg-white px-5 py-4 shadow-xl">
        <Spinner className="h-5 w-5 text-emerald-700" />
        <span className="text-sm font-bold text-slate-700">তথ্য লোড হচ্ছে...</span>
      </div>
    </div>
  );
}

function Toast({ toast, onClose }) {
  if (!toast) return null;
  return (
    <div className={`fixed left-3 right-3 top-4 z-[70] mx-auto max-w-sm rounded-xl border px-4 py-3 text-sm font-bold shadow-lg ${
      toast.type === 'error'
        ? 'border-rose-200 bg-rose-50 text-rose-800'
        : 'border-emerald-200 bg-emerald-50 text-emerald-800'
    }`} role="status">
      <div className="flex items-center justify-between gap-3">
        <span>{toast.message}</span>
        <button onClick={onClose} className="rounded-lg p-1 text-current/70 hover:bg-black/5" aria-label="বন্ধ করুন"><X className="h-4 w-4" /></button>
      </div>
    </div>
  );
}

const interactiveButton = 'transition-all duration-150 active:scale-95 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-emerald-500/50 disabled:cursor-not-allowed disabled:opacity-60';
const inputClasses = 'focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 transition-colors';

// বাংলা লেবেল ম্যাপার
const CATEGORY_LABELS = {
  TIRE: 'টায়ার (Tire)',
  BATTERY: 'ব্যাটারি (Battery)',
  TUBE: 'টিউব (Tube)',
  MOBIL: 'মবিল (Mobil)',
  BATTERY_WATER: 'ব্যাটারির পানি'
};

const EXPENSE_LABELS = {
  TEA_SNACKS: 'চা-নাস্তা ও আপ্যায়ন',
  TRANSPORT: 'ভ্যান ভাড়া / মাল আনা-নেওয়া',
  DAILY_LABOR: 'দৈনিক লেবার / হাজিরা',
  SHOP_SUPPLIES: 'দোকানের টুকিটাকি মালামাল',
  OTHER_DAILY: 'অন্যান্য খুচরা খরচ',
  SHOP_RENT: 'দোকান ভাড়া (মাসিক)',
  STAFF_SALARY: 'কর্মচারী বেতন (মাসিক)',
  ELECTRICITY_BILL: 'কারেন্ট বিল (মাসিক)',
  OTHER_MONTHLY: 'অন্যান্য মাসিক খরচ'
};

const SERVICE_LABELS = {
  BATTERY_CHARGE: 'ব্যাটারি চার্জ',
  VULCANIZING: 'টায়ার ভলকানাইজিং',
  AIR: 'হাওয়া',
  OTHER_SERVICE: 'অন্যান্য সার্ভিস'
};

const SERVICE_AMOUNT_PRESETS = {
  BATTERY_CHARGE: [150, 250, 350],
  VULCANIZING: [100, 120, 150, 200],
  AIR: [10, 20, 30, 40]
};

const formatMoney = (value) => `৳ ${Number(value || 0).toLocaleString('en-IN')}`;

const getDateInputValue = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const formatDateTime = (value) => new Date(value).toLocaleString('bn-BD', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  hour: 'numeric',
  minute: '2-digit'
});
const formatTransactionDate = (value) => new Date(value).toLocaleString('bn-BD', {
  year: 'numeric',
  month: 'short',
  day: 'numeric',
  weekday: 'long',
  hour: 'numeric',
  minute: '2-digit',
  hour12: true
});

const getPresetRange = (preset) => {
  const today = new Date();
  const end = getDateInputValue(today);
  const startDate = new Date(today);
  if (preset === 'TODAY') {
    return { startDate: end, endDate: end };
  }
  if (preset === 'THIS_WEEK') {
    const day = startDate.getDay();
    startDate.setDate(startDate.getDate() - (day === 0 ? 6 : day - 1));
  } else {
    startDate.setDate(1);
  }
  return { startDate: getDateInputValue(startDate), endDate: end };
};

export default function App() {
  const [activeTab, setActiveTab] = useState('HOME'); // HOME | STOCK | MONTHLY | ANALYTICS | EXPENSES
  const [selectedDate, setSelectedDate] = useState(getLocalDateInputValue());
  const [loading, setLoading] = useState(false);

  // Data States
  const [products, setProducts] = useState([]);
  const [dailyData, setDailyData] = useState({
    summary: {
      totalSalesRevenue: 0,
      totalProductSales: 0,
      totalProductProfit: 0,
      totalServiceIncome: 0,
      totalGrossProfit: 0,
      totalDailyExpenses: 0,
      netDailyProfit: 0,
      cashInHandToday: 0
    },
    logs: { salesAndServices: [], expenses: [], stockPurchases: [] }
  });

  // Monthly Report States
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1);
  const [reportYear, setReportYear] = useState(new Date().getFullYear());
  const [monthlyData, setMonthlyData] = useState(null);
  const initialExpenseRange = getPresetRange('THIS_MONTH');
  const [expensePreset, setExpensePreset] = useState('THIS_MONTH');
  const [expenseStartDate, setExpenseStartDate] = useState(initialExpenseRange.startDate);
  const [expenseEndDate, setExpenseEndDate] = useState(initialExpenseRange.endDate);
  const [expenseType, setExpenseType] = useState('ALL');
  const [expenseReport, setExpenseReport] = useState({
    data: [],
    summary: { totalCount: 0, totalInflow: 0, totalExpenses: 0, totalProfit: 0, netCashBalance: 0 }
  });
  const [expenseViewerOpen, setExpenseViewerOpen] = useState(false);
  const [analyticsPeriod, setAnalyticsPeriod] = useState('daily');
  const [analytics, setAnalytics] = useState(null);
  const [toast, setToast] = useState(null);

  // Modal States (NONE | SALE | SERVICE | STOCK_IN | EXPENSE | NEW_PRODUCT)
  const [activeModal, setActiveModal] = useState('NONE');
  const [editingSale, setEditingSale] = useState(null);
  const [editingProduct, setEditingProduct] = useState(null);
  const [restockingProduct, setRestockingProduct] = useState(null);
  const [stockSummaryOpen, setStockSummaryOpen] = useState(false);
  const [inventoryCategory, setInventoryCategory] = useState('ALL');

  useEffect(() => {
    const handleToast = (event) => {
      setToast(event.detail);
      window.clearTimeout(handleToast.timeout);
      handleToast.timeout = window.setTimeout(() => setToast(null), 3200);
    };
    window.addEventListener('shop:toast', handleToast);
    return () => {
      window.removeEventListener('shop:toast', handleToast);
      window.clearTimeout(handleToast.timeout);
    };
  }, []);

  // --- Data Fetching ---
  const fetchProducts = async () => {
    try {
      const res = await fetch(`${API_BASE}/products`);
      const json = await res.json();
      if (json.success) setProducts(json.data);
    } catch (err) {
      console.error('Products fetch error:', err);
      window.dispatchEvent(new CustomEvent('shop:toast', {
        detail: { type: 'error', message: 'পণ্যের তালিকা লোড করা যায়নি।' }
      }));
    }
  };

  const fetchDailySummary = async (dateStr = selectedDate) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/daily?date=${dateStr}`);
      const json = await res.json();
      if (json.success) setDailyData(json);
    } catch (err) {
      console.error('Daily summary error:', err);
      window.dispatchEvent(new CustomEvent('shop:toast', {
        detail: { type: 'error', message: 'আজকের হিসাব লোড করা যায়নি।' }
      }));
    }
    setLoading(false);
  };

  const fetchMonthlyReport = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/monthly?month=${reportMonth}&year=${reportYear}`);
      const json = await res.json();
      if (json.success) setMonthlyData(json);
    } catch (err) {
      console.error('Monthly report error:', err);
      window.dispatchEvent(new CustomEvent('shop:toast', {
        detail: { type: 'error', message: 'মাসিক রিপোর্ট লোড করা যায়নি।' }
      }));
    }
    setLoading(false);
  };

  const fetchExpenseReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        startDate: expenseStartDate,
        endDate: expenseEndDate,
        type: expenseType
      });
      const res = await fetch(`${API_BASE}/reports/statement?${params.toString()}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'হিসাবের রিপোর্ট পাওয়া যায়নি।');
      setExpenseReport(json);
    } catch (err) {
      console.error('Expense report error:', err);
      window.dispatchEvent(new CustomEvent('shop:toast', {
        detail: { type: 'error', message: err.message || 'হিসাবের রিপোর্ট পাওয়া যায়নি।' }
      }));
    } finally {
      setLoading(false);
    }
  };

  const fetchAnalytics = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/reports/analytics/summary?period=${analyticsPeriod}`);
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message || 'অ্যানালিটিক্স লোড করা যায়নি।');
      setAnalytics(json);
    } catch (err) {
      window.dispatchEvent(new CustomEvent('shop:toast', { detail: { type: 'error', message: err.message } }));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
    fetchDailySummary(selectedDate);
  }, [selectedDate]);

  useEffect(() => {
    if (activeTab === 'MONTHLY') {
      fetchMonthlyReport();
    }
  }, [activeTab, reportMonth, reportYear]);

  useEffect(() => {
    if (activeTab === 'EXPENSES') fetchExpenseReport();
  }, [activeTab, expenseStartDate, expenseEndDate, expenseType]);

  useEffect(() => {
    if (activeTab === 'ANALYTICS') fetchAnalytics();
  }, [activeTab, analyticsPeriod]);

  const handleExpensePresetChange = (preset) => {
    setExpensePreset(preset);
    if (preset !== 'CUSTOM') {
      const range = getPresetRange(preset);
      setExpenseStartDate(range.startDate);
      setExpenseEndDate(range.endDate);
    }
  };

  // --- Delete Handlers (ভুল সংশোধন) ---
  const handleDeleteSaleOrService = async (id) => {
    if (!window.confirm('আপনি কি নিশ্চিত যে এই হিসাবটি মুছে ফেলতে চান? (স্টক অটোমেটিক ঠিক হয়ে যাবে)')) return;
    const deleted = await submitRequest(`${API_BASE}/sales-services/${id}`, { method: 'DELETE' });
    if (deleted) {
      fetchDailySummary();
      fetchProducts();
    }
  };

  const handleDeleteExpense = async (id) => {
    if (!window.confirm('এই খরচের হিসাবটি মুছে ফেলতে চান?')) return;
    const deleted = await submitRequest(`${API_BASE}/expenses/${id}`, { method: 'DELETE' });
    if (deleted) fetchDailySummary();
  };

  const handleDeleteProduct = async (product) => {
    if (!window.confirm(`আপনি কি নিশ্চিত এই প্রোডাক্টটি তালিকা থেকে সম্পূর্ণ মুছে ফেলতে চান?\n\n${product.name}`)) return;
    const deleted = await submitRequest(`${API_BASE}/products/${product._id}`, { method: 'DELETE' });
    if (deleted) {
      setProducts((currentProducts) => currentProducts.filter((item) => item._id !== product._id));
    }
  };

  const inventoryValuation = products.reduce((summary, product) => {
    const stock = Number(product.currentStock) || 0;
    const stockValue = stock * (Number(product.defaultBuyingPrice) || 0);
    summary.totalUnits += stock;
    summary.totalValue += stockValue;
    if (product.category === 'TIRE') summary.tireValue += stockValue;
    else if (product.category === 'BATTERY') summary.batteryValue += stockValue;
    else summary.otherValue += stockValue;
    return summary;
  }, { totalUnits: 0, totalValue: 0, tireValue: 0, batteryValue: 0, otherValue: 0 });
  const displayedProducts = products
    .filter((product) => {
      if (inventoryCategory === 'ALL') return true;
      if (inventoryCategory === 'OTHER') return !['TIRE', 'BATTERY'].includes(product.category);
      return product.category === inventoryCategory;
    })
    .sort((a, b) => {
      const aSortKey = String(a.company || a.name || '');
      const bSortKey = String(b.company || b.name || '');
      return aSortKey.localeCompare(bSortKey, undefined, { sensitivity: 'base' })
        || String(a.name || '').localeCompare(String(b.name || ''), undefined, { sensitivity: 'base' });
    });
  const groupedProducts = displayedProducts.reduce((groups, product) => {
    const company = String(product.company || '').trim();
    const section = company ? company.charAt(0).toUpperCase() : '#';
    if (!groups[section]) groups[section] = [];
    groups[section].push(product);
    return groups;
  }, {});
  const inventorySections = Object.entries(groupedProducts).sort(([a], [b]) => {
    if (a === '#') return 1;
    if (b === '#') return -1;
    return a.localeCompare(b);
  });

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top,_#ecfdf5,_transparent_38%),linear-gradient(135deg,#f8fafc_0%,#eef2ff_100%)] pb-24 font-sans text-slate-900">
      <Toast toast={toast} onClose={() => setToast(null)} />
      {loading && <LoadingOverlay />}
      {/* Top Header */}
      <header className="bg-gradient-to-r from-emerald-900 via-emerald-800 to-slate-900 text-white p-4 shadow-md sticky top-0 z-20">
        <div className="max-w-xl mx-auto flex justify-between items-center">
          <div>
            <h1 className="text-xl font-bold">টায়ার ও ব্যাটারি হাউজ</h1>
            <p className="text-xs text-emerald-200">প্রতিদিনের সহজ হিসাব ও স্টক</p>
          </div>
          <div className="flex items-center bg-emerald-900 px-3 py-1.5 rounded-lg border border-emerald-600">
            <Calendar className="w-4 h-4 mr-2 text-emerald-300" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={`bg-transparent text-white text-sm font-semibold ${inputClasses}`}
            />
          </div>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="max-w-xl mx-auto p-3 space-y-5">
        
        {/* ==========================================
            TAB 1: HOME / DAILY DASHBOARD (প্রতিদিনের হিসাব)
        ========================================== */}
        {activeTab === 'HOME' && (
          <>
            {/* 4 Live Summary Cards */}
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-gradient-to-br from-white to-blue-50 p-4 rounded-2xl shadow-sm border-l-4 border-blue-600 transition-shadow hover:shadow-md">
                <p className="text-xs text-slate-500 font-semibold">আজকের মোট বিক্রি ও সার্ভিস</p>
                <p className="text-2xl font-extrabold text-blue-700 mt-1">
                  ৳ {dailyData.summary.totalSalesRevenue.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  মাল: ৳{dailyData.summary.totalProductSales} | সার্ভিস: ৳{dailyData.summary.totalServiceIncome}
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-emerald-50 p-4 rounded-2xl shadow-sm border-l-4 border-emerald-600 transition-shadow hover:shadow-md">
                <p className="text-xs text-slate-500 font-semibold">আজকের মোট লাভ (Gross)</p>
                <p className="text-2xl font-extrabold text-emerald-700 mt-1">
                  ৳ {dailyData.summary.totalGrossProfit.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  মাল লাভে: ৳{dailyData.summary.totalProductProfit} | সার্ভিসে: ৳{dailyData.summary.totalServiceIncome}
                </p>
              </div>

              <div className="bg-gradient-to-br from-white to-rose-50 p-4 rounded-2xl shadow-sm border-l-4 border-rose-500 transition-shadow hover:shadow-md">
                <p className="text-xs text-slate-500 font-semibold">আজকের দোকানের খরচ</p>
                <p className="text-2xl font-extrabold text-rose-600 mt-1">
                  ৳ {dailyData.summary.totalDailyExpenses.toLocaleString()}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">চা-নাস্তা, ভ্যান ভাড়া ও খুচরা</p>
              </div>

              <div className="bg-gradient-to-br from-emerald-900 to-slate-900 text-white p-4 rounded-2xl shadow-md">
                <p className="text-xs text-emerald-200 font-semibold">খরচ বাদে আজকের নিট লাভ</p>
                <p className="text-2xl font-extrabold text-yellow-300 mt-1">
                  ৳ {dailyData.summary.netDailyProfit.toLocaleString()}
                </p>
                <p className="text-[11px] text-emerald-200 mt-1">
                  ক্যাশ জমা: ৳{dailyData.summary.cashInHandToday.toLocaleString()}
                </p>
              </div>
            </div>

            {/* 4 Giant Action Buttons for Father */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => { setEditingSale(null); setActiveModal('SALE'); }}
                className={`${interactiveButton} flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-600 to-emerald-700 text-white font-bold py-4 px-3 rounded-xl shadow-md text-base`}
              >
                <PlusCircle className="w-6 h-6 shrink-0" />
                <span>মাল বিক্রি যোগ</span>
              </button>

              <button
                onClick={() => { setEditingSale(null); setActiveModal('SERVICE'); }}
                className={`${interactiveButton} flex items-center justify-center gap-2 bg-gradient-to-r from-blue-600 to-indigo-700 text-white font-bold py-4 px-3 rounded-xl shadow-md text-base`}
              >
                <Wrench className="w-6 h-6 shrink-0" />
                <span>চার্জ / ভলকানাইজিং / হাওয়া</span>
              </button>

              <button
                onClick={() => setActiveModal('STOCK_IN')}
                className={`${interactiveButton} flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-orange-600 text-white font-bold py-4 px-3 rounded-xl shadow-md text-base`}
              >
                <PackagePlus className="w-6 h-6 shrink-0" />
                <span>দোকানে মাল তুলুন</span>
              </button>

              <button
                onClick={() => setActiveModal('EXPENSE')}
                className={`${interactiveButton} flex items-center justify-center gap-2 bg-gradient-to-r from-rose-600 to-red-700 text-white font-bold py-4 px-3 rounded-xl shadow-md text-base`}
              >
                <Wallet className="w-6 h-6 shrink-0" />
                <span>দোকানের খরচ লিখুন</span>
              </button>
            </div>

            {/* Today's Sales & Service Activity List (With Easy Edit/Delete) */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-2 mb-3 flex justify-between items-center">
                <span>আজকের বিক্রি ও সার্ভিস তালিকা</span>
                <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full">
                  মোট {dailyData.logs.salesAndServices.length} টি
                </span>
              </h2>

              {dailyData.logs.salesAndServices.length === 0 ? (
                <p className="text-center text-slate-400 py-6 text-sm">আজকে এখনো কোনো বিক্রি বা সার্ভিস তোলা হয়নি।</p>
              ) : (
                <div className="space-y-3">
                  {dailyData.logs.salesAndServices.map((item) => (
                    <div key={item._id} className="border border-slate-200 rounded-xl p-3 flex justify-between items-center bg-slate-50">
                      <div className="space-y-1 pr-2">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`text-[11px] font-bold px-2 py-0.5 rounded ${
                            item.entryType === 'SERVICE'
                              ? item.serviceType === 'AIR' ? 'bg-cyan-100 text-cyan-800' : 'bg-blue-100 text-blue-800'
                              :
                            item.saleChannel === 'WHOLESALE' ? 'bg-purple-100 text-purple-800' : 'bg-emerald-100 text-emerald-800'
                          }`}>
                            {item.entryType === 'SERVICE' ? (item.serviceType === 'AIR' ? 'হাওয়া সার্ভিস' : 'সার্ভিস') : item.saleChannel === 'WHOLESALE' ? 'পাইকারি বিক্রি' : 'খুচরা বিক্রি'}
                          </span>
                          {item.isDirectFromOutside && (
                            <span className="text-[11px] bg-amber-100 text-amber-800 px-2 py-0.5 rounded font-semibold">
                              বাইরের দোকান থেকে
                            </span>
                          )}
                        </div>

                        <p className="font-bold text-base text-slate-900">
                          {item.entryType === 'SERVICE' 
                            ? (SERVICE_LABELS[item.serviceType] || 'অন্যান্য সার্ভিস')
                            : (item.product?.name || item.customProductName || 'পণ্য বিক্রি')}
                          {item.quantity > 1 && <span className="text-emerald-700"> × {item.quantity} পিস</span>}
                        </p>

                        <p className="text-xs text-slate-600">
                          বিক্রি: <b>৳{item.totalSellingPrice}</b> 
                          {item.entryType === 'PRODUCT_SALE' && ` | কেনা: ৳${item.totalBuyingCost}`}
                          {' | '}
                          <span className={item.profit >= 0 ? 'text-emerald-700 font-bold' : 'text-rose-600 font-bold'}>
                            {item.profit >= 0 ? `লাভ: ৳${item.profit}` : `লস: ৳${Math.abs(item.profit)}`}
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {formatTransactionDate(item.createdAt || item.date)}
                        </p>
                        {item.note && <p className="text-xs text-slate-500 italic">নোট: {item.note}</p>}
                      </div>

                      {/* Edit & Delete Buttons */}
                      <div className="flex flex-col gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSale(item);
                            setActiveModal(item.entryType === 'SERVICE' ? 'SERVICE' : 'SALE');
                          }}
                          className="p-2.5 bg-amber-100 text-amber-800 rounded-lg active:bg-amber-200 flex items-center text-xs font-bold"
                        >
                          <Edit3 className="w-4 h-4 mr-1" /> এডিট
                        </button>
                        <button
                          onClick={() => handleDeleteSaleOrService(item._id)}
                          className="p-2.5 bg-rose-100 text-rose-700 rounded-lg active:bg-rose-200 flex items-center text-xs font-bold"
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> মুছুন
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Today's Expenses List */}
            <div className="bg-white rounded-xl shadow-sm p-4">
              <h2 className="text-base font-bold text-slate-800 border-b pb-2 mb-3">আজকে লেখা খরচের তালিকা</h2>
              {dailyData.logs.expenses.length === 0 ? (
                <p className="text-center text-slate-400 py-4 text-sm">আজকে কোনো খরচ লেখা হয়নি।</p>
              ) : (
                <div className="space-y-2">
                  {dailyData.logs.expenses.map((exp) => (
                    <div key={exp._id} className="flex justify-between items-center p-3 bg-rose-50/60 border border-rose-100 rounded-xl">
                      <div>
                        <p className="font-bold text-sm text-slate-800">{EXPENSE_LABELS[exp.category] || exp.category}</p>
                        {exp.note && <p className="text-xs text-slate-500">{exp.note}</p>}
                        <span className="text-[10px] bg-slate-200 px-2 py-0.5 rounded text-slate-700">
                          {exp.expenseType === 'DAILY' ? 'প্রতিদিনের খরচ' : 'মাসিক খরচ'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="font-extrabold text-rose-600 text-base">৳ {exp.amount}</span>
                        <button
                          onClick={() => handleDeleteExpense(exp._id)}
                          className="p-2 bg-rose-100 text-rose-700 rounded-lg"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}

        {/* ==========================================
            TAB 2: STOCK & INVENTORY (স্টক ও মালের তালিকা)
        ========================================== */}
        {activeTab === 'STOCK' && (
          <div className="space-y-4">
            <div className="flex flex-wrap justify-between items-center gap-2 bg-white p-4 rounded-xl shadow-sm">
              <div>
                <h2 className="text-lg font-bold">Product Master & Inventory</h2>
                <p className="text-xs text-slate-500">স্টক শূন্য হলেও product এখানে থাকবে। দাম/details এডিট বা একই item restock করুন।</p>
              </div>
              <div className="flex flex-wrap justify-end gap-2">
                <button
                  onClick={() => setActiveModal('NEW_PRODUCT')}
                  className="bg-emerald-700 text-white px-4 py-2.5 rounded-xl font-bold text-sm flex items-center gap-1.5 shadow"
                >
                  <PlusCircle className="w-4 h-4" /> নতুন আইটেম যোগ
                </button>
                <button
                  onClick={() => setStockSummaryOpen(true)}
                  className="bg-slate-100 text-emerald-800 px-3 py-2.5 rounded-xl font-bold text-xs border border-emerald-200"
                >
                  📊 স্টক হিসাব দেখুন
                </button>
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              {[
                ['ALL', 'সবগুলো'],
                ['TIRE', 'টায়ার'],
                ['BATTERY', 'ব্যাটারি'],
                ['OTHER', 'মবিল / অন্যান্য']
              ].map(([value, label]) => (
                <button
                  key={value}
                  onClick={() => setInventoryCategory(value)}
                  className={`rounded-full border px-3 py-2 text-xs font-bold ${
                    inventoryCategory === value
                      ? 'border-emerald-700 bg-emerald-700 text-white'
                      : 'border-slate-200 bg-white text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div className="space-y-4">
              {inventorySections.map(([section, sectionProducts]) => (
                <section key={section}>
                  <div className="sticky top-[76px] z-10 mb-2 flex items-center gap-2 rounded-lg bg-slate-100 px-3 py-2">
                    <span className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-800 text-sm font-extrabold text-white">
                      {section}
                    </span>
                  </div>
                  <div className="space-y-2.5">
                  {sectionProducts.map((p) => (
                <div key={p._id} className="bg-white p-4 rounded-xl shadow-sm border border-slate-200 flex justify-between items-center">
                  <div>
                    <div className="flex items-center gap-2">
                      <div className="flex flex-wrap items-center gap-2">
                      <span className="text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                        {CATEGORY_LABELS[p.category]}
                      </span>
                      {p.condition !== 'NA' && (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          p.condition === 'NEW' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                        }`}>
                          {p.condition === 'NEW' ? 'নতুন (New)' : 'পুরাতন (Old)'}
                        </span>
                      )}
                      </div>
                    </div>
                    <h3 className="font-bold text-base mt-1 text-slate-900">{p.name}</h3>
                    {p.company && (
                      <span className="inline-block mt-1 rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-bold text-indigo-700">
                        {p.company}
                      </span>
                    )}
                    <p className="text-xs text-slate-500 mt-0.5">
                      কেনা দাম: <b>৳{p.defaultBuyingPrice}</b> | খুচরা: ৳{p.defaultRetailPrice} | পাইকারি: ৳{p.defaultWholesalePrice}
                    </p>
                  </div>

                  <div className="text-right flex flex-col items-end gap-2">
                    <span className={`inline-block px-3 py-1.5 rounded-xl font-extrabold text-base ${
                      p.currentStock <= p.lowStockAlert ? 'bg-rose-100 text-rose-700 border border-rose-300' : 'bg-emerald-50 text-emerald-800'
                    }`}>
                      স্টক: {p.currentStock} পিস
                    </span>
                    {p.currentStock <= p.lowStockAlert && (
                      <p className="text-[11px] text-rose-600 font-semibold mt-1 flex items-center justify-end">
                        <AlertTriangle className="w-3 h-3 mr-1" /> মাল কম আছে
                      </p>
                    )}
                    <div className="flex flex-wrap justify-end gap-1.5">
                      <button
                        onClick={() => { setRestockingProduct(p); setActiveModal('RESTOCK'); }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-100 text-amber-800 text-xs font-bold"
                      >
                        মাল তুলুন
                      </button>
                      <button
                        onClick={() => { setEditingProduct(p); setActiveModal('EDIT_PRODUCT'); }}
                        className="px-2.5 py-1.5 rounded-lg bg-blue-100 text-blue-800 text-xs font-bold"
                      >
                        এডিট
                      </button>
                      <button
                        onClick={() => handleDeleteProduct(p)}
                        className="px-2.5 py-1.5 rounded-lg bg-rose-100 text-rose-700 text-xs font-bold flex items-center gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" /> মুছুন
                      </button>
                    </div>
                  </div>
                </div>
              ))}
                  </div>
                </section>
              ))}
              {displayedProducts.length === 0 && (
                <p className="rounded-xl bg-white py-8 text-center text-sm text-slate-400">
                  এই ক্যাটাগরিতে কোনো পণ্য নেই।
                </p>
              )}
            </div>

          </div>
        )}

        {/* ==========================================
            TAB 3: MONTHLY REPORT (মাস শেষের চূড়ান্ত হিসাব)
        ========================================== */}
        {activeTab === 'MONTHLY' && (
          <div className="space-y-4">
            {/* Month & Year Picker */}
            <div className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
              <span className="font-bold text-base">মাসের হিসাব দেখুন:</span>
              <div className="flex gap-2">
                <select
                  value={reportMonth}
                  onChange={(e) => setReportMonth(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-2 font-bold text-sm bg-slate-50"
                >
                  {['জানুয়ারি','ফেব্রুয়ারি','মার্চ','এপ্রিল','মে','জুন','জুলাই','আগস্ট','সেপ্টেম্বর','অক্টোবর','নভেম্বর','ডিসেম্বর'].map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
                <select
                  value={reportYear}
                  onChange={(e) => setReportYear(Number(e.target.value))}
                  className="border border-slate-300 rounded-lg px-3 py-2 font-bold text-sm bg-slate-50"
                >
                  {[2025, 2026, 2027, 2028].map(y => <option key={y} value={y}>{y}</option>)}
                </select>
              </div>
            </div>

            {monthlyData && (
              <>
                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                  <h3 className="font-bold text-base border-b pb-2 text-emerald-900">১. সারা মাসের আয় ও লাভের হিসাব</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">মোট মাল বিক্রি (টায়ার, ব্যাটারি, মবিল):</span>
                    <span className="font-bold">৳ {monthlyData.report.productSalesRevenue.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-emerald-700">
                    <span>মাল বিক্রি থেকে লাভ:</span>
                    <span className="font-bold">+ ৳ {monthlyData.report.productProfit.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>ব্যাটারি চার্জ থেকে আয়:</span>
                    <span className="font-bold">+ ৳ {monthlyData.report.batteryChargeIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-blue-700">
                    <span>ভলকানাইজিং থেকে আয়:</span>
                    <span className="font-bold">+ ৳ {monthlyData.report.vulcanizingIncome.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm text-cyan-700">
                    <span>হাওয়া থেকে আয়:</span>
                    <span className="font-bold">+ ৳ {monthlyData.report.airIncome.toLocaleString()}</span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-base font-extrabold text-emerald-800">
                    <span>সর্বমোট গ্রস লাভ (খরচ বাদ দেওয়ার আগে):</span>
                    <span>৳ {monthlyData.report.totalGrossProfit.toLocaleString()}</span>
                  </div>
                </div>

                <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
                  <h3 className="font-bold text-base border-b pb-2 text-rose-800">২. সারা মাসের সব খরচের হিসাব</h3>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">প্রতিদিনের খুচরা খরচ (চা-নাস্তা, ভ্যান ভাড়া):</span>
                    <span className="font-bold text-rose-600">- ৳ {monthlyData.report.totalDailyExpenses.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">দোকান ভাড়া:</span>
                    <span className="font-bold text-rose-600">- ৳ {monthlyData.report.fixedExpenseBreakdown.SHOP_RENT.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">কর্মচারীর বেতন:</span>
                    <span className="font-bold text-rose-600">- ৳ {monthlyData.report.fixedExpenseBreakdown.STAFF_SALARY.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-600">কারেন্ট বিল ও অন্যান্য মাসিক খরচ:</span>
                    <span className="font-bold text-rose-600">
                      - ৳ {(monthlyData.report.fixedExpenseBreakdown.ELECTRICITY_BILL + monthlyData.report.fixedExpenseBreakdown.OTHER_MONTHLY).toLocaleString()}
                    </span>
                  </div>
                  <div className="border-t pt-2 flex justify-between text-base font-extrabold text-rose-700">
                    <span>মাসের সর্বমোট খরচ:</span>
                    <span>৳ {monthlyData.report.totalAllExpenses.toLocaleString()}</span>
                  </div>
                </div>

                {/* Final Net Profit Banner */}
                <div className={`p-5 rounded-xl shadow-md text-white ${
                  monthlyData.report.finalMonthlyNetProfit >= 0 ? 'bg-emerald-800' : 'bg-rose-800'
                }`}>
                  <p className="text-sm opacity-90">দোকান ভাড়া, বেতন ও সব খরচ বাদ দিয়ে</p>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-lg font-bold">মাস শেষে চূড়ান্ত নিট {monthlyData.report.finalMonthlyNetProfit >= 0 ? 'লাভ' : 'লস'}:</span>
                    <span className="text-3xl font-extrabold text-yellow-300">
                      ৳ {monthlyData.report.finalMonthlyNetProfit.toLocaleString()}
                    </span>
                  </div>
                </div>
              </>
            )}
          </div>
        )}

        {activeTab === 'ANALYTICS' && (
          <AnalyticsView analytics={analytics} period={analyticsPeriod} onPeriodChange={setAnalyticsPeriod} loading={loading} />
        )}

        {activeTab === 'EXPENSES' && (
          <ExpenseReportView
            expenses={expenseReport.data}
            summary={expenseReport.summary}
            preset={expensePreset}
            startDate={expenseStartDate}
            endDate={expenseEndDate}
            type={expenseType}
            loading={loading}
            onPresetChange={handleExpensePresetChange}
            onStartDateChange={(value) => { setExpensePreset('CUSTOM'); setExpenseStartDate(value); }}
            onEndDateChange={(value) => { setExpensePreset('CUSTOM'); setExpenseEndDate(value); }}
            onTypeChange={setExpenseType}
            onPreview={() => setExpenseViewerOpen(true)}
          />
        )}
      </main>

      {/* ==========================================
          MODALS FOR DATA ENTRY (বড় ও সহজ ফর্ম)
      ========================================== */}
      {activeModal === 'SALE' && (
        <ProductSaleModal
          products={products}
          editingSale={editingSale}
          selectedDate={selectedDate}
          onClose={() => setActiveModal('NONE')}
          onSuccess={() => {
            setActiveModal('NONE');
            fetchDailySummary();
            fetchProducts();
          }}
        />
      )}

      {activeModal === 'SERVICE' && (
        <ServiceEntryModal
          editingSale={editingSale}
          selectedDate={selectedDate}
          onClose={() => setActiveModal('NONE')}
          onSuccess={() => {
            setActiveModal('NONE');
            fetchDailySummary();
          }}
        />
      )}

      {activeModal === 'STOCK_IN' && (
        <StockInModal
          products={products}
          selectedDate={selectedDate}
          onClose={() => setActiveModal('NONE')}
          onSuccess={() => {
            setActiveModal('NONE');
            fetchProducts();
            fetchDailySummary();
          }}
        />
      )}

      {activeModal === 'RESTOCK' && (
        <StockInModal
          products={products}
          selectedDate={selectedDate}
          initialProduct={restockingProduct}
          onClose={() => { setRestockingProduct(null); setActiveModal('NONE'); }}
          onSuccess={() => {
            setRestockingProduct(null);
            setActiveModal('NONE');
            fetchProducts();
            fetchDailySummary();
          }}
        />
      )}

      {activeModal === 'EDIT_PRODUCT' && (
        <ProductMasterModal
          product={editingProduct}
          onClose={() => { setEditingProduct(null); setActiveModal('NONE'); }}
          onSuccess={() => {
            setEditingProduct(null);
            setActiveModal('NONE');
            fetchProducts();
          }}
        />
      )}

      {activeModal === 'EXPENSE' && (
        <ExpenseModal
          selectedDate={selectedDate}
          onClose={() => setActiveModal('NONE')}
          onSuccess={() => {
            setActiveModal('NONE');
            fetchDailySummary();
          }}
        />
      )}

      {activeModal === 'NEW_PRODUCT' && (
        <NewProductModal
          onClose={() => setActiveModal('NONE')}
          onSuccess={() => {
            setActiveModal('NONE');
            fetchProducts();
          }}
        />
      )}

      {stockSummaryOpen && (
        <StockValuationModal
          valuation={inventoryValuation}
          onClose={() => setStockSummaryOpen(false)}
        />
      )}

      {expenseViewerOpen && (
        <ExpensePdfViewer
          expenses={expenseReport.data}
          summary={expenseReport.summary}
          startDate={expenseStartDate}
          endDate={expenseEndDate}
          onClose={() => setExpenseViewerOpen(false)}
        />
      )}

      {/* Bottom Fixed Navigation Bar (আব্বুর মোবাইলের জন্য) */}
      <nav className="fixed bottom-0 left-0 right-0 bg-white border-t border-slate-300 shadow-lg z-20">
        <div className="max-w-xl mx-auto grid grid-cols-5">
          <button
            onClick={() => setActiveTab('HOME')}
            className={`${interactiveButton} flex flex-col items-center py-3 font-bold text-xs ${
              activeTab === 'HOME' ? 'text-emerald-700 bg-emerald-50 border-t-4 border-emerald-700' : 'text-slate-500'
            }`}
          >
            <Home className="w-6 h-6 mb-1" />
            <span>আজকের হিসাব</span>
          </button>

          <button
            onClick={() => setActiveTab('STOCK')}
            className={`${interactiveButton} flex flex-col items-center py-3 font-bold text-xs ${
              activeTab === 'STOCK' ? 'text-emerald-700 bg-emerald-50 border-t-4 border-emerald-700' : 'text-slate-500'
            }`}
          >
            <Layers className="w-6 h-6 mb-1" />
            <span>মালের স্টক ({products.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('MONTHLY')}
            className={`${interactiveButton} flex flex-col items-center py-3 font-bold text-xs ${
              activeTab === 'MONTHLY' ? 'text-emerald-700 bg-emerald-50 border-t-4 border-emerald-700' : 'text-slate-500'
            }`}
          >
            <BarChart3 className="w-6 h-6 mb-1" />
            <span>মাসিক লাভ-লস</span>
          </button>

          <button
            onClick={() => setActiveTab('ANALYTICS')}
            className={`${interactiveButton} flex flex-col items-center py-3 font-bold text-xs ${
              activeTab === 'ANALYTICS' ? 'text-emerald-700 bg-emerald-50 border-t-4 border-emerald-700' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-6 h-6 mb-1" />
            <span>অ্যানালিটিক্স</span>
          </button>

          <button
            onClick={() => setActiveTab('EXPENSES')}
            className={`${interactiveButton} flex flex-col items-center py-3 font-bold text-xs ${
              activeTab === 'EXPENSES' ? 'text-emerald-700 bg-emerald-50 border-t-4 border-emerald-700' : 'text-slate-500'
            }`}
          >
            <FileText className="w-6 h-6 mb-1" />
            <span>হিসাব রিপোর্ট</span>
          </button>
        </div>
      </nav>
    </div>
  );
}

/* ========================================================
   SUB-COMPONENT 1: মাল বিক্রি করার ফর্ম (ProductSaleModal)
======================================================== */
function ProductSaleModal({ products, editingSale, selectedDate, onClose, onSuccess }) {
  const [filterCat, setFilterCat] = useState('ALL');
  const [isDirectFromOutside, setIsDirectFromOutside] = useState(editingSale?.isDirectFromOutside || false);
  const [productId, setProductId] = useState(editingSale?.product?._id || editingSale?.product || '');
  const [customProductName, setCustomProductName] = useState(editingSale?.customProductName || '');
  const [saleChannel, setSaleChannel] = useState(editingSale?.saleChannel || 'RETAIL');
  const [quantity, setQuantity] = useState(editingSale?.quantity || 1);
  const [unitBuyingPrice, setUnitBuyingPrice] = useState(editingSale?.unitBuyingPrice || '');
  const [unitSellingPrice, setUnitSellingPrice] = useState(editingSale?.unitSellingPrice || '');
  const [note, setNote] = useState(editingSale?.note || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setIsDirectFromOutside(Boolean(editingSale?.isDirectFromOutside));
    setProductId(editingSale?.product?._id || editingSale?.product || '');
    setCustomProductName(editingSale?.customProductName || '');
    setSaleChannel(editingSale?.saleChannel || 'RETAIL');
    setQuantity(editingSale?.quantity || 1);
    setUnitBuyingPrice(editingSale?.unitBuyingPrice ?? '');
    setUnitSellingPrice(editingSale?.unitSellingPrice ?? '');
    setNote(editingSale?.note || '');
  }, [editingSale]);

  const filteredProducts = filterCat === 'ALL' ? products : products.filter(p => p.category === filterCat);

  // প্রোডাক্ট সিলেক্ট করলে অটোমেটিক কেনা দাম ও বিক্রির দাম বসে যাবে
  const handleProductSelect = (id) => {
    setProductId(id);
    const found = products.find(p => p._id === id);
    if (found) {
      setUnitBuyingPrice(found.defaultBuyingPrice);
      setUnitSellingPrice(saleChannel === 'WHOLESALE' ? found.defaultWholesalePrice : found.defaultRetailPrice);
    }
  };

  // লাইভ লাভ-লস প্রিভিউ হিসাব
  const liveProfit = (Number(unitSellingPrice || 0) - Number(unitBuyingPrice || 0)) * Number(quantity || 1);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const normalizedQuantity = Number(quantity);
    const normalizedBuyingPrice = Number(unitBuyingPrice);
    const normalizedSellingPrice = Number(unitSellingPrice);
    if (!Number.isInteger(normalizedQuantity) || normalizedQuantity < 1 ||
      !Number.isFinite(normalizedBuyingPrice) || normalizedBuyingPrice < 0 ||
      !Number.isFinite(normalizedSellingPrice) || normalizedSellingPrice < 0) return;
    const payload = {
      entryType: 'PRODUCT_SALE',
      product: isDirectFromOutside ? null : productId,
      customProductName: isDirectFromOutside ? customProductName : '',
      isDirectFromOutside,
      saleChannel,
      quantity: normalizedQuantity,
      unitBuyingPrice: normalizedBuyingPrice,
      unitSellingPrice: normalizedSellingPrice,
      date: selectedDate,
      note
    };

    const url = editingSale ? `${API_BASE}/sales-services/${editingSale._id}` : `${API_BASE}/sales-services`;
    const method = editingSale ? 'PUT' : 'POST';

    setSubmitting(true);
    try {
      const saved = await submitRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 max-h-[92vh] overflow-y-auto space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-emerald-800">
            {editingSale ? 'বিক্রির হিসাব সংশোধন করুন' : 'নতুন মাল বিক্রি যোগ করুন'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* খুচরা নাকি পাইকারি */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSaleChannel('RETAIL')}
              className={`py-3 rounded-xl font-bold text-sm border ${
                saleChannel === 'RETAIL' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-slate-50 text-slate-700'
              }`}
            >
              খুচরা বিক্রি (কাস্টমার)
            </button>
            <button
              type="button"
              onClick={() => setSaleChannel('WHOLESALE')}
              className={`py-3 rounded-xl font-bold text-sm border ${
                saleChannel === 'WHOLESALE' ? 'bg-purple-600 text-white border-purple-600' : 'bg-slate-50 text-slate-700'
              }`}
            >
              পাইকারি বিক্রি (দোকানদার)
            </button>
          </div>

          {/* স্টক থেকে নাকি বাইরের দোকান থেকে এনে সরাসরি বিক্রি */}
          <label className="flex items-center gap-2 bg-amber-50 p-3 rounded-xl border border-amber-200 text-sm font-semibold text-amber-900 cursor-pointer">
            <input
              type="checkbox"
              checked={isDirectFromOutside}
              onChange={(e) => setIsDirectFromOutside(e.target.checked)}
              className="w-5 h-5 accent-amber-600"
            />
            <span>বাইরের দোকান থেকে এনে সাথে সাথে বিক্রি (স্টকে নেই)</span>
          </label>

          {!isDirectFromOutside ? (
            <>
              {/* Category Filter Pills */}
              <div className="flex gap-1.5 overflow-x-auto pb-1">
                {['ALL', 'TIRE', 'BATTERY', 'TUBE', 'MOBIL', 'BATTERY_WATER'].map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setFilterCat(cat)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold shrink-0 ${
                      filterCat === cat ? 'bg-slate-800 text-white' : 'bg-slate-100 text-slate-700'
                    }`}
                  >
                    {cat === 'ALL' ? 'সব মাল' : CATEGORY_LABELS[cat]}
                  </button>
                ))}
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">পণ্য নির্বাচন করুন *</label>
                <select
                  required
                  value={productId}
                  onChange={(e) => handleProductSelect(e.target.value)}
                  className={`w-full border-2 border-slate-300 rounded-xl p-3.5 text-base font-bold bg-white ${inputClasses}`}
                >
                  <option value="">-- মাল সিলেক্ট করুন --</option>
                  {filteredProducts.map(p => (
                    <option key={p._id} value={p._id}>
                      {p.name} ({p.condition === 'OLD' ? 'পুরাতন' : 'নতুন'}) — [স্টক: {p.currentStock}]
                    </option>
                  ))}
                </select>
              </div>
            </>
          ) : (
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">মালের নাম লিখুন *</label>
              <input
                type="text"
                required
                placeholder="যেমন: পুরাতন টায়ার 185/65 বা আইপিএস ব্যাটারি"
                value={customProductName}
                onChange={(e) => setCustomProductName(e.target.value)}
                className="w-full border-2 border-slate-300 rounded-xl p-3.5 text-base font-bold"
              />
            </div>
          )}

          {/* Quantity with Big +/- Buttons */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কয় পিস বিক্রি হলো?</label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setQuantity(q => Math.max(1, Number(q) - 1))}
                className="w-14 h-12 bg-slate-200 rounded-xl font-extrabold text-2xl"
              >-</button>
              <input
                type="number"
                min="1"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-24 text-center border-2 border-slate-300 rounded-xl h-12 text-xl font-extrabold ${inputClasses}`}
              />
              <button
                type="button"
                onClick={() => setQuantity(q => Number(q) + 1)}
                className="w-14 h-12 bg-slate-200 rounded-xl font-extrabold text-2xl"
              >+</button>
            </div>
          </div>

          {/* Buying & Selling Price */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">প্রতি পিসের কেনা দাম (৳) *</label>
              <input
                type="number"
                required
                placeholder="কেনা দাম"
                value={unitBuyingPrice}
                onChange={(e) => setUnitBuyingPrice(e.target.value)}
                className={`w-full border-2 border-slate-300 rounded-xl p-3.5 text-lg font-extrabold bg-slate-50 ${inputClasses}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-emerald-800 mb-1">প্রতি পিস বিক্রির দাম (৳) *</label>
              <input
                type="number"
                required
                placeholder="বিক্রির দাম"
                value={unitSellingPrice}
                onChange={(e) => setUnitSellingPrice(e.target.value)}
                className={`w-full border-2 border-emerald-500 rounded-xl p-3.5 text-lg font-extrabold ${inputClasses}`}
              />
            </div>
          </div>

          {/* Live Profit Preview Box */}
          <div className={`p-3.5 rounded-xl flex justify-between items-center font-bold ${
            liveProfit >= 0 ? 'bg-emerald-100 text-emerald-900' : 'bg-rose-100 text-rose-800'
          }`}>
            <span>এই মালে {liveProfit >= 0 ? 'লাভ হচ্ছে:' : 'লস হচ্ছে:'}</span>
            <span className="text-xl font-extrabold">৳ {liveProfit.toLocaleString()}</span>
          </div>

          <input
            type="text"
            placeholder="নোট (যেমন: কাস্টমার বা দোকানদারের নাম - ঐচ্ছিক)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full border border-slate-300 rounded-xl p-3 text-sm ${inputClasses}`}
          />

          <button
            type="submit"
            disabled={submitting}
            className={`${interactiveButton} w-full bg-emerald-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-md flex items-center justify-center gap-2`}
          >
            {submitting ? <Spinner /> : <Check className="w-6 h-6" />} {submitting ? 'সেভ হচ্ছে...' : 'হিসাব সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ========================================================
   SUB-COMPONENT 2: সার্ভিস আয়
======================================================== */
function ServiceEntryModal({ editingSale, selectedDate, onClose, onSuccess }) {
  const [serviceType, setServiceType] = useState(editingSale?.serviceType || 'BATTERY_CHARGE');
  const [amount, setAmount] = useState(editingSale?.unitSellingPrice || '');
  const [note, setNote] = useState(editingSale?.note || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setServiceType(editingSale?.serviceType || 'BATTERY_CHARGE');
    setAmount(editingSale?.unitSellingPrice ?? '');
    setNote(editingSale?.note || '');
  }, [editingSale]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return;
    const payload = {
      entryType: 'SERVICE',
      serviceType,
      quantity: 1,
      unitBuyingPrice: 0,
      unitSellingPrice: Number(amount),
      date: selectedDate,
      note
    };

    const url = editingSale ? `${API_BASE}/sales-services/${editingSale._id}` : `${API_BASE}/sales-services`;
    const method = editingSale ? 'PUT' : 'POST';

    setSubmitting(true);
    try {
      const saved = await submitRequest(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-blue-800">সার্ভিস আয় (চার্জ, ভলকানাইজিং ও হাওয়া)</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <button
              type="button"
              onClick={() => setServiceType('BATTERY_CHARGE')}
              className={`${interactiveButton} py-4 rounded-xl font-bold text-base border-2 ${
                serviceType === 'BATTERY_CHARGE' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700'
              }`}
            >
              🔋 ব্যাটারি চার্জ
            </button>
            <button
              type="button"
              onClick={() => setServiceType('VULCANIZING')}
              className={`${interactiveButton} py-4 rounded-xl font-bold text-base border-2 ${
                serviceType === 'VULCANIZING' ? 'bg-blue-600 text-white border-blue-600' : 'bg-slate-50 text-slate-700'
              }`}
            >
              🔧 ভলকানাইজিং
            </button>
            <button
              type="button"
              onClick={() => setServiceType('AIR')}
              className={`${interactiveButton} py-4 rounded-xl font-bold text-base border-2 ${
                serviceType === 'AIR' ? 'bg-cyan-600 text-white border-cyan-600' : 'bg-slate-50 text-slate-700'
              }`}
            >
              💨 হাওয়া
            </button>
          </div>

          <div>
            <p className="text-sm font-bold text-slate-700 mb-2">দ্রুত টাকার পরিমাণ বাছাই করুন</p>
            <div className="flex flex-wrap gap-2">
              {(SERVICE_AMOUNT_PRESETS[serviceType] || []).map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setAmount(String(preset))}
                  className={`${interactiveButton} rounded-full border-2 px-4 py-2 text-sm font-extrabold ${
                    Number(amount) === preset
                      ? 'border-blue-600 bg-blue-50 text-blue-700'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-400 hover:text-blue-700'
                  }`}
                >
                  ৳ {preset}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">কত টাকা পাওয়া গেল? (৳) *</label>
            <input
              type="number"
              required
              placeholder="টাকার পরিমাণ লিখুন"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full border-2 border-blue-500 rounded-xl p-4 text-2xl font-extrabold ${inputClasses}`}
            />
          </div>

          <input
            type="text"
            placeholder="নোট (ঐচ্ছিক)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full border border-slate-300 rounded-xl p-3 text-sm ${inputClasses}`}
          />

          <button type="submit" disabled={submitting} className={`${interactiveButton} w-full bg-blue-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-md flex items-center justify-center gap-2`}>
            {submitting ? <Spinner /> : <Check className="w-5 h-5" />} {submitting ? 'সেভ হচ্ছে...' : 'সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ========================================================
   SUB-COMPONENT 3: দোকানে মাল তোলা (StockInModal)
======================================================== */
function StockInModal({ products, selectedDate, initialProduct = null, onClose, onSuccess }) {
  const [productId, setProductId] = useState(initialProduct?._id || '');
  const [sourceType, setSourceType] = useState('DEALERSHIP');
  const [quantity, setQuantity] = useState(1);
  const [unitBuyingPrice, setUnitBuyingPrice] = useState('');
  const [newRetailPrice, setNewRetailPrice] = useState('');
  const [newWholesalePrice, setNewWholesalePrice] = useState('');
  const [supplierName, setSupplierName] = useState('');
  const [company, setCompany] = useState(initialProduct?.company || '');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (initialProduct) {
      setProductId(initialProduct._id);
      setUnitBuyingPrice(initialProduct.defaultBuyingPrice);
      setNewRetailPrice(initialProduct.defaultRetailPrice);
      setNewWholesalePrice(initialProduct.defaultWholesalePrice);
      setCompany(initialProduct.company || '');
    }
  }, [initialProduct]);

  const handleProductSelect = (id) => {
    setProductId(id);
    const found = products.find(p => p._id === id);
    if (found) {
      setUnitBuyingPrice(found.defaultBuyingPrice);
      setNewRetailPrice(found.defaultRetailPrice);
      setNewWholesalePrice(found.defaultWholesalePrice);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!productId || !Number.isInteger(Number(quantity)) || Number(quantity) < 1 ||
      !Number.isFinite(Number(unitBuyingPrice)) || Number(unitBuyingPrice) < 0) return;
    setSubmitting(true);
    try {
      const saved = await submitRequest(`${API_BASE}/stock-in`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId,
          sourceType,
          supplierName,
          company: company.trim(),
          quantity: Number(quantity),
          unitBuyingPrice: Number(unitBuyingPrice),
          newRetailPrice: Number(newRetailPrice),
          newWholesalePrice: Number(newWholesalePrice),
          date: selectedDate
        })
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-amber-800">
            {initialProduct ? `${initialProduct.name} - Restock` : 'দোকানে নতুন মাল স্টক করুন'}
          </h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setSourceType('DEALERSHIP')}
              className={`${interactiveButton} py-3 rounded-xl font-bold text-sm border ${
                sourceType === 'DEALERSHIP' ? 'bg-amber-600 text-white' : 'bg-slate-50'
              }`}
            >
              ডিলারশিপ থেকে কেনা
            </button>
            <button
              type="button"
              onClick={() => setSourceType('EXTERNAL_SHOP')}
              className={`${interactiveButton} py-3 rounded-xl font-bold text-sm border ${
                sourceType === 'EXTERNAL_SHOP' ? 'bg-amber-600 text-white' : 'bg-slate-50'
              }`}
            >
              বাইরের দোকান / পুরাতন কেনা
            </button>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কোন মালটি এনেছেন? *</label>
            <select
              required
              value={productId}
              onChange={(e) => handleProductSelect(e.target.value)}
              disabled={Boolean(initialProduct)}
              className={`w-full border-2 border-slate-300 rounded-xl p-3.5 text-base font-bold bg-white ${inputClasses}`}
            >
              <option value="">-- মাল সিলেক্ট করুন --</option>
              {products.map(p => (
                <option key={p._id} value={p._id}>{p.name} ({p.condition === 'OLD' ? 'পুরাতন' : 'নতুন'})</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কোম্পানি / ব্র্যান্ডের নাম (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: Linglong, Dunlop, Volta, Hamko, Shell"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className={`w-full border border-slate-300 rounded-xl p-3 ${inputClasses}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">কত পিস এনেছেন? *</label>
              <input
                type="number"
                min="1"
                required
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                className={`w-full border-2 border-slate-300 rounded-xl p-3 text-lg font-extrabold ${inputClasses}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">খুচরা বিক্রির দাম (৳)</label>
              <input
                type="number"
                min="0"
                value={newRetailPrice}
                onChange={(e) => setNewRetailPrice(e.target.value)}
                className={`w-full border-2 border-emerald-400 rounded-xl p-3 text-lg font-extrabold ${inputClasses}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পাইকারি বিক্রির দাম (৳)</label>
              <input
                type="number"
                min="0"
                value={newWholesalePrice}
                onChange={(e) => setNewWholesalePrice(e.target.value)}
                className={`w-full border-2 border-purple-400 rounded-xl p-3 text-lg font-extrabold ${inputClasses}`}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পিস প্রতি কেনা দাম (৳) *</label>
              <input
                type="number"
                required
                value={unitBuyingPrice}
                onChange={(e) => setUnitBuyingPrice(e.target.value)}
                className={`w-full border-2 border-amber-500 rounded-xl p-3 text-lg font-extrabold ${inputClasses}`}
              />
            </div>
          </div>

          <input
            type="text"
            placeholder="ডিলার বা দোকানের নাম (ঐচ্ছিক)"
            value={supplierName}
            onChange={(e) => setSupplierName(e.target.value)}
            className={`w-full border border-slate-300 rounded-xl p-3 text-sm ${inputClasses}`}
          />

          <button type="submit" disabled={submitting} className={`${interactiveButton} w-full bg-amber-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-md flex items-center justify-center gap-2`}>
            {submitting ? <Spinner /> : <PackagePlus className="w-5 h-5" />} {submitting ? 'সেভ হচ্ছে...' : 'স্টকে যোগ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ========================================================
   SUB-COMPONENT 4: দোকানের খরচ লেখা (ExpenseModal)
======================================================== */
function ExpenseModal({ selectedDate, onClose, onSuccess }) {
  const [expenseType, setExpenseType] = useState('DAILY');
  const [category, setCategory] = useState('TEA_SNACKS');
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const dailyCats = ['TEA_SNACKS', 'TRANSPORT', 'DAILY_LABOR', 'SHOP_SUPPLIES', 'OTHER_DAILY'];
  const monthlyCats = ['SHOP_RENT', 'STAFF_SALARY', 'ELECTRICITY_BILL', 'OTHER_MONTHLY'];

  const handleTypeSwitch = (type) => {
    setExpenseType(type);
    setCategory(type === 'DAILY' ? 'TEA_SNACKS' : 'SHOP_RENT');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!Number.isFinite(Number(amount)) || Number(amount) < 0) return;
    setSubmitting(true);
    try {
      const saved = await submitRequest(`${API_BASE}/expenses`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          expenseType,
          category,
          amount: Number(amount),
          date: selectedDate,
          note
        })
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-rose-800">দোকানের খরচ লিখুন</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeSwitch('DAILY')}
              className={`${interactiveButton} py-3 rounded-xl font-bold text-sm border ${
                expenseType === 'DAILY' ? 'bg-rose-600 text-white' : 'bg-slate-50'
              }`}
            >
              প্রতিদিনের খরচ
            </button>
            <button
              type="button"
              onClick={() => handleTypeSwitch('MONTHLY_FIXED')}
              className={`${interactiveButton} py-3 rounded-xl font-bold text-sm border ${
                expenseType === 'MONTHLY_FIXED' ? 'bg-rose-800 text-white' : 'bg-slate-50'
              }`}
            >
              মাসিক নির্দিষ্ট খরচ (ভাড়া/বেতন)
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {(expenseType === 'DAILY' ? dailyCats : monthlyCats).map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory(cat)}
                className={`${interactiveButton} p-3 rounded-xl text-xs font-bold border text-left ${
                  category === cat ? 'bg-rose-100 border-rose-600 text-rose-900' : 'bg-slate-50 border-slate-200'
                }`}
              >
                {EXPENSE_LABELS[cat]}
              </button>
            ))}
          </div>

          <div>
            <label className="block text-sm font-bold text-slate-700 mb-1">কত টাকা খরচ হলো? (৳) *</label>
            <input
              type="number"
              required
              placeholder="টাকার পরিমাণ"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className={`w-full border-2 border-rose-500 rounded-xl p-4 text-2xl font-extrabold ${inputClasses}`}
            />
          </div>

          <input
            type="text"
            placeholder="বিবরণ বা নোট (ঐচ্ছিক)"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={`w-full border border-slate-300 rounded-xl p-3 text-sm ${inputClasses}`}
          />

          <button type="submit" disabled={submitting} className={`${interactiveButton} w-full bg-rose-600 text-white font-extrabold py-4 rounded-xl text-lg shadow-md flex items-center justify-center gap-2`}>
            {submitting ? <Spinner /> : <Wallet className="w-5 h-5" />} {submitting ? 'সেভ হচ্ছে...' : 'খরচ সেভ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}

function AnalyticsView({ analytics, period, onPeriodChange, loading }) {
  const number = (value) => Number(value || 0).toLocaleString('en-US');
  const money = (value) => `৳ ${number(value)}`;
  const card = 'w-full bg-white border border-slate-100 rounded-2xl p-4 shadow-sm hover:shadow-md transition-shadow';
  const chartHeight = 'h-80';
  const maxOf = (items, key) => Math.max(...(items || []).map((item) => Number(item[key] || 0)), 1);
  const percent = (value, total) => total ? `${Math.round((value / total) * 100)}%` : '0%';

  const ChartBars = ({ items = [], labelKey, valueKey, color = 'bg-emerald-500', moneyValue = true }) => {
    const max = maxOf(items, valueKey);
    return items.length ? (
      <div className={`flex items-end gap-2 sm:gap-3 ${chartHeight} w-full pt-5 pb-8`}>
        {items.map((item) => (
          <div key={item[labelKey]} className="relative min-w-0 flex-1 h-full flex flex-col items-center justify-end group">
            <span className="text-[10px] text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap mb-1">
              {moneyValue ? money(item[valueKey]) : number(item[valueKey])}
            </span>
            <div className={`w-full max-w-12 ${color} rounded-t-lg transition-all duration-300 group-hover:opacity-80`} style={{ height: `${Math.max(3, (Number(item[valueKey] || 0) / max) * 100)}%` }} title={`${item[labelKey]}: ${moneyValue ? money(item[valueKey]) : number(item[valueKey])}`} />
            <span className="absolute mt-72 text-[10px] text-slate-500 text-center leading-tight max-w-16">{item[labelKey]}</span>
          </div>
        ))}
      </div>
    ) : <p className="h-80 flex items-center justify-center text-sm text-slate-400">এই সময়ে কোনো তথ্য নেই।</p>;
  };

  const RankedList = ({ items = [], valueKey, color }) => {
    const max = maxOf(items, valueKey);
    return items.length ? <div className="space-y-4">{items.slice(0, 5).map((item, index) => (
      <div key={`${item.name}-${index}`}>
        <div className="flex justify-between gap-3 text-xs font-bold mb-1"><span className="truncate">{index + 1}. {item.name}</span><span className="shrink-0">{valueKey === 'quantity' ? `${number(item[valueKey])} pcs` : money(item[valueKey])}</span></div>
        <div className="h-2 rounded-full bg-slate-100 overflow-hidden"><div className={`h-full rounded-full ${color}`} style={{ width: `${Math.max(4, (Number(item[valueKey] || 0) / max) * 100)}%` }} /></div>
      </div>
    ))}</div> : <p className="text-sm text-slate-400 text-center py-8">এই সময়ে কোনো তথ্য নেই।</p>;
  };

  const Donut = ({ items = [] }) => {
    const total = items.reduce((sum, item) => sum + Number(item.value || 0), 0);
    let offset = 0;
    const colors = ['#10b981', '#3b82f6', '#f59e0b', '#f43f5e', '#8b5cf6'];
    const segments = items.map((item, index) => {
      const start = offset; offset += Number(item.value || 0);
      return { ...item, start, color: colors[index % colors.length] };
    });
    const gradient = total > 0 ? `conic-gradient(${segments.map((item) => `${item.color} ${(item.start / total) * 100}% ${(item.start + item.value) / total * 100}%`).join(', ')})` : '#e2e8f0';
    return <div className="flex flex-col sm:flex-row items-center justify-center gap-6 h-80">
      <div className="relative w-44 h-44 shrink-0 rounded-full" style={{ background: gradient }}>
        <div className="absolute inset-8 rounded-full bg-white flex flex-col items-center justify-center"><span className="text-[10px] text-slate-500">মোট আয়</span><b className="text-sm text-slate-800">{money(total)}</b></div>
      </div>
      <div className="space-y-2 text-xs w-full sm:w-auto">{segments.map((item) => <div key={item.name} className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} /><span className="truncate">{item.name}</span><b className="ml-auto">{percent(item.value, total)}</b></div>)}</div>
    </div>;
  };

  return <div className="space-y-4">
    <div className={card}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3"><div><h2 className="text-lg font-extrabold text-slate-800">হিসাব অ্যানালিটিক্স ও রিপোর্ট</h2><p className="text-xs text-slate-500 mt-1">বিক্রি, লাভ, খরচ এবং ব্যস্ত সময়ের বিশ্লেষণ</p></div><div className="grid grid-cols-3 gap-2 w-full sm:w-auto">{[['daily', 'আজকের'], ['weekly', 'চলতি সপ্তাহ'], ['monthly', 'চলতি মাস']].map(([value, label]) => <button key={value} onClick={() => onPeriodChange(value)} className={`py-2 px-3 rounded-lg text-xs font-bold border transition-colors ${period === value ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 border-slate-200 text-slate-700'}`}>{label}</button>)}</div></div>
    </div>
    {loading && !analytics ? <div className={`${card} h-80 flex items-center justify-center text-slate-500`}>অ্যানালিটিক্স লোড হচ্ছে...</div> : analytics && <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{[['মোট বিক্রি', analytics.summary.totalRevenue, 'text-emerald-700'], ['মোট লাভ', analytics.summary.grossProfit, 'text-blue-700'], ['মোট খরচ', analytics.summary.totalExpenses, 'text-rose-700'], ['নিট লাভ', analytics.summary.netProfit, analytics.summary.netProfit >= 0 ? 'text-emerald-700' : 'text-rose-700']].map(([label, value, color]) => <div key={label} className={card}><p className="text-xs font-bold text-slate-500">{label}</p><p className={`text-xl font-extrabold mt-1 ${color}`}>{money(value)}</p></div>)}</div>
      <div className={card}><div className="flex items-center justify-between mb-3"><h3 className="font-extrabold">বিক্রি বনাম লাভ বনাম খরচ</h3><span className="text-[10px] text-slate-400">English numerals</span></div><div className="flex gap-4 text-xs font-bold mb-2"><span className="text-emerald-600">● বিক্রি</span><span className="text-blue-600">● লাভ</span><span className="text-rose-600">● খরচ</span></div><div className={`relative ${chartHeight} w-full flex items-end gap-1 sm:gap-2 border-b border-slate-200 bg-[linear-gradient(to_bottom,transparent_24%,#f1f5f9_25%,transparent_26%,transparent_49%,#f1f5f9_50%,transparent_51%,transparent_74%,#f1f5f9_75%,transparent_76%)]`}>{analytics.trend.length ? analytics.trend.map((item) => { const scale = Math.max(...analytics.trend.flatMap((row) => [row.revenue, row.profit, row.expenses]), 1); return <div key={item.date} className="flex-1 h-full flex items-end justify-center gap-px group min-w-0"><div className="w-1/3 max-w-5 bg-emerald-500 rounded-t" style={{ height: `${Math.max(2, item.revenue / scale * 100)}%` }} title={`Sales ${money(item.revenue)}`} /><div className="w-1/3 max-w-5 bg-blue-500 rounded-t" style={{ height: `${Math.max(2, item.profit / scale * 100)}%` }} title={`Profit ${money(item.profit)}`} /><div className="w-1/3 max-w-5 bg-rose-500 rounded-t" style={{ height: `${Math.max(2, item.expenses / scale * 100)}%` }} title={`Expense ${money(item.expenses)}`} /><span className="absolute bottom-[-22px] text-[9px] text-slate-500">{item.date.slice(5)}</span></div>; }) : <p className="w-full text-center self-center text-sm text-slate-400">এই সময়ে কোনো তথ্য নেই।</p>}</div></div>
      <div className="grid lg:grid-cols-2 gap-4"><div className={card}><h3 className="font-extrabold mb-1">আয়ের বণ্টন</h3><p className="text-xs text-slate-500">বিভাগ অনুযায়ী মোট বিক্রির অংশ</p><Donut items={analytics.revenueDistribution} /></div><div className={card}><h3 className="font-extrabold mb-1">বার ভিত্তিক বিক্রি</h3><p className="text-xs text-slate-500">কোন দিনে বিক্রি বেশি হয়েছে</p><ChartBars items={analytics.byDay} labelKey="day" valueKey="revenue" color="bg-indigo-500" /></div></div>
      <div className={card}><h3 className="font-extrabold mb-1">সময় ও দিনের ব্যস্ততা</h3><p className="text-xs text-slate-500">সময় স্লট অনুযায়ী বিক্রি</p><ChartBars items={analytics.byTimeSlot} labelKey="slot" valueKey="revenue" color="bg-amber-500" /></div>
      <div className="grid lg:grid-cols-2 gap-4"><div className={card}><h3 className="font-extrabold mb-4">শীর্ষ ৫টি বিক্রিত পণ্য ও সার্ভিস</h3><RankedList items={analytics.topByQuantity} valueKey="quantity" color="bg-emerald-500" /></div><div className={card}><h3 className="font-extrabold mb-4">শীর্ষ ৫টি লাভজনক পণ্য ও সার্ভিস</h3><RankedList items={analytics.topByProfit} valueKey="profit" color="bg-blue-500" /></div></div>
    </>}
  </div>;
}

function ExpenseReportView({
  expenses,
  summary,
  preset,
  startDate,
  endDate,
  type,
  loading,
  onPresetChange,
  onStartDateChange,
  onEndDateChange,
  onTypeChange,
  onPreview
}) {
  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow-sm p-4 space-y-3">
        <div className="flex justify-between items-center gap-2">
          <div>
            <h2 className="text-lg font-extrabold text-slate-800">হিসাব ও লেনদেন রিপোর্ট</h2>
            <p className="text-xs text-slate-500">বিক্রি, সার্ভিস এবং খরচের সম্পূর্ণ হিসাব</p>
          </div>
          <button
            onClick={onPreview}
            disabled={!expenses.length}
            className="px-3 py-2 rounded-lg bg-emerald-700 text-white text-xs font-bold disabled:opacity-40 flex items-center gap-1"
          >
            <Download className="w-4 h-4" /> PDF Preview
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          {[
            ['TODAY', 'আজ'],
            ['THIS_WEEK', 'এই সপ্তাহ'],
            ['THIS_MONTH', 'এই মাস'],
            ['CUSTOM', 'নিজের তারিখ']
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => onPresetChange(value)}
              className={`py-2 rounded-lg text-xs font-bold border ${
                preset === value ? 'bg-emerald-700 text-white border-emerald-700' : 'bg-slate-50 text-slate-700 border-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <label className="text-xs font-bold text-slate-600">
            শুরু
            <input type="date" value={startDate} onChange={(e) => onStartDateChange(e.target.value)} className="w-full mt-1 border rounded-lg p-2 text-sm" />
          </label>
          <label className="text-xs font-bold text-slate-600">
            শেষ
            <input type="date" value={endDate} onChange={(e) => onEndDateChange(e.target.value)} className="w-full mt-1 border rounded-lg p-2 text-sm" />
          </label>
        </div>

        <select value={type} onChange={(e) => onTypeChange(e.target.value)} className="w-full border rounded-lg p-2.5 text-sm font-bold bg-white">
          <option value="ALL">সবগুলো</option>
          <option value="SALE">শুধু মালের বিক্রি</option>
          <option value="SERVICE">শুধু সার্ভিস</option>
          <option value="EXPENSE">শুধু খরচ</option>
        </select>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-emerald-600">
          <p className="text-xs text-slate-500 font-bold">মোট বিক্রি ও সার্ভিস</p>
          <p className="text-2xl font-extrabold text-emerald-700 mt-1">৳ {summary.totalInflow.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-rose-600">
          <p className="text-xs text-slate-500 font-bold">মোট খরচ</p>
          <p className="text-2xl font-extrabold text-rose-700 mt-1">৳ {summary.totalExpenses.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-blue-600">
          <p className="text-xs text-slate-500 font-bold">মোট লাভ</p>
          <p className="text-2xl font-extrabold text-blue-700 mt-1">৳ {summary.totalProfit.toLocaleString()}</p>
        </div>
        <div className="bg-white rounded-xl shadow-sm p-4 border-l-4 border-slate-700">
          <p className="text-xs text-slate-500 font-bold">ক্যাশ জমা / ব্যালেন্স</p>
          <p className="text-2xl font-extrabold text-slate-800 mt-1">৳ {summary.netCashBalance.toLocaleString()}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <p className="p-6 text-center text-slate-500 text-sm">রিপোর্ট লোড হচ্ছে...</p>
        ) : expenses.length === 0 ? (
          <p className="p-6 text-center text-slate-500 text-sm">এই ফিল্টারে কোনো খরচ পাওয়া যায়নি।</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-800 text-white">
                <tr>
                  <th className="p-3 whitespace-nowrap">সময় ও তারিখ</th>
                  <th className="p-3 whitespace-nowrap">ধরণ / টাইপ</th>
                  <th className="p-3 min-w-48">বিবরণ / প্রোডাক্ট</th>
                  <th className="p-3 text-right whitespace-nowrap">বিক্রয় / প্রাপ্তি</th>
                  <th className="p-3 text-right whitespace-nowrap">খরচ</th>
                  <th className="p-3 text-right whitespace-nowrap">লাভ</th>
                </tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id} className="border-b last:border-0">
                    <td className="p-3 whitespace-nowrap">{formatDateTime(item.date)}</td>
                    <td className={`p-3 font-bold ${item.type === 'EXPENSE' ? 'text-rose-700' : item.type === 'SERVICE' ? 'text-blue-700' : 'text-emerald-700'}`}>{item.typeLabel}</td>
                    <td className="p-3 text-slate-600"><b>{item.description}</b>{item.note && <span className="block text-[11px]">{item.note}</span>}</td>
                    <td className="p-3 text-right font-extrabold text-emerald-700">{item.inflow ? `৳ ${item.inflow.toLocaleString()}` : '—'}</td>
                    <td className="p-3 text-right font-extrabold text-rose-700">{item.expense ? `- ৳ ${item.expense.toLocaleString()}` : '—'}</td>
                    <td className="p-3 text-right font-extrabold text-blue-700">{item.type !== 'EXPENSE' ? `৳ ${item.profit.toLocaleString()}` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

const escapeHtml = (value) => String(value)
  .replaceAll('&', '&amp;')
  .replaceAll('<', '&lt;')
  .replaceAll('>', '&gt;')
  .replaceAll('"', '&quot;')
  .replaceAll("'", '&#039;');

function ExpensePdfViewer({ expenses, summary, startDate, endDate, onClose }) {
  const printStatement = () => {
    const printWindow = window.open('', '_blank', 'width=900,height=700');
    if (!printWindow) {
      window.alert('PDF preview খোলার জন্য browser popup allow করুন।');
      return;
    }
    const rows = expenses.map((item) => `
      <tr>
        <td>${escapeHtml(formatDateTime(item.date))}</td>
        <td>${escapeHtml(item.typeLabel)}</td>
        <td>${escapeHtml(`${item.description}${item.note ? ` — ${item.note}` : ''}`)}</td>
        <td class="amount">${item.inflow ? Number(item.inflow).toLocaleString('bn-BD') : '—'}</td>
        <td class="amount">${item.expense ? Number(item.expense).toLocaleString('bn-BD') : '—'}</td>
        <td class="amount">${item.type !== 'EXPENSE' ? Number(item.profit).toLocaleString('bn-BD') : '—'}</td>
      </tr>
    `).join('');
    printWindow.document.write(`
      <!doctype html>
      <html lang="bn">
        <head>
          <meta charset="UTF-8">
          <title>Expense Statement</title>
          <style>
            @page { size: A4; margin: 14mm; }
            body { font-family: "Noto Sans Bengali", "SolaimanLipi", Arial, sans-serif; color: #0f172a; }
            h1 { margin: 0; color: #065f46; font-size: 22px; }
            h2 { margin: 4px 0; font-size: 14px; font-weight: 500; }
            .meta { color: #475569; font-size: 12px; margin: 12px 0 18px; }
            table { width: 100%; border-collapse: collapse; font-size: 11px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
            th { background: #064e3b; color: white; }
            .amount { text-align: right; font-weight: bold; }
            .total { margin-top: 16px; padding: 12px; border: 2px solid #047857; background: #ecfdf5; text-align: right; font-size: 16px; font-weight: bold; }
            .printed { margin-top: 14px; color: #64748b; font-size: 10px; }
          </style>
        </head>
        <body>
          <h1>সিফাত টায়ার অ্যান্ড ব্যাটারি শপ</h1>
          <h2>হিসাব ও লেনদেনের সম্পূর্ণ বিবরণী</h2>
          <div class="meta">সময়কাল: ${escapeHtml(startDate)} থেকে ${escapeHtml(endDate)}</div>
          <table>
            <thead><tr><th>তারিখ ও সময়</th><th>ধরণ</th><th>বিবরণ / প্রোডাক্ট</th><th>প্রাপ্তি (৳)</th><th>খরচ (৳)</th><th>লাভ (৳)</th></tr></thead>
            <tbody>${rows}</tbody>
          </table>
          <div class="total">মোট প্রাপ্তি: ৳ ${Number(summary.totalInflow).toLocaleString('bn-BD')} | মোট খরচ: ৳ ${Number(summary.totalExpenses).toLocaleString('bn-BD')} | নিট ব্যালেন্স: ৳ ${Number(summary.netCashBalance).toLocaleString('bn-BD')}</div>
          <div class="printed">প্রিন্টের সময়: ${escapeHtml(formatDateTime(new Date()))}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.focus();
    printWindow.onload = () => printWindow.print();
  };

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-3">
      <div className="bg-white rounded-xl w-full max-w-3xl max-h-[94vh] overflow-hidden flex flex-col">
        <div className="p-4 border-b flex justify-between items-center">
          <div>
            <h3 className="font-extrabold text-emerald-800">PDF Statement Preview</h3>
            <p className="text-xs text-slate-500">Download PDF চাপলে browser-এর print dialog খুলবে</p>
          </div>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <div className="p-4 overflow-y-auto">
          <div className="border-2 border-slate-200 p-4 bg-white">
            <h1 className="text-xl font-extrabold text-emerald-800">সিফাত টায়ার অ্যান্ড ব্যাটারি শপ</h1>
            <p className="text-sm font-bold">হিসাব ও লেনদেনের সম্পূর্ণ বিবরণী</p>
            <p className="text-xs text-slate-500 mt-1">সময়কাল: {startDate} থেকে {endDate}</p>
            <table className="w-full mt-4 text-xs border-collapse">
              <thead className="bg-emerald-800 text-white">
                <tr><th className="p-2 border text-left">তারিখ ও সময়</th><th className="p-2 border text-left">ধরণ</th><th className="p-2 border text-left">বিবরণ / প্রোডাক্ট</th><th className="p-2 border text-right">প্রাপ্তি</th><th className="p-2 border text-right">খরচ</th><th className="p-2 border text-right">লাভ</th></tr>
              </thead>
              <tbody>
                {expenses.map((item) => (
                  <tr key={item.id}>
                    <td className="p-2 border">{formatDateTime(item.date)}</td>
                    <td className="p-2 border">{item.typeLabel}</td>
                    <td className="p-2 border">{item.description}{item.note ? ` — ${item.note}` : ''}</td>
                    <td className="p-2 border text-right font-bold">{item.inflow ? item.inflow.toLocaleString() : '—'}</td>
                    <td className="p-2 border text-right font-bold">{item.expense ? item.expense.toLocaleString() : '—'}</td>
                    <td className="p-2 border text-right font-bold">{item.type !== 'EXPENSE' ? item.profit.toLocaleString() : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="mt-4 p-3 bg-emerald-50 border-2 border-emerald-600 text-right font-extrabold">
              মোট প্রাপ্তি: ৳ {summary.totalInflow.toLocaleString()} | মোট খরচ: ৳ {summary.totalExpenses.toLocaleString()} | নিট ব্যালেন্স: ৳ {summary.netCashBalance.toLocaleString()}
            </div>
            <p className="text-[10px] text-slate-500 mt-3">প্রিন্টের সময়: {formatDateTime(new Date())}</p>
          </div>
        </div>
        <div className="p-4 border-t flex justify-end gap-2">
          <button onClick={onClose} className="px-4 py-2 rounded-lg bg-slate-100 font-bold">বন্ধ করুন</button>
          <button onClick={printStatement} className="px-4 py-2 rounded-lg bg-emerald-700 text-white font-bold flex items-center gap-1">
            <Download className="w-4 h-4" /> Download PDF
          </button>
        </div>
      </div>
    </div>
  );
}

function StockValuationModal({ valuation, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 sm:items-center sm:p-4">
      <div className="w-full max-w-lg space-y-4 rounded-t-2xl bg-white p-5 sm:rounded-2xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-extrabold text-emerald-800">স্টক হিসাব</h3>
          <button onClick={onClose} className="rounded-full bg-slate-100 p-2" aria-label="বন্ধ করুন">
            <X className="h-5 w-5" />
          </button>
        </div>
        <div className="rounded-xl bg-emerald-950 p-4 text-white">
          <p className="text-sm font-semibold text-emerald-200">মোট স্টকের কেনা মূল্য</p>
          <p className="mt-1 text-3xl font-extrabold text-yellow-300">{formatMoney(valuation.totalValue)}</p>
          <p className="mt-2 text-sm text-emerald-100">
            মোট মালের সংখ্যা: <b>{valuation.totalUnits.toLocaleString('en-IN')} পিস</b>
          </p>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            ['টায়ার', valuation.tireValue],
            ['ব্যাটারি', valuation.batteryValue],
            ['মবিল / অন্যান্য', valuation.otherValue]
          ].map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-slate-50 p-3">
              <p className="text-xs font-bold text-slate-500">{label}</p>
              <p className="mt-1 font-extrabold text-slate-900">{formatMoney(value)}</p>
            </div>
          ))}
        </div>
        <button onClick={onClose} className="w-full rounded-xl bg-slate-800 py-3 font-bold text-white">
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
}

function ProductMasterModal({ product, onClose, onSuccess }) {
  const [name, setName] = useState(product?.name || '');
  const [company, setCompany] = useState(product?.company || '');
  const [category, setCategory] = useState(product?.category || 'TIRE');
  const [defaultBuyingPrice, setDefaultBuyingPrice] = useState(product?.defaultBuyingPrice ?? '');
  const [defaultRetailPrice, setDefaultRetailPrice] = useState(product?.defaultRetailPrice ?? '');
  const [defaultWholesalePrice, setDefaultWholesalePrice] = useState(product?.defaultWholesalePrice ?? '');
  const [lowStockAlert, setLowStockAlert] = useState(product?.lowStockAlert ?? 2);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim() || [defaultBuyingPrice, defaultRetailPrice, defaultWholesalePrice, lowStockAlert]
      .some(value => !Number.isFinite(Number(value)) || Number(value) < 0)) return;
    setSubmitting(true);
    try {
      const saved = await submitRequest(`${API_BASE}/products/${product._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          company: company.trim(),
          category,
          defaultBuyingPrice: Number(defaultBuyingPrice),
          defaultRetailPrice: Number(defaultRetailPrice),
          defaultWholesalePrice: Number(defaultWholesalePrice),
          lowStockAlert: Number(lowStockAlert)
        })
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-blue-800">Product Master এডিট</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>
        <p className="text-xs text-slate-500">এখান থেকে নাম ও দাম বদলাবে; বর্তমান stock বদলাবে না। Stock বাড়াতে Restock ব্যবহার করুন।</p>
        <form onSubmit={handleSubmit} className="space-y-3">
          <input required value={name} onChange={(e) => setName(e.target.value)} placeholder="পণ্যের নাম" className="w-full border-2 border-slate-300 rounded-xl p-3 font-bold" />
          <input value={company} onChange={(e) => setCompany(e.target.value)} placeholder="কোম্পানি / ব্র্যান্ডের নাম (ঐচ্ছিক)" className="w-full border border-slate-300 rounded-xl p-3" />
          <label className="block text-xs font-bold text-slate-700">
            ক্যাটাগরি
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="mt-1 w-full rounded-xl border border-slate-300 bg-white p-3 text-sm font-bold"
            >
              {Object.entries(CATEGORY_LABELS).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="text-xs font-bold">কেনা দাম
              <input type="number" min="0" value={defaultBuyingPrice} onChange={(e) => setDefaultBuyingPrice(e.target.value)} className="w-full border rounded-xl p-3 text-base mt-1" />
            </label>
            <label className="text-xs font-bold">খুচরা দাম
              <input type="number" min="0" value={defaultRetailPrice} onChange={(e) => setDefaultRetailPrice(e.target.value)} className="w-full border rounded-xl p-3 text-base mt-1" />
            </label>
            <label className="text-xs font-bold">পাইকারি দাম
              <input type="number" min="0" value={defaultWholesalePrice} onChange={(e) => setDefaultWholesalePrice(e.target.value)} className="w-full border rounded-xl p-3 text-base mt-1" />
            </label>
            <label className="text-xs font-bold">Low stock alert
              <input type="number" min="0" value={lowStockAlert} onChange={(e) => setLowStockAlert(e.target.value)} className="w-full border rounded-xl p-3 text-base mt-1" />
            </label>
          </div>
          <button type="submit" disabled={submitting} className={`${interactiveButton} w-full bg-blue-600 text-white font-extrabold py-4 rounded-xl flex items-center justify-center gap-2`}>
            {submitting ? <Spinner /> : <Check className="w-5 h-5" />} {submitting ? 'আপডেট হচ্ছে...' : 'Update Product'}
          </button>
        </form>
      </div>
    </div>
  );
}

/* ========================================================
   SUB-COMPONENT 5: নতুন মালের নাম তালিকায় যোগ করা (NewProductModal)
======================================================== */
function NewProductModal({ onClose, onSuccess }) {
  const [name, setName] = useState('');
  const [company, setCompany] = useState('');
  const [category, setCategory] = useState('TIRE');
  const [condition, setCondition] = useState('NEW');
  const [currentStock, setCurrentStock] = useState(0);
  const [defaultBuyingPrice, setDefaultBuyingPrice] = useState('');
  const [defaultRetailPrice, setDefaultRetailPrice] = useState('');
  const [defaultWholesalePrice, setDefaultWholesalePrice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const saved = await submitRequest(`${API_BASE}/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          company: company.trim(),
          category,
          condition: (category === 'MOBIL' || category === 'BATTERY_WATER') ? 'NA' : condition,
          currentStock: Number(currentStock),
          defaultBuyingPrice: Number(defaultBuyingPrice),
          defaultRetailPrice: Number(defaultRetailPrice || 0),
          defaultWholesalePrice: Number(defaultWholesalePrice || 0)
        })
      });
      if (saved) onSuccess();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="bg-white w-full max-w-lg rounded-t-2xl sm:rounded-2xl p-5 space-y-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center border-b pb-3">
          <h3 className="text-lg font-extrabold text-slate-800">তালিকায় নতুন মালের নাম যোগ করুন</h3>
          <button onClick={onClose} className="p-2 bg-slate-100 rounded-full"><X className="w-5 h-5" /></button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">ক্যাটাগরি *</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 font-bold bg-white"
            >
              {Object.entries(CATEGORY_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>

          {(category === 'TIRE' || category === 'BATTERY' || category === 'TUBE') && (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setCondition('NEW')}
                className={`py-2.5 rounded-xl font-bold text-sm border ${condition === 'NEW' ? 'bg-emerald-600 text-white' : 'bg-slate-50'}`}
              >
                নতুন (New)
              </button>
              <button
                type="button"
                onClick={() => setCondition('OLD')}
                className={`py-2.5 rounded-xl font-bold text-sm border ${condition === 'OLD' ? 'bg-amber-600 text-white' : 'bg-slate-50'}`}
              >
                পুরাতন (Old)
              </button>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">মালের নাম ও সাইজ *</label>
            <input
              type="text"
              required
              placeholder="যেমন: Maxxis 185/65 R15 বা Hamko 100Ah IPS"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3 font-bold"
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">কোম্পানি / ব্র্যান্ডের নাম (ঐচ্ছিক)</label>
            <input
              type="text"
              placeholder="যেমন: Linglong, Dunlop, Volta, Hamko, Shell"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="w-full border border-slate-300 rounded-xl p-3"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">বর্তমানে স্টকে কয় পিস আছে?</label>
              <input
                type="number"
                value={currentStock}
                onChange={(e) => setCurrentStock(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">গড় কেনা দাম (৳) *</label>
              <input
                type="number"
                required
                value={defaultBuyingPrice}
                onChange={(e) => setDefaultBuyingPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">খুচরা বিক্রির দাম (৳)</label>
              <input
                type="number"
                value={defaultRetailPrice}
                onChange={(e) => setDefaultRetailPrice(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-bold"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">পাইকারি বিক্রির দাম (৳)</label>
              <input
                type="number"
                value={defaultWholesalePrice}
                onChange={(e) => setDefaultWholesalePrice(e.target.value)}
                className="w-full border border-slate-300 rounded-xl p-3 font-bold"
              />
            </div>
          </div>

          <button type="submit" disabled={submitting} className={`${interactiveButton} w-full bg-emerald-700 text-white font-extrabold py-4 rounded-xl text-base shadow-md flex items-center justify-center gap-2`}>
            {submitting ? <Spinner /> : <PlusCircle className="w-5 h-5" />} {submitting ? 'যোগ হচ্ছে...' : 'তালিকায় যোগ করুন'}
          </button>
        </form>
      </div>
    </div>
  );
}