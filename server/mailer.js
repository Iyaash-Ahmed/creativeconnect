/*
 * CreativeConnect — email notifications (nodemailer).
 * SMTP is configured from the admin Settings page (stored in the DB) and falls
 * back to SMTP_* env vars. No-ops silently unless host/user/pass are set.
 */
"use strict";

const nodemailer = require("nodemailer");
const { getSettings } = require("./db");

function cfg() {
  const s = getSettings();
  const user = s.smtp_user || process.env.SMTP_USER || "";
  return {
    host: s.smtp_host || process.env.SMTP_HOST || "",
    port: Number(s.smtp_port || process.env.SMTP_PORT) || 587,
    secure: String(s.smtp_secure || process.env.SMTP_SECURE || "").toLowerCase() === "true",
    user: user,
    pass: s.smtp_pass || process.env.SMTP_PASS || "",
    from: s.mail_from || process.env.MAIL_FROM || user,
    to: s.mail_to || process.env.MAIL_TO || s.email || ""
  };
}

function isConfigured() {
  const c = cfg();
  return !!(c.host && c.user && c.pass);
}

function esc(s) {
  return String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function transport(c) {
  return nodemailer.createTransport({
    host: c.host,
    port: c.port,
    secure: c.secure || c.port === 465,
    auth: { user: c.user, pass: c.pass }
  });
}

async function sendLeadNotification(lead) {
  const c = cfg();
  if (!c.host || !c.user || !c.pass || !c.to) return { skipped: true };

  const rows = [
    ["Name", lead.name],
    ["Email", lead.email],
    ["Phone", lead.phone || "—"],
    ["Shoot type", lead.shoot_type || "—"],
    ["Package", lead.package_name || "—"],
    ["Preferred date", lead.preferred_date || "—"],
    ["Received", lead.created_at]
  ];
  const text = rows.map((r) => r[0] + ": " + r[1]).join("\n");
  const html =
    "<h2>New booking request</h2><table cellpadding='6' style='border-collapse:collapse'>" +
    rows.map((r) => "<tr><td><b>" + esc(r[0]) + "</b></td><td>" + esc(r[1]) + "</td></tr>").join("") +
    "</table>";

  await transport(c).sendMail({
    from: c.from || c.user,
    to: c.to,
    subject: "New booking request — " + lead.name,
    replyTo: lead.email,
    text: text,
    html: html
  });
  return { sent: true };
}

// Auto-reply confirmation sent to the customer who submitted the booking.
async function sendCustomerAutoReply(lead) {
  const c = cfg();
  if (!c.host || !c.user || !c.pass || !lead.email) return { skipped: true };
  const s = getSettings();
  const brand = s.business_name || "CreativeConnect";
  const wa = String(s.whatsapp || "").replace(/[^0-9]/g, "");
  const details =
    "Shoot type: " + (lead.shoot_type || "—") + "\n" +
    "Package: " + (lead.package_name || "—") + "\n" +
    "Preferred date: " + (lead.preferred_date || "—");
  const text =
    "Hi " + (lead.name || "there") + ",\n\n" +
    "Thanks for your booking request with " + brand + "! We've received it and will get back to you within 24 hours with a plan and a quote.\n\n" +
    "Your request:\n" + details + "\n\n" +
    (wa ? "Need us sooner? WhatsApp: https://wa.me/" + wa + "\n\n" : "") +
    "— " + brand;
  const html =
    "<p>Hi " + esc(lead.name || "there") + ",</p>" +
    "<p>Thanks for your booking request with <b>" + esc(brand) + "</b>! We've received it and will get back to you within 24 hours with a plan and a quote.</p>" +
    "<p><b>Your request</b><br>Shoot type: " + esc(lead.shoot_type || "—") +
      "<br>Package: " + esc(lead.package_name || "—") +
      "<br>Preferred date: " + esc(lead.preferred_date || "—") + "</p>" +
    (wa ? "<p>Need us sooner? <a href='https://wa.me/" + wa + "'>Message us on WhatsApp</a>.</p>" : "") +
    "<p>— " + esc(brand) + "</p>";
  await transport(c).sendMail({
    from: c.from || c.user,
    to: lead.email,
    replyTo: s.email || c.from || c.user,
    subject: "We've got your request — " + brand,
    text: text,
    html: html
  });
  return { sent: true };
}

// Send a test email to confirm SMTP settings work.
async function sendTest() {
  const c = cfg();
  if (!c.host || !c.user || !c.pass) throw new Error("SMTP host, user and password are required.");
  const to = c.to || c.user;
  await transport(c).sendMail({
    from: c.from || c.user,
    to: to,
    subject: "CreativeConnect — SMTP test",
    text: "This is a test email confirming your CreativeConnect email settings work."
  });
  return { sent: true, to: to };
}

module.exports = { isConfigured, sendLeadNotification, sendCustomerAutoReply, sendTest };
