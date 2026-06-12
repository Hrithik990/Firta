
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
