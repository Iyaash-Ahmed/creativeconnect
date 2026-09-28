# CreativeConnect — booking site + admin dashboard

[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/Iyaash-Ahmed/creativeconnect)

A photo & video booking website for **CreativeConnect** (a demo Maldives
production business) with a self-contained **Node.js + Express + SQLite**
backend and a password-protected **admin dashboard**. Visitors send booking
requests; those requests land in a database and show up in an admin **Leads
inbox**. The homepage content, packages and portfolio are all editable from
the admin — no code changes needed.

Originally a static site (v1); v2 adds the server, database and admin.

**🔗 Live demo:** _deploying…_ &nbsp;·&nbsp; **Admin:** `/admin`
<!-- Once deployed on Render, replace the line above with your live URL, e.g.:
     **🔗 Live demo:** https://creativeconnect.onrender.com  ·  **Admin:** /admin -->

> Built with the one-click **Deploy to Render** button above, or see
> [section 5 — Deploy it live](#5-deploy-it-live-render--railway-free-tier).

---

## 1. What's in here

```
server/                 the backend
  server.js             Express app: security, routing, static serving, /health
  db.js                 SQLite schema + seed (packages, portfolio, settings, admin)
  auth.js               bcrypt passwords + JWT-cookie sessions + CSRF tokens
  render.js             server-renders the home page + generates config.js
  mailer.js             optional email notifications on new bookings (SMTP)
  upload.js             image uploads (multer) + webp resizing (sharp)
  routes/public.js      home page, /assets/js/config.js, POST /api/leads
  routes/admin.js       admin API (login + CRUD + upload + backup, under /api/admin)

test/api.test.js        automated API smoke tests (npm test)
uploads/                uploaded images (git-ignored, auto-created)

admin/                  the admin dashboard (login + Leads/Home/Packages/Portfolio/Settings)
  index.html  admin.css  admin.js

index.html              home page (server-rendered from the database)
booking.html            booking page (posts to /api/leads)
thanks.html  privacy.html  404.html
assets/css/style.css
assets/js/config.js     STATIC FALLBACK ONLY — the server generates the live one
assets/js/analytics.js  GA4 + consent + event helpers
assets/js/main.js       nav, packages, portfolio + filter, lightbox
assets/js/booking.js    form logic, validation, submit to /api/leads

data/                   SQLite database file lives here (git-ignored, auto-created)
.env / .env.example     configuration + secrets
package.json
```

**You no longer edit `config.js` for content** — edit everything from the admin
dashboard at `/admin`. `config.js` remains only as an offline fallback.

---

## 2. Run it locally

You need **Node.js 20+** (built with Node 24).

```bash
npm install         # first time only
npm start           # then open http://localhost:3000
```

- Site:  <http://localhost:3000>
- Admin: <http://localhost:3000/admin>
- `npm run dev` restarts automatically on file changes.

The database and the first admin account are created automatically on first
run. See **section 4** for the login.

---

## 3. Configuration (`.env`)

Copy `.env.example` to `.env` and adjust. Keys:

| Key | Purpose |
|-----|---------|
| `PORT` | Port to listen on (hosts set this automatically). |
| `NODE_ENV` | `production` enables secure cookies + caching. |
| `JWT_SECRET` | Signs admin login tokens. Use a long random string. |
| `ADMIN_USERNAME` / `ADMIN_PASSWORD` | The first admin account, created on first run. |
| `DB_PATH` | Optional custom SQLite file location. |

Generate a strong `JWT_SECRET`:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

`.env` is git-ignored — never commit it.

---

## 4. The admin dashboard (`/admin`)

**First login:** the username/password come from `ADMIN_USERNAME` /
`ADMIN_PASSWORD` in `.env`. If you leave `ADMIN_PASSWORD` blank, a strong
password is generated and **printed to the console once** on first start —
copy it. Change your password any time from **Account** in the dashboard.

What you can do:

- **Dashboard** — KPI tiles, a **leads-over-time chart**, a one-click
  **database backup** download, and email-status.
- **Leads** — every booking request, with a status pipeline
  (**new → contacted → booked → archived**), private notes, **search**,
  **pagination**, and **CSV export**.
- **Home content** — hero eyebrow/title/subtitle, trust-strip items, footer blurb.
- **Packages** — add / edit / reorder / hide / delete packages, prices and features.
- **Portfolio** — add / edit / reorder / hide / delete gallery items; categories
  become the site's filter tabs automatically.
- **Image uploads** — upload real photos for packages & portfolio (auto-resized
  to optimised WebP + square thumbnails) instead of pasting URLs.
- **Settings** — Instagram / WhatsApp / email, GA4 Measurement ID, optional HubSpot IDs.
- **Account** — change your password.

Content edits are live immediately: the server rebuilds the page and
`config.js` from the database on every request.

**Security:** passwords are bcrypt-hashed; sessions are a signed JWT in an
httpOnly cookie; login is rate-limited; state-changing admin requests require a
**CSRF token** (double-submit cookie); `helmet` sets a strict Content-Security-Policy.

---

## 5. Deploy it live (Render / Railway free tier)

Because there's a server + database, use a Node host (not GitHub Pages).

1. Push the repo to GitHub (the `.gitignore` already excludes `node_modules`,
   `.env` and `data/`).
2. On **Render** → New → Web Service → connect the repo:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
3. Add environment variables: `NODE_ENV=production`, a strong `JWT_SECRET`,
   `ADMIN_USERNAME`, `ADMIN_PASSWORD`.
4. **Persist data:** add a **Persistent Disk** mounted at e.g. `/data`, set
   `DB_PATH=/data/creativeconnect.db`, and point uploads at it too (symlink
   `uploads/` onto the disk, or mount the disk at the project's `uploads/`).
   Without a disk, the SQLite file **and uploaded images** reset on every redeploy.
5. **(Optional) email alerts:** set `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`,
   `SMTP_PASS`, `MAIL_FROM`, `MAIL_TO` to be emailed on every new booking.

Railway/Fly.io work the same way (a Node service + a mounted volume for the DB).

---

## 6. GA4 analytics + the event list

Set your **GA4 Measurement ID** in the admin **Settings** page (or via the
`ga4_measurement_id` setting). While it's the placeholder `G-XXXXXXXXXX`,
gtag is not loaded and every event is printed to the browser console — handy
for local testing. Mark **`generate_lead`** as a key event in GA4.

| Event | When it fires |
|-------|---------------|
| `page_view` | automatically on each page |
| `cta_click` | any "Book a shoot" / "Choose package" / final CTA |
| `select_package` | a package selected on booking.html (incl. the `?package=` pre-select) |
| `form_start` | first interaction with the booking form |
| `generate_lead` | after a **successful** submission, before redirect |
| `social_click` | Instagram / WhatsApp link clicked |

**Consent:** Google Consent Mode v2 — analytics default to *denied*; the cookie
banner's Accept flips them to *granted* and the choice persists.

---

## 7. Bookings → database

The booking form posts JSON to **`POST /api/leads`** (validated + rate-limited).
Each request is stored in the `leads` table and appears in the admin Leads
inbox. On a network/validation error the form shows a WhatsApp fallback and
does not redirect. Optional HubSpot IDs in Settings are available for future
forwarding, but leads are always saved to your own database.

---

## 8. Email notifications (optional)

Set the `SMTP_*` / `MAIL_*` variables (see `.env.example`) and the business is
emailed whenever a booking arrives. If they're not set, the app runs normally
and just skips the email. The dashboard shows whether email is configured. For
Gmail, create an **App Password** and use it as `SMTP_PASS`.

## 9. Tests, health check & backups

- **Tests:** `npm test` boots the server on a temp database and checks the home
  page, config generation, the lead API, auth, and CSRF-protected CRUD.
- **Health check:** `GET /health` returns `{ "status": "ok" }` — point an uptime
  monitor or your host's health probe at it.
- **Backups:** the whole database is one file (`data/creativeconnect.db`) — copy
  it, or use **Dashboard → Download DB backup**. Export leads via **Leads → Export CSV**.

## 10. Replace the images

Images are Picsum placeholders. In the admin, either **upload** a photo
(auto-resized) or paste a real image URL for each package and portfolio item.
See **IMAGES.md** for the recommended sizes.

---

*CreativeConnect is a demonstration project for academic purposes. Prices,
reviews and photos are placeholders.*
