# Online deployment

This project is prepared for:

- MongoDB Atlas: persistent online database
- Render: Express API
- Vercel: Vite frontend

## 1. Create the database

1. Create a free MongoDB Atlas cluster.
2. Create a database user and copy the connection string.
3. In Atlas Network Access, allow the Render service to connect. For a simple first deployment, `0.0.0.0/0` works, but a restricted egress range is safer when available.
4. If migrating local records, export `backend/shop_database` with MongoDB tools and restore into Atlas. Do not upload the WiredTiger files to GitHub.

## 2. Deploy the API on Render

Import this repository as a Render Web Service. The included `render.yaml` can also be used as a Blueprint.

- Root directory: `backend` (if not using the Blueprint)
- Build command: `npm install`
- Start command: `npm start`

Set these environment variables:

```text
NODE_ENV=production
MONGO_URI=mongodb+srv://...
FRONTEND_URL=https://<your-vercel-domain>
```

The API health check is:

```text
https://<your-render-domain>/health
```

## 3. Deploy the frontend on Vercel

Import the same repository. The included `vercel.json` builds the `frontend` folder.

Set this environment variable before deploying:

```text
VITE_API_BASE=https://<your-render-domain>
```

After Vercel gives you its domain, put that exact domain in Render's `FRONTEND_URL` and redeploy the API.

## 4. Add demo data (optional)

With the Render API running, run this locally from `backend`:

```bash
API_BASE=https://<your-render-domain>/api/shop npm run seed:mock
```

On Windows PowerShell:

```powershell
$env:API_BASE="https://<your-render-domain>/api/shop"
npm run seed:mock
```

Never commit `.env`, Atlas passwords, or API credentials.
