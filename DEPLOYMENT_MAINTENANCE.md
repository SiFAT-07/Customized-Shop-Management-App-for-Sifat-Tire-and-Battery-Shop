# Sifat Tire & Battery Shop
## Deployment and Maintenance Guide

Ei guide-e live application-er links, deployment configuration, health checks, troubleshooting, ebong redeploy process deya holo.

> **Security:** MongoDB password, full connection string, ba onno kono secret GitHub-e commit korben na. Render/Vercel-er Environment Variables-e secret rakhben.

---

## 1. Live Services

| Service | URL / Details |
|---|---|
| Frontend (Vercel) | https://customized-shop-management-app-for.vercel.app |
| Backend API (Render) | https://customized-shop-management-app-for-sifat.onrender.com |
| Database | MongoDB Atlas — `sifatshop` cluster |
| Repository | https://github.com/SiFAT-07/Customized-Shop-Management-App-for-Sifat-Tire-and-Battery-Shop |

### Architecture

```text
Phone / Browser
      |
      v
Vercel Frontend
      |
      v
Render Express API
      |
      v
MongoDB Atlas
```

---

## 2. Environment Variables

### 2.1 Render Backend

Render Dashboard → service → **Environment**

| Key | Value | Purpose |
|---|---|---|
| `MONGO_URI` | MongoDB Atlas connection URI | Atlas database connection |
| `FRONTEND_URL` | `https://customized-shop-management-app-for.vercel.app` | CORS whitelist |
| `NODE_ENV` | `production` | Production mode |
| `PORT` | Render-provided port or `5000` | API server port |

### Render Commands

| Setting | Value |
|---|---|
| Root Directory | `backend` |
| Build Command | `npm install` |
| Start Command | `npm start` |
| Health Check Path | `/health` |

The backend health URL is:

```text
https://customized-shop-management-app-for-sifat.onrender.com/health
```

Expected response:

```json
{
  "success": true,
  "service": "sifat-tyre-battery-api",
  "database": "connected"
}
```

### 2.2 Vercel Frontend

Vercel Dashboard → project → **Settings → Environment Variables**

| Key | Value |
|---|---|
| `VITE_API_BASE` | `https://customized-shop-management-app-for-sifat.onrender.com` |

`VITE_API_BASE`-এর শেষে `/api/shop` বা extra `/` দেবেন না। Frontend code নিজে `/api/shop` যোগ করে।

### 2.3 Local Development

File: `backend/.env`

```env
MONGO_URI=your-mongodb-atlas-connection-uri
PORT=5000
FRONTEND_URL=http://localhost:5173
NODE_ENV=development
```

File: `frontend/.env.local`

```env
VITE_API_BASE=http://localhost:5000
```

Local app চালাতে:

```bash
cd backend
npm start
```

অন্য terminal-এ:

```bash
cd frontend
npm run dev
```

---

## 3. Health Check and Diagnosis

### Step 1: Backend API Check

Browser-এ এই URL খুলুন:

```text
https://customized-shop-management-app-for-sifat.onrender.com/health
```

তারপর API check করুন:

```text
https://customized-shop-management-app-for-sifat.onrender.com/api/shop/products
```

Expected response:

```json
{
  "success": true,
  "data": []
}
```

Render free service-এ ১৫ মিনিট traffic না থাকলে server sleep করতে পারে। প্রথম request-এ ৩০–৫০ সেকেন্ড লাগা স্বাভাবিক; এরপর request দ্রুত হবে।

### Step 2: MongoDB Atlas Connection Check

যদি `MongooseServerSelectionError`, `MongoServerError`, অথবা `MONGO_URI` error দেখা যায়:

1. MongoDB Atlas-এ login করুন।
2. **Security → Network Access** খুলুন।
3. Render server-এর IP access আছে কিনা দেখুন।
4. প্রথম setup-এর জন্য `0.0.0.0/0` allow করা যায়।
5. Production security-এর জন্য পরে নির্দিষ্ট IP range ব্যবহার করা ভালো।
6. MongoDB user-এর username/password এবং database permission যাচাই করুন।

### Step 3: Frontend Console Check

Button click করার পর data save না হলে:

1. Browser-এ `F12` চাপুন।
2. **Console** tab খুলুন।
3. Red error এবং request URL দেখুন।

| Error | সম্ভাব্য কারণ | সমাধান |
|---|---|---|
| `/api/shop/api/shop/...` | `VITE_API_BASE`-এ `/api/shop` যোগ করা হয়েছে | শুধু Render base URL দিন |
| CORS error | `FRONTEND_URL` ভুল বা missing | Render-এ exact Vercel URL দিন |
| `Failed to fetch` | Backend down, sleeping, বা URL ভুল | `/health` URL খুলে check করুন |
| `MongooseServerSelectionError` | Atlas network access বা URI সমস্যা | Atlas Network Access এবং `MONGO_URI` check করুন |
| `favicon.ico 404` | Browser favicon নেই | সাধারণত harmless; app calculation-এ সমস্যা করে না |

---

## 4. Demo Data যোগ করা

Backend live থাকার পর local machine থেকে demo data যোগ করা যাবে।

### macOS / Linux

```bash
cd backend
API_BASE=https://customized-shop-management-app-for-sifat.onrender.com/api/shop npm run seed:mock
```

### Windows PowerShell

```powershell
cd backend
$env:API_BASE="https://customized-shop-management-app-for-sifat.onrender.com/api/shop"
npm run seed:mock
```

এতে existing data delete হবে না; নতুন demo products, sales, services, stock এবং expenses যোগ হবে।

---

## 5. Redeploy Process

### Vercel

1. Vercel Dashboard → **Deployments** খুলুন।
2. Latest deployment-এর `...` menu খুলুন।
3. **Redeploy** নির্বাচন করুন।
4. Environment Variable পরিবর্তন করলে build cache ছাড়া redeploy করুন।

### Render

1. Render Dashboard → service overview খুলুন।
2. **Manual Deploy** menu খুলুন।
3. **Clear build cache & deploy** নির্বাচন করুন।

### Code Change-এর সাধারণ flow

```text
Code change
    ↓
Git commit এবং push
    ↓
Vercel frontend deploy
    ↓
Render backend deploy
    ↓
/health check
    ↓
Phone/browser দিয়ে test
```

---

## 6. Database Safety Checklist

- [ ] `.env` বা `.env.local` GitHub-এ commit হয়নি
- [ ] MongoDB password public chat বা source code-এ নেই
- [ ] Atlas backup/snapshot policy configured
- [ ] Render `MONGO_URI` সঠিক
- [ ] Render `FRONTEND_URL` exact Vercel URL
- [ ] Vercel `VITE_API_BASE`-এ শুধু Render base URL
- [ ] `/health` response-এ `database: "connected"`
- [ ] Phone থেকে product list, sale, restock এবং report test করা হয়েছে

