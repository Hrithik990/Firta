# FIRTA — Full Stack Setup Guide (Supabase)

## Requirements
- Node.js 18+
- A free Supabase account → https://supabase.com

---

## 1. Create Supabase Project

1. Go to https://supabase.com and sign up (free)
2. Click **New Project**, give it a name e.g. `firta`
3. Set a database password and choose your region
4. Wait ~1 minute for it to provision

---

## 2. Run the Database Schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New Query**
3. Copy and paste the entire contents of `config/schema.sql`
4. Click **Run** — this creates all 4 tables automatically

---

## 3. Get Your API Keys

In your Supabase dashboard:
- Go to **Project Settings** → **API**
- Copy:
  - **Project URL** → `SUPABASE_URL`
  - **service_role** key (under "Project API keys") → `SUPABASE_SERVICE_KEY`

> ⚠️ Use the `service_role` key (not `anon`) — it gives the server full DB access.

---

## 4. Configure Environment

```bash
cp .env.example .env
```

Edit `.env`:
```
PORT=3000
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_KEY=eyJhbGc...your-service-role-key
SESSION_SECRET=any-long-random-string-change-this
```

---

## 5. Install & Run

```bash
cd firta
npm install
node server.js
```

Open → http://localhost:3000

---

## Pages & Routes

| Page         | Route            | Auth?    |
|--------------|------------------|----------|
| Landing      | `/`              | Public   |
| Login        | `/login`         | Guest    |
| Sign Up      | `/signup`        | Guest    |
| Dashboard    | `/dashboard`     | Required |
| Add Item     | `/add-item`      | Required |
| Item Detail  | `/item/:tagId`   | Required |
| Finder Page  | `/finder/:tagId` | Public   |
| Logout       | `/logout`        | —        |

---

## Features

- **Auth** — bcrypt password hashing, 30-day sessions
- **Items** — Register, view, delete; auto-generated unique tag IDs
- **QR Codes** — Auto-generated teal QR images saved to `/public/qr/`
- **Lost Mode** — Toggle per item via AJAX, updates Supabase in real-time
- **Finder Page** — Public page when QR is scanned; every scan is logged
- **Messaging** — Finders send messages stored in Supabase `messages` table
- **Scan Tracking** — Total scans + last scanned date shown per item

---

## Project Structure

```
firta/
├── config/
│   ├── db.js          ← Supabase client
│   └── schema.sql     ← Paste into Supabase SQL Editor
├── middleware/
│   └── auth.js        ← requireAuth / guestOnly guards
├── routes/
│   ├── auth.js        ← /login /signup /logout
│   ├── items.js       ← /dashboard /add-item /item/:tagId
│   └── finder.js      ← /finder/:tagId (public)
├── views/             ← EJS templates (7 pages)
├── public/
│   ├── css/           ← Stylesheets
│   ├── js/            ← mobile.js
│   └── qr/            ← Auto-created QR images
├── .env.example
├── server.js
└── package.json
```
