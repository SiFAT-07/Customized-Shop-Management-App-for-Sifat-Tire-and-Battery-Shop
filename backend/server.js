require('dotenv').config();
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const shopRoutes = require('./routes/shopRoutes');

const app = express();

app.use(cors());
app.use(express.json());

app.use('/api/shop', shopRoutes);

const PORT = process.env.PORT || 5000;

async function startServer() {
  try {
    console.log('⏳ Connecting to MongoDB...');
    const MONGO_URI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/tire_battery_shop';

    try {
      // প্রথমে সাধারণ MongoDB কানেক্ট করার চেষ্টা করবে
      await mongoose.connect(MONGO_URI, { serverSelectionTimeoutMS: 2000 });
      console.log('✅ Connected to Standard MongoDB!');
    } catch (localErr) {
      // পিসিতে MongoDB চালু না থাকলে অটোমেটিক বিল্ট-ইন ডাটাবেজ চালু করবে
      console.log('⚡ Local MongoDB service off. Starting built-in portable MongoDB...');
      const { MongoMemoryServer } = require('mongodb-memory-server');
      
      const dbPath = path.join(__dirname, 'shop_database');
      if (!fs.existsSync(dbPath)) fs.mkdirSync(dbPath, { recursive: true });

      const mongod = await MongoMemoryServer.create({
        instance: {
          dbPath: dbPath,
          storageEngine: 'wiredTiger' // যাতে পিসি বন্ধ করলেও ডাটা সেভ থাকে
        }
      });

      const uri = mongod.getUri();
      await mongoose.connect(uri, { dbName: 'tire_battery_shop' });
      console.log('✅ Built-in MongoDB Connected Successfully! (Data saved in backend/shop_database)');
    }

    app.listen(PORT, () => {
      console.log(`🚀 Server running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('❌ Server Error:', err.message);
  }
}

startServer();