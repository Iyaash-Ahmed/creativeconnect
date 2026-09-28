/*
 * CreativeConnect — admin authentication.
 * bcrypt-hashed passwords + a signed JWT stored in an httpOnly cookie.
 */
"use strict";

const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const { db } = require("./db");

const COOKIE_NAME = "cc_admin";
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const isProd = process.env.NODE_ENV === "production";

let JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  JWT_SECRET = crypto.randomBytes(32).toString("hex");
  console.warn(
    "[auth] JWT_SECRET not set — using a random secret. Logins will reset on restart. " +
      "Set JWT_SECRET in .env for a stable, production-ready setup."
  );
}

function verifyLogin(username, password) {
  const row = db.prepare("SELECT * FROM admins WHERE username = ?").get(String(username || ""));
  if (!row) return null;
  if (!bcrypt.compareSync(String(password || ""), row.password_hash)) return null;
  return { id: row.id, username: row.username, role: row.role };
}

function issueToken(res, admin) {
  const token = jwt.sign({ uid: admin.id, username: admin.username }, JWT_SECRET, {
    expiresIn: "7d"
  });
  res.cookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: isProd,
    maxAge: TOKEN_TTL_MS,
    path: "/"
  });
}

function clearToken(res) {
  res.clearCookie(COOKIE_NAME, { path: "/" });
}

function currentAdmin(req) {
  const token = req.cookies && req.cookies[COOKIE_NAME];
  if (!token) return null;
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const row = db.prepare("SELECT id, username, role FROM admins WHERE id = ?").get(payload.uid);
    return row || null;
  } catch (e) {
    return null;
  }
}

function requireAdmin(req, res, next) {
  const admin = currentAdmin(req);
  if (!admin) return res.status(401).json({ error: "Not authenticated" });
  req.admin = admin;
  next();
}

// Owner-only routes (e.g. managing other admin users).
function requireOwner(req, res, next) {
  if (!req.admin || req.admin.role !== "owner") {
    return res.status(403).json({ error: "Owner access required." });
  }
  next();
}

// --- CSRF (double-submit cookie) -------------------------------------------
const CSRF_COOKIE = "cc_csrf";

function issueCsrf(res) {
  const token = crypto.randomBytes(24).toString("hex");
  res.cookie(CSRF_COOKIE, token, {
    httpOnly: false, // readable by admin.js to echo back in a header
    sameSite: "lax",
    secure: isProd,
    maxAge: TOKEN_TTL_MS,
    path: "/"
  });
  return token;
}

// Ensures a CSRF cookie exists on safe requests and validates it on
// state-changing requests (except login/logout, which have no session yet).
function csrfGuard(req, res, next) {
  var safe = req.method === "GET" || req.method === "HEAD" || req.method === "OPTIONS";
  var exempt = req.path === "/login" || req.path === "/logout";
  var cookieToken = req.cookies && req.cookies[CSRF_COOKIE];

  if (safe) {
    if (!cookieToken) issueCsrf(res);
    return next();
  }
  if (exempt) return next();

  var headerToken = req.get("x-csrf-token");
  if (!cookieToken || !headerToken || headerToken !== cookieToken) {
    return res.status(403).json({ error: "Invalid or missing CSRF token. Reload the page and try again." });
  }
  next();
}

function changePassword(adminId, currentPw, newPw) {
  const row = db.prepare("SELECT * FROM admins WHERE id = ?").get(adminId);
  if (!row) return { ok: false, error: "Account not found." };
  if (!bcrypt.compareSync(String(currentPw || ""), row.password_hash)) {
    return { ok: false, error: "Current password is incorrect." };
  }
  if (!newPw || String(newPw).length < 8) {
    return { ok: false, error: "New password must be at least 8 characters." };
  }
  db.prepare("UPDATE admins SET password_hash = ? WHERE id = ?").run(
    bcrypt.hashSync(String(newPw), 12),
    adminId
  );
  return { ok: true };
}

module.exports = {
  verifyLogin,
  issueToken,
  clearToken,
  currentAdmin,
  requireAdmin,
  requireOwner,
  changePassword,
  issueCsrf,
  csrfGuard,
  COOKIE_NAME,
  CSRF_COOKIE
};
