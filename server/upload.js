/*
 * CreativeConnect — image uploads (multer + sharp).
 * Accepts an image in memory, then writes an optimised full-size webp and a
 * square thumbnail into /uploads. Returns their public URLs.
 */
"use strict";

const path = require("path");
const fs = require("fs");
const crypto = require("crypto");
const multer = require("multer");
const sharp = require("sharp");

const UPLOAD_DIR = path.join(__dirname, "..", "uploads");
if (!fs.existsSync(UPLOAD_DIR)) fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const uploadImage = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8 MB
  fileFilter: function (req, file, cb) {
    if (/^image\/(jpe?g|png|webp|gif|avif)$/i.test(file.mimetype)) cb(null, true);
    else cb(new Error("Only image files (JPG, PNG, WEBP, GIF, AVIF) are allowed."));
  }
});

async function processUpload(buffer) {
  const id = crypto.randomBytes(8).toString("hex");
  const fullName = id + ".webp";
  const thumbName = id + "-thumb.webp";

  await sharp(buffer).rotate().resize({ width: 1600, withoutEnlargement: true }).webp({ quality: 82 })
    .toFile(path.join(UPLOAD_DIR, fullName));
  await sharp(buffer).rotate().resize({ width: 600, height: 600, fit: "cover" }).webp({ quality: 80 })
    .toFile(path.join(UPLOAD_DIR, thumbName));

  return { url: "/uploads/" + fullName, thumb_url: "/uploads/" + thumbName };
}

module.exports = { uploadImage, processUpload, UPLOAD_DIR };
