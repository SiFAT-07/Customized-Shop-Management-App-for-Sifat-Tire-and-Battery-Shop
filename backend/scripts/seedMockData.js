const API_BASE = process.env.API_BASE || 'http://localhost:5000/api/shop';

const products = [
  ['Demo Maxxis 185/65 R15', 'TIRE', 'PRIVATE_CAR_TIRE', 'NEW', 8, 6200, 7600, 7200],
  ['Demo Bridgestone 195/65 R15', 'TIRE', 'PRIVATE_CAR_TIRE', 'NEW', 6, 6800, 8200, 7800],
  ['Demo Used Tyre 175/70 R14', 'TIRE', 'PRIVATE_CAR_TIRE', 'OLD', 5, 1800, 2800, 2500],
  ['Demo Hamko 100Ah Battery', 'BATTERY', 'CAR_BATTERY', 'NEW', 7, 9200, 11000, 10400],
  ['Demo Rahimafrooz 120Ah Battery', 'BATTERY', 'CAR_BATTERY', 'NEW', 4, 12500, 14500, 13800],
  ['Demo Used IPS Battery 150Ah', 'BATTERY', 'IPS_BATTERY', 'OLD', 3, 4200, 6000, 5500],
  ['Demo Tube 12 Inch', 'TUBE', 'GENERAL', 'NEW', 15, 450, 700, 620],
  ['Demo Tube 14 Inch', 'TUBE', 'GENERAL', 'NEW', 12, 550, 850, 760],
  ['Demo Mobil 4T 20W-50 1L', 'MOBIL', 'GENERAL', 'NA', 18, 520, 750, 680],
  ['Demo Mobil Super 4L', 'MOBIL', 'GENERAL', 'NA', 8, 1800, 2350, 2200],
  ['Demo Battery Water 1L', 'BATTERY_WATER', 'GENERAL', 'NA', 20, 80, 150, 125],
  ['Demo Solar Battery 200Ah', 'BATTERY', 'SOLAR_BATTERY', 'NEW', 3, 18000, 21500, 20500]
];

const localDate = (offset = 0) => {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() - offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options
  });
  const result = await response.json();
  if (!response.ok || !result.success) {
    throw new Error(result.message || `Request failed: ${path}`);
  }
  return result;
}

async function seed() {
  const createdProducts = [];

  for (const [name, category, subCategory, condition, quantity, buying, retail, wholesale] of products) {
    const productResult = await request('/products', {
      method: 'POST',
      body: JSON.stringify({
        name,
        category,
        subCategory,
        condition,
        currentStock: 0,
        defaultBuyingPrice: buying,
        defaultRetailPrice: retail,
        defaultWholesalePrice: wholesale,
        lowStockAlert: 2
      })
    });
    const product = productResult.data;
    createdProducts.push(product);

    await request('/stock-in', {
      method: 'POST',
      body: JSON.stringify({
        productId: product._id,
        sourceType: condition === 'OLD' ? 'OLD_CUSTOMER_BUY' : 'DEALERSHIP',
        supplierName: condition === 'OLD' ? 'Demo পুরাতন কাস্টমার' : 'Demo Dealer',
        quantity,
        unitBuyingPrice: buying,
        newRetailPrice: retail,
        newWholesalePrice: wholesale,
        date: localDate(14),
        note: 'Demo testing stock'
      })
    });
  }

  const sales = [
    [0, 1, 1, 'RETAIL'],
    [0, 2, 1, 'WHOLESALE'],
    [1, 1, 2, 'RETAIL'],
    [2, 3, 1, 'WHOLESALE'],
    [3, 0, 1, 'RETAIL'],
    [4, 1, 1, 'WHOLESALE'],
    [5, 2, 1, 'RETAIL'],
    [6, 4, 3, 'RETAIL'],
    [7, 5, 2, 'WHOLESALE'],
    [8, 6, 2, 'RETAIL'],
    [9, 0, 1, 'WHOLESALE'],
    [10, 7, 2, 'RETAIL'],
    [11, 1, 1, 'RETAIL']
  ];

  for (const [dayOffset, productIndex, quantity, saleChannel] of sales) {
    const product = createdProducts[productIndex];
    const buying = product.defaultBuyingPrice;
    const selling = saleChannel === 'WHOLESALE'
      ? product.defaultWholesalePrice
      : product.defaultRetailPrice;
    await request('/sales-services', {
      method: 'POST',
      body: JSON.stringify({
        entryType: 'PRODUCT_SALE',
        product: product._id,
        saleChannel,
        isDirectFromOutside: false,
        quantity,
        unitBuyingPrice: buying,
        unitSellingPrice: selling,
        date: localDate(dayOffset),
        note: `Demo ${saleChannel.toLowerCase()} sale`
      })
    });
  }

  await request('/sales-services', {
    method: 'POST',
    body: JSON.stringify({
      entryType: 'PRODUCT_SALE',
      product: null,
      customProductName: 'Demo Outside Imported Tyre',
      isDirectFromOutside: true,
      saleChannel: 'RETAIL',
      quantity: 1,
      unitBuyingPrice: 3000,
      unitSellingPrice: 4200,
      date: localDate(0),
      note: 'Demo direct outside sale'
    })
  });

  const services = [
    ['BATTERY_CHARGE', 250, 0],
    ['VULCANIZING', 450, 1],
    ['BATTERY_CHARGE', 300, 3],
    ['VULCANIZING', 600, 5],
    ['OTHER_SERVICE', 200, 8],
    ['BATTERY_CHARGE', 350, 10]
  ];
  for (const [serviceType, amount, dayOffset] of services) {
    await request('/sales-services', {
      method: 'POST',
      body: JSON.stringify({
        entryType: 'SERVICE',
        serviceType,
        quantity: 1,
        unitBuyingPrice: 0,
        unitSellingPrice: amount,
        date: localDate(dayOffset),
        note: 'Demo service income'
      })
    });
  }

  const expenses = [
    ['DAILY', 'TEA_SNACKS', 180, 0],
    ['DAILY', 'TRANSPORT', 650, 1],
    ['DAILY', 'SHOP_SUPPLIES', 420, 3],
    ['DAILY', 'DAILY_LABOR', 800, 5],
    ['DAILY', 'OTHER_DAILY', 250, 8],
    ['MONTHLY_FIXED', 'SHOP_RENT', 18000, 2],
    ['MONTHLY_FIXED', 'STAFF_SALARY', 12000, 4],
    ['MONTHLY_FIXED', 'ELECTRICITY_BILL', 3200, 7],
    ['MONTHLY_FIXED', 'OTHER_MONTHLY', 900, 10]
  ];
  for (const [expenseType, category, amount, dayOffset] of expenses) {
    await request('/expenses', {
      method: 'POST',
      body: JSON.stringify({
        expenseType,
        category,
        amount,
        date: localDate(dayOffset),
        note: 'Demo testing expense'
      })
    });
  }

  console.log(`Mock data added successfully: ${createdProducts.length} products, ${sales.length + 1} product sales, ${services.length} services, and ${expenses.length} expenses.`);
}

seed().catch((error) => {
  console.error(`Mock data seeding failed: ${error.message}`);
  process.exitCode = 1;
});
