/*
 * CreativeConnect — application server.
 * Serves the marketing site, the generated config, the public lead API,
 * and the protected admin dashboard + API. SQLite is initialised on require.
 */
"use strict";

require("dotenv").config();

const path = require("path");
const express = require("express");
const helmet = require("helmet");
const cookieParser = require("cookie-parser");

const { DB_PATH } = require("./db");
const publicRoutes = require("./routes/public");
const adminRoutes = require("./routes/admin");

const app = express();
const ROOT = path.join(__dirname, "..");
const ADMIN_DIR = path.join(ROOT, "admin");
const isProd = process.env.NODE_ENV === "production";
const PORT = process.env.PORT || 3000;

if (isProd) app.set("trust proxy", 1); // correct client IPs behind a host's proxy
app.disable("x-powered-by");

// --- Security headers (CSP tuned to the site's external resources) ---------
app.use(
  helmet({
    contentSecurityPolicy: {
      useDefaults: true,
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "https://www.googletagmanager.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "img-src": ["'self'", "data:", "https://picsum.photos", "https://fastly.picsum.photos"],
        "connect-src": [
          "'self'",
          "https://www.google-analytics.com",
          "https://region1.google-analytics.com",
          "https://api.hsforms.com"
        ],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "frame-ancestors": ["'self'"],
        // Removed so http://localhost sub-resources aren't force-upgraded in dev.
        "upgrade-insecure-requests": null
      }
    }
  })
);

app.use(cookieParser());

// --- Health check (for uptime monitors / hosting probes) -------------------
app.get("/health", (req, res) => {
  res.json({ status: "ok", uptime: process.uptime() });
});

// --- Routes ----------------------------------------------------------------
// Admin API first so it is never shadowed by static files.
app.use("/api/admin", adminRoutes);

// Uploaded images (served with a long cache — filenames are content-unique).
app.use(
  "/uploads",
  express.static(path.join(ROOT, "uploads"), { maxAge: isProd ? "7d" : 0, index: false })
);

// Public routes: home page, generated config.js, /api/content, /api/leads.
app.use("/", publicRoutes);

// Admin dashboard (static SPA-ish page). /admin -> admin/index.html
app.use(
  "/admin",
  express.static(ADMIN_DIR, {
    extensions: ["html"],
    setHeaders: (res) => res.setHeader("Cache-Control", "no-cache")
  })
);

// The rest of the marketing site (assets, booking.html, thanks.html, …).
// index:false so "/" always goes through the server-rendered route above.
app.use(
  express.static(ROOT, {
    index: false,
    extensions: ["html"],
    maxAge: isProd ? "1h" : 0,
    setHeaders: (res, filePath) => {
      if (filePath.endsWith(".html")) res.setHeader("Cache-Control", "no-cache");
    }
  })
);

// --- 404 -------------------------------------------------------------------
app.use((req, res) => {
  if (req.path.startsWith("/api/")) {
    return res.status(404).json({ error: "Not found" });
  }
  res.status(404).sendFile(path.join(ROOT, "404.html"), (err) => {
    if (err) res.type("text").send("404 — Not found");
  });
});

// --- Error handler ---------------------------------------------------------
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  console.error("[error]", err);
  if (res.headersSent) return;
  if (req.path.startsWith("/api/")) {
    return res.status(500).json({ error: "Something went wrong." });
  }
  res.status(500).type("text").send("Something went wrong.");
});

// Only listen when run directly (so tests can import the app without binding).
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`\nCreativeConnect running:  http://localhost:${PORT}`);
    console.log(`Admin dashboard:          http://localhost:${PORT}/admin`);
    console.log(`Database file:            ${DB_PATH}\n`);
  });
}

module.exports = app;
