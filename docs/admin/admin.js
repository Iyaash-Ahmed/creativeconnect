/* CreativeConnect — admin dashboard controller (vanilla JS). */
(function () {
  "use strict";

  // ---------------------------------------------------------------- helpers
  var $ = function (sel, root) { return (root || document).querySelector(sel); };
  var panel = $("#panel");
  var LEAD_STATUSES = ["new", "contacted", "quoted", "booked", "lost", "archived"];
  // Friendly labels for the booking pipeline stages.
  var STATUS_LABELS = { new: "Booking request", contacted: "Contacted", quoted: "Quote sent", booked: "Booked", lost: "Lost", archived: "Archived" };
  function statusLabel(st) { return STATUS_LABELS[st] || cap(st); }

  function esc(str) {
    return String(str == null ? "" : str)
      .replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;").replace(/'/g, "&#39;");
  }

  var toastTimer;
  function toast(msg, kind) {
    var t = $("#toast");
    t.textContent = msg;
    t.className = "show " + (kind || "");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.className = ""; }, 2800);
  }

  function getCookie(name) {
    var m = document.cookie.match("(?:^|; )" + name + "=([^;]*)");
    return m ? decodeURIComponent(m[1]) : "";
  }

  async function api(method, path, body) {
    // Static demo build (GitHub Pages) has no backend — serve mock data.
    if (window.CC_ADMIN_DEMO) return demoApi(method, path);
    var opts = { method: method, headers: {}, credentials: "same-origin" };
    if (method !== "GET" && method !== "HEAD") {
      opts.headers["X-CSRF-Token"] = getCookie("cc_csrf");
    }
    if (body !== undefined) {
      opts.headers["Content-Type"] = "application/json";
      opts.body = JSON.stringify(body);
    }
    var res = await fetch("/api/admin" + path, opts);
    var data = null;
    try { data = await res.json(); } catch (e) { /* no body */ }
    if (!res.ok) {
      var err = new Error((data && data.error) || "Error " + res.status);
      err.status = res.status;
      err.data = data;
      throw err;
    }
    return data;
  }

  // Route API errors: 401 -> back to login, otherwise toast.
  function handleError(err) {
    if (err && err.status === 401) { showLogin(); return; }
    toast((err && err.message) || "Something went wrong.", "err");
  }

  // ---------------------------------------------------------------- DEMO MODE
  // Only active on the static GitHub Pages build (window.CC_ADMIN_DEMO = true).
  // Serves realistic sample data so visitors can explore the UI; nothing saves.
  function demoDate(daysAgo) { return new Date(Date.now() - daysAgo * 864e5).toISOString(); }
  function demoSeries(days) {
    var out = [];
    for (var i = days - 1; i >= 0; i--) out.push({ date: demoDate(i).slice(0, 10), count: Math.floor(Math.random() * 3) + (i % 5 === 0 ? 2 : 0) });
    return out;
  }
  var DEMO = {
    admin: { id: 1, username: "demo", role: "owner" },
    leads: [
      { id: 1, name: "Aisha Rahman", email: "aisha@example.com", phone: "+960 771 2345", shoot_type: "Wedding", package_name: "Story", preferred_date: "2026-11-15", consent: true, status: "new", source: "website", notes: "", created_at: demoDate(0) },
      { id: 2, name: "Ibrahim Latheef", email: "ibrahim@example.com", phone: "+960 779 8765", shoot_type: "Brand / Product", package_name: "Brand", preferred_date: "2026-12-02", consent: true, status: "contacted", source: "website", notes: "Wants reels for launch.", created_at: demoDate(2) },
      { id: 3, name: "Mariyam Nasheed", email: "mariyam@example.com", phone: "", shoot_type: "Event", package_name: "Story", preferred_date: "2026-11-28", consent: true, status: "booked", source: "website", notes: "Deposit paid.", created_at: demoDate(4) },
      { id: 4, name: "Hassan Waheed", email: "hassan@example.com", phone: "+960 913 4567", shoot_type: "Portrait / Graduation", package_name: "Essentials", preferred_date: "2026-11-10", consent: true, status: "new", source: "website", notes: "", created_at: demoDate(5) },
      { id: 5, name: "Fathimath Zoona", email: "zoona@example.com", phone: "+960 991 2233", shoot_type: "Wedding", package_name: "Brand", preferred_date: "2027-01-20", consent: true, status: "archived", source: "website", notes: "", created_at: demoDate(9) }
    ],
    packages: [
      { id: 1, slug: "essentials", name: "Essentials", price: "MVR 2,500", popular: false, image: "package-essentials", features: ["2 hours of photography", "30 edited photos", "Online gallery"], sort_order: 0, active: true },
      { id: 2, slug: "story", name: "Story", price: "MVR 5,500", popular: true, image: "package-story", features: ["Half-day photography", "60-second highlight reel", "80 edited photos"], sort_order: 1, active: true },
      { id: 3, slug: "brand", name: "Brand", price: "MVR 9,500", popular: false, image: "package-brand", features: ["Full-day photo + video", "3 social cut-downs", "120 edited photos"], sort_order: 2, active: true }
    ],
    portfolio: [
      { id: 1, title: "Beach wedding ceremony", category: "Weddings & Events", image_url: "https://picsum.photos/seed/wedding-1/120/120", full_url: "", alt: "", sort_order: 0, active: true },
      { id: 2, title: "Resort brand lifestyle", category: "Brand & Product", image_url: "https://picsum.photos/seed/brand-1/120/120", full_url: "", alt: "", sort_order: 1, active: true },
      { id: 3, title: "Graduation portrait", category: "Portraits", image_url: "https://picsum.photos/seed/portrait-1/120/120", full_url: "", alt: "", sort_order: 2, active: true }
    ],
    users: [{ id: 1, username: "demo", role: "owner", created_at: demoDate(30) }],
    settings: {
      business_name: "CreativeConnect", hero_eyebrow: "Photo & video studio · Maldives",
      hero_title: "Your story, shot like art.", hero_subtitle: "Weddings, events and brand films across the islands.",
      trust_items: ["Reply within 24 hours", "Photo + video in one team", "Island-wide travel"],
      footer_about: "Photo and video production across the Maldives.",
      instagram_handle: "creativeconnect.mv", whatsapp: "9607000000", email: "hello@creativeconnect.demo",
      ga4_measurement_id: "G-XXXXXXXXXX", hubspot_portal_id: "", hubspot_form_id: "",
      smtp_host: "", smtp_port: "587", smtp_secure: "false", smtp_user: "", mail_from: "", mail_to: "", smtp_pass_set: false
    }
  };
  function demoApi(method, path) {
    var GET = method === "GET";
    if (path === "/me" || path === "/login") return Promise.resolve({ admin: DEMO.admin, ok: true });
    if (path === "/logout") return Promise.resolve({ ok: true });
    if (!GET) {
      return Promise.reject(Object.assign(
        new Error("Demo preview — there's no backend on GitHub Pages, so changes aren't saved."),
        { status: 0 }
      ));
    }
    if (path === "/stats") {
      var byStatus = { new: 2, contacted: 1, booked: 1, archived: 1 };
      return Promise.resolve({
        leads_new: 2, leads_total: DEMO.leads.length, leads_week: 3, packages: 3, portfolio: 9,
        by_status: byStatus,
        by_package: [{ name: "Story", c: 2 }, { name: "Brand", c: 2 }, { name: "Essentials", c: 1 }],
        recent: DEMO.leads.slice(0, 5)
      });
    }
    if (path === "/status") return Promise.resolve({ email_configured: false });
    if (path.indexOf("/leads/timeseries") === 0) return Promise.resolve(demoSeries(14));
    if (path === "/analytics") return Promise.resolve({
      days: 30, total: DEMO.leads.length, booked: 1, conversion: 20, timeseries: demoSeries(30),
      by_status: { new: 2, contacted: 1, booked: 1, archived: 1 },
      by_shoot_type: [{ name: "Wedding", c: 2 }, { name: "Event", c: 1 }, { name: "Brand / Product", c: 1 }, { name: "Portrait / Graduation", c: 1 }],
      by_package: [{ name: "Story", c: 2 }, { name: "Brand", c: 2 }, { name: "Essentials", c: 1 }]
    });
    if (path.indexOf("/leads") === 0) return Promise.resolve({ rows: DEMO.leads, total: DEMO.leads.length, limit: 20, offset: 0 });
    if (path === "/settings") return Promise.resolve(DEMO.settings);
    if (path === "/packages") return Promise.resolve(DEMO.packages);
    if (path === "/portfolio") return Promise.resolve(DEMO.portfolio);
    if (path === "/users") return Promise.resolve(DEMO.users);
    return Promise.resolve({});
  }
  function ensureDemoBanner() {
    if (!window.CC_ADMIN_DEMO || document.getElementById("cc-demo-banner")) return;
    var b = document.createElement("div");
    b.id = "cc-demo-banner";
    b.style.cssText = "background:#3a2d12;color:#ffd8a3;border-bottom:1px solid var(--gold);padding:8px 16px;font-size:.85rem;text-align:center";
    b.innerHTML = "🔒 <b>Demo preview</b> — this admin has no backend on GitHub Pages, so sign-in and saving are disabled and the data below is sample data. " +
      'For the real working dashboard, deploy the Node app (<a style="color:var(--gold)" href="https://github.com/Iyaash-Ahmed/creativeconnect" target="_blank" rel="noopener">see the repo</a>).';
    document.body.insertBefore(b, document.body.firstChild);
    // Stop the CSV/backup <a> links from navigating to a 404 in the demo.
    document.addEventListener("click", function (e) {
      var a = e.target.closest && e.target.closest('a[href^="/api/admin/"]');
      if (a) { e.preventDefault(); toast("Demo preview — downloads need the backend.", "err"); }
    });
  }

  function fmtDate(iso) {
    if (!iso) return "";
    var d = new Date(iso);
    if (isNaN(d)) return iso;
    return d.toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }) +
      " " + d.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" });
  }

  function thumb(url, seed) {
    if (url && (/^https?:\/\//i.test(url) || url.charAt(0) === "/")) return url;
    if (url) return "https://picsum.photos/seed/" + encodeURIComponent(url) + "/120/120";
    if (seed) return "https://picsum.photos/seed/" + encodeURIComponent(seed) + "/120/120";
    return "https://picsum.photos/seed/placeholder/120/120";
  }

  // ------------------------------------------------------------------ modal
  function closeModal() { $("#modal-root").innerHTML = ""; }

  function openModal(title, innerHtml) {
    var root = $("#modal-root");
    root.innerHTML =
      '<div class="modal-backdrop" data-backdrop>' +
        '<div class="modal" role="dialog" aria-modal="true">' +
          '<div class="modal-head"><h3>' + esc(title) + '</h3>' +
            '<button class="icon-btn" data-close aria-label="Close">&times;</button></div>' +
          innerHtml +
        "</div></div>";
    root.querySelector("[data-close]").addEventListener("click", closeModal);
    root.querySelector("[data-backdrop]").addEventListener("click", function (e) {
      if (e.target === e.currentTarget) closeModal();
    });
    return root.querySelector(".modal");
  }

  function confirmDialog(message, confirmLabel) {
    return new Promise(function (resolve) {
      var m = openModal("Please confirm",
        '<div class="modal-body"><p>' + esc(message) + "</p></div>" +
        '<div class="modal-foot">' +
          '<button class="btn" data-cancel>Cancel</button>' +
          '<button class="btn btn-danger" data-ok>' + esc(confirmLabel || "Confirm") + "</button>" +
        "</div>");
      m.querySelector("[data-cancel]").addEventListener("click", function () { closeModal(); resolve(false); });
      m.querySelector("[data-ok]").addEventListener("click", function () { closeModal(); resolve(true); });
    });
  }

  // -------------------------------------------------------------- auth flow
  var currentAdmin = null;
  function isOwner() { return currentAdmin && currentAdmin.role === "owner"; }
  function showLogin() {
    $("#app-view").classList.add("hidden");
    $("#login-view").classList.remove("hidden");
    var u = $("#login-username"); if (u) u.focus();
  }
  function showApp(admin) {
    currentAdmin = admin || {};
    $("#login-view").classList.add("hidden");
    $("#app-view").classList.remove("hidden");
    $("#who").textContent = "Signed in as " + currentAdmin.username +
      (currentAdmin.role ? " (" + currentAdmin.role + ")" : "");
    var usersNav = $("#nav-users");
    if (usersNav) usersNav.hidden = !isOwner();
    ensureDemoBanner();
    route();
  }

  $("#login-form").addEventListener("submit", async function (e) {
    e.preventDefault();
    $("#login-error").textContent = "";
    try {
      var data = await api("POST", "/login", {
        username: $("#login-username").value,
        password: $("#login-password").value
      });
      $("#login-password").value = "";
      showApp(data.admin);
    } catch (err) {
      $("#login-error").textContent = (err && err.message) || "Login failed.";
    }
  });

  $("#logout-btn").addEventListener("click", async function () {
    try { await api("POST", "/logout"); } catch (e) {}
    showLogin();
  });

  // ---------------------------------------------------------------- routing
  var views = {}; // name -> render fn

  function setActiveNav(name) {
    var links = document.querySelectorAll("#sidebar a");
    links.forEach(function (a) { a.classList.toggle("active", a.getAttribute("data-view") === name); });
  }

  function route() {
    var name = (location.hash || "#dashboard").slice(1);
    if (!views[name]) name = "dashboard";
    setActiveNav(name);
    Promise.resolve(views[name]()).catch(handleError);
  }
  window.addEventListener("hashchange", route);

  async function refreshLeadBadge() {
    try {
      var s = await api("GET", "/stats");
      var b = $("#nav-leads-count");
      if (s.leads_new > 0) { b.hidden = false; b.textContent = s.leads_new; }
      else { b.hidden = true; }
    } catch (e) { /* ignore */ }
  }

  // -------------------------------------------------------------- Dashboard
  views.dashboard = async function () {
    var s = await api("GET", "/stats");
    var status = await api("GET", "/status").catch(function () { return { email_configured: false }; });
    var series = await api("GET", "/leads/timeseries?days=14").catch(function () { return []; });

    panel.innerHTML =
      '<div class="page-head"><h2>Dashboard</h2></div>' +
      '<div class="stat-grid">' +
        stat(s.leads_new, "New leads", true) +
        stat(s.leads_total, "Total leads") +
        stat(s.leads_week, "Leads this week") +
        stat(s.packages, "Packages") +
        stat(s.portfolio, "Portfolio items") +
      "</div>" +
      '<div class="dash-2col">' +
        '<div class="card"><h3>Leads — last 14 days</h3>' + chartSVG(series) + "</div>" +
        '<div class="card"><h3>Leads by package</h3>' + barsHTML(s.by_package) + "</div>" +
      "</div>" +
      '<div class="card" style="margin-top:20px">' +
        '<div class="page-head" style="margin-bottom:12px"><h3 style="margin:0">Recent leads</h3><a class="btn btn-sm" href="#leads">View all</a></div>' +
        recentHTML(s.recent) +
      "</div>" +
      '<div class="card" style="margin-top:20px"><h3>Quick actions</h3><div class="toolbar" style="margin-top:10px">' +
        '<a class="btn" href="#leads">View leads</a>' +
        '<a class="btn" href="#home">Edit home content</a>' +
        '<a class="btn" href="#packages">Manage packages</a>' +
        '<a class="btn" href="#portfolio">Manage portfolio</a>' +
        '<a class="btn" href="/api/admin/backup">Download DB backup</a>' +
        '<a class="btn" href="/" target="_blank" rel="noopener">Open live site ↗</a>' +
      "</div>" +
      '<p class="help" style="margin-top:12px">Email notifications: ' +
        (status.email_configured
          ? '<span class="pill" style="color:var(--green);border-color:var(--green)">Configured</span>'
          : '<span class="pill">Not configured</span> — set SMTP_* in .env to get emailed on new bookings.') +
      "</p></div>";
    refreshLeadBadge();

    function stat(n, l, accent) {
      return '<div class="stat' + (accent ? " accent" : "") + '"><div class="n">' + n + '</div><div class="l">' + esc(l) + "</div></div>";
    }
    function barsHTML(list) {
      if (!list || !list.length) return '<p class="muted">No leads yet.</p>';
      var max = Math.max.apply(null, list.map(function (x) { return x.c; })) || 1;
      return '<div class="bars">' + list.map(function (x) {
        return '<div class="bar-row"><span class="bar-row__label" title="' + esc(x.name) + '">' + esc(x.name) + "</span>" +
          '<span class="bar-row__track"><span class="bar-row__fill" style="width:' + Math.round(x.c / max * 100) + '%"></span></span>' +
          '<span class="bar-row__val">' + x.c + "</span></div>";
      }).join("") + "</div>";
    }
    function recentHTML(list) {
      if (!list || !list.length) return '<p class="muted">No leads yet. Booking requests will show up here.</p>';
      return '<div class="table-wrap"><table><thead><tr><th>Received</th><th>Name</th><th>Package</th><th>Status</th></tr></thead><tbody>' +
        list.map(function (l) {
          return "<tr><td>" + esc(fmtDate(l.created_at)) + "</td>" +
            "<td><b>" + esc(l.name) + "</b><br><span class='muted'>" + esc(l.email) + "</span></td>" +
            "<td>" + esc(l.package_name || "—") + "</td>" +
            "<td><span class='badge badge-" + esc(l.status) + "'>" + statusLabel(l.status) + "</span></td></tr>";
        }).join("") + "</tbody></table></div>";
    }
  };

  // Simple inline SVG bar chart (no external chart library).
  function chartSVG(series) {
    if (!series || !series.length) return '<p class="muted">No data yet.</p>';
    var w = 680, h = 170, pad = 26, n = series.length;
    var counts = series.map(function (d) { return d.count; });
    var max = Math.max(1, Math.max.apply(null, counts));
    var bw = (w - pad * 2) / n;
    var bars = series.map(function (d, i) {
      var bh = Math.round((h - pad * 2) * (d.count / max));
      var x = pad + i * bw + 2;
      var y = h - pad - bh;
      var label = d.date.slice(5);
      return '<rect x="' + x.toFixed(1) + '" y="' + y + '" width="' + (bw - 4).toFixed(1) + '" height="' + bh +
        '" rx="3" fill="#e8a33d"><title>' + esc(d.date + ": " + d.count) + "</title></rect>" +
        (i % 2 === 0
          ? '<text x="' + (x + (bw - 4) / 2).toFixed(1) + '" y="' + (h - 8) + '" fill="#9aa1ad" font-size="10" text-anchor="middle">' + esc(label) + "</text>"
          : "");
    }).join("");
    return '<svg viewBox="0 0 ' + w + " " + h + '" width="100%" role="img" aria-label="Leads over the last 14 days" style="max-width:100%;height:auto">' +
      '<text x="' + pad + '" y="14" fill="#9aa1ad" font-size="11">peak ' + max + "/day</text>" + bars + "</svg>";
  }

  // ------------------------------------------------------------------ Leads
  var leadFilter = "all";
  var leadQuery = "";
  var leadOffset = 0;
  var LEAD_LIMIT = 20;
  views.leads = async function () {
    var params = "?limit=" + LEAD_LIMIT + "&offset=" + leadOffset;
    if (leadFilter !== "all") params += "&status=" + encodeURIComponent(leadFilter);
    if (leadQuery) params += "&q=" + encodeURIComponent(leadQuery);
    var data = await api("GET", "/leads" + params);
    var leads = data.rows || [];
    var total = data.total || 0;

    var chips = ["all"].concat(LEAD_STATUSES).map(function (st) {
      return '<button class="btn btn-sm filter-chip' + (leadFilter === st ? " active" : "") +
        '" data-filter="' + st + '">' + (st === "all" ? "All" : statusLabel(st)) + "</button>";
    }).join("");

    var rows = leads.map(function (l) {
      return "<tr>" +
        "<td><input type='checkbox' class='lead-check' data-id='" + l.id + "'></td>" +
        "<td>" + esc(fmtDate(l.created_at)) + "</td>" +
        "<td><b>" + esc(l.name) + "</b></td>" +
        "<td>" + esc(l.email) + (l.phone ? "<br><span class='muted'>" + esc(l.phone) + "</span>" : "") + "</td>" +
        "<td>" + esc(l.shoot_type || "—") + "<br><span class='muted'>" + esc(l.package_name || "") + "</span></td>" +
        "<td>" + esc(l.preferred_date || "—") + "</td>" +
        "<td>" + statusSelect(l) + "</td>" +
        "<td><div class='actions'>" +
          "<button class='btn btn-sm' data-open='" + l.id + "'>Open</button>" +
          "<button class='btn btn-sm btn-danger' data-del='" + l.id + "'>Delete</button>" +
        "</div></td>" +
      "</tr>";
    }).join("");

    var start = total ? leadOffset + 1 : 0;
    var end = Math.min(leadOffset + LEAD_LIMIT, total);
    var pager =
      '<div class="toolbar" style="margin-top:14px">' +
        '<span class="muted">' + (total ? ("Showing " + start + "–" + end + " of " + total) : "0 results") + "</span>" +
        '<span class="spacer"></span>' +
        '<button class="btn btn-sm" data-page="prev"' + (leadOffset <= 0 ? " disabled" : "") + ">‹ Prev</button>" +
        '<button class="btn btn-sm" data-page="next"' + (end >= total ? " disabled" : "") + ">Next ›</button>" +
      "</div>";

    panel.innerHTML =
      '<div class="page-head"><h2>Leads</h2>' +
        '<a class="btn" href="/api/admin/leads/export.csv">Export CSV</a></div>' +
      '<div class="toolbar" id="lead-filters">' + chips +
        '<span class="spacer"></span>' +
        '<input type="search" id="lead-search" placeholder="Search name, email, phone…" value="' + esc(leadQuery) + '" style="max-width:260px">' +
      "</div>" +
      '<div class="toolbar bulk-bar" id="lead-bulk" hidden>' +
        '<span><b id="bulk-count">0</b> selected</span><span class="spacer"></span>' +
        '<button class="btn btn-sm" data-bulk="contacted">Mark contacted</button>' +
        '<button class="btn btn-sm" data-bulk="quoted">Mark quote sent</button>' +
        '<button class="btn btn-sm" data-bulk="booked">Mark booked</button>' +
        '<button class="btn btn-sm" data-bulk="lost">Mark lost</button>' +
        '<button class="btn btn-sm" data-bulk="archived">Archive</button>' +
        '<button class="btn btn-sm btn-danger" data-bulk="delete">Delete</button>' +
      "</div>" +
      (leads.length
        ? '<div class="table-wrap"><table><thead><tr>' +
          "<th style='width:34px'><input type='checkbox' id='lead-check-all' aria-label='Select all'></th><th>Received</th><th>Name</th><th>Contact</th><th>Shoot / Package</th><th>Date</th><th>Status</th><th></th>" +
          "</tr></thead><tbody>" + rows + "</tbody></table></div>" + pager
        : '<div class="card empty">No leads' + (leadFilter !== "all" || leadQuery ? " match this filter" : " yet") + ".</div>");

    // wire filters
    $("#lead-filters").addEventListener("click", function (e) {
      var b = e.target.closest("[data-filter]");
      if (!b) return;
      leadFilter = b.getAttribute("data-filter");
      leadOffset = 0;
      views.leads().catch(handleError);
    });

    // search (debounced)
    (function () {
      var search = $("#lead-search");
      if (!search) return;
      var timer;
      search.addEventListener("input", function () {
        clearTimeout(timer);
        timer = setTimeout(function () {
          leadQuery = search.value.trim();
          leadOffset = 0;
          views.leads().then(function () {
            var s = $("#lead-search");
            if (s) { s.focus(); s.setSelectionRange(s.value.length, s.value.length); }
          }).catch(handleError);
        }, 300);
      });
    })();

    // pagination
    panel.querySelectorAll("[data-page]").forEach(function (b) {
      b.addEventListener("click", function () {
        if (b.disabled) return;
        leadOffset += b.getAttribute("data-page") === "next" ? LEAD_LIMIT : -LEAD_LIMIT;
        if (leadOffset < 0) leadOffset = 0;
        views.leads().catch(handleError);
      });
    });

    // bulk selection + actions
    var selected = {};
    var bulkBar = $("#lead-bulk");
    function updateBulk() {
      var ids = Object.keys(selected).filter(function (k) { return selected[k]; });
      var cnt = $("#bulk-count"); if (cnt) cnt.textContent = ids.length;
      if (bulkBar) bulkBar.hidden = ids.length === 0;
      return ids;
    }
    panel.querySelectorAll(".lead-check").forEach(function (cb) {
      cb.addEventListener("change", function () { selected[cb.getAttribute("data-id")] = cb.checked; updateBulk(); });
    });
    var allBox = $("#lead-check-all");
    if (allBox) allBox.addEventListener("change", function () {
      panel.querySelectorAll(".lead-check").forEach(function (cb) { cb.checked = allBox.checked; selected[cb.getAttribute("data-id")] = allBox.checked; });
      updateBulk();
    });
    if (bulkBar) bulkBar.querySelectorAll("[data-bulk]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var ids = updateBulk();
        if (!ids.length) return;
        var action = b.getAttribute("data-bulk");
        var body;
        if (action === "delete") {
          var ok = await confirmDialog("Delete " + ids.length + " selected lead(s)? This can't be undone.", "Delete");
          if (!ok) return;
          body = { ids: ids.map(Number), action: "delete" };
        } else {
          body = { ids: ids.map(Number), action: "status", status: action };
        }
        try { await api("POST", "/leads/bulk", body); toast("Updated " + ids.length + " lead(s).", "ok"); views.leads().catch(handleError); refreshLeadBadge(); }
        catch (err) { handleError(err); }
      });
    });

    // status inline change
    panel.querySelectorAll("select[data-status-for]").forEach(function (sel) {
      sel.addEventListener("change", async function () {
        try {
          await api("PATCH", "/leads/" + sel.getAttribute("data-status-for"), { status: sel.value });
          toast("Status updated.", "ok");
          refreshLeadBadge();
        } catch (err) { handleError(err); }
      });
    });

    // open detail
    panel.querySelectorAll("[data-open]").forEach(function (b) {
      b.addEventListener("click", function () {
        var lead = leads.find(function (x) { return x.id == b.getAttribute("data-open"); });
        if (lead) openLead(lead);
      });
    });
    // delete
    panel.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var ok = await confirmDialog("Delete this lead permanently?", "Delete");
        if (!ok) return;
        try {
          await api("DELETE", "/leads/" + b.getAttribute("data-del"));
          toast("Lead deleted.", "ok");
          views.leads().catch(handleError);
          refreshLeadBadge();
        } catch (err) { handleError(err); }
      });
    });

    refreshLeadBadge();

    function statusSelect(l) {
      return '<select data-status-for="' + l.id + '">' +
        LEAD_STATUSES.map(function (st) {
          return '<option value="' + st + '"' + (l.status === st ? " selected" : "") + ">" + statusLabel(st) + "</option>";
        }).join("") + "</select>";
    }
  };

  function openLead(l) {
    var m = openModal("Lead · " + l.name,
      '<div class="modal-body">' +
        row("Received", fmtDate(l.created_at)) +
        row("Name", l.name) +
        row("Email", l.email) +
        row("Phone", l.phone || "—") +
        row("Shoot type", l.shoot_type || "—") +
        row("Package", l.package_name || "—") +
        row("Preferred date", l.preferred_date || "—") +
        row("Consent", l.consent ? "Yes" : "No") +
        '<div style="display:flex;gap:.6rem;flex-wrap:wrap;margin:.8rem 0 .2rem">' +
          '<a class="btn btn-sm" href="mailto:' + esc(l.email) +
            "?subject=" + encodeURIComponent("Re: your booking request") +
            "&body=" + encodeURIComponent("Hi " + l.name + ",\n\nThanks for your request — ") + '">✉ Reply by email</a>' +
          (l.phone ? '<a class="btn btn-sm" href="https://wa.me/' + l.phone.replace(/[^0-9]/g, "") +
            '" target="_blank" rel="noopener">WhatsApp</a>' : "") +
        "</div>" +
        '<div class="field" style="margin-top:14px"><label>Status</label><select id="d-status">' +
          LEAD_STATUSES.map(function (st) { return '<option value="' + st + '"' + (l.status === st ? " selected" : "") + ">" + statusLabel(st) + "</option>"; }).join("") +
        "</select></div>" +
        '<div class="field"><label>Private notes</label><textarea id="d-notes">' + esc(l.notes || "") + "</textarea></div>" +
      "</div>" +
      '<div class="modal-foot"><button class="btn" data-cancel>Close</button>' +
        '<button class="btn btn-primary" id="d-save">Save changes</button></div>');
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("#d-save").addEventListener("click", async function () {
      try {
        await api("PATCH", "/leads/" + l.id, { status: m.querySelector("#d-status").value, notes: m.querySelector("#d-notes").value });
        toast("Lead saved.", "ok");
        closeModal();
        views.leads().catch(handleError);
        refreshLeadBadge();
      } catch (err) { handleError(err); }
    });
    function row(k, v) { return '<p style="margin:.2rem 0"><span class="muted">' + esc(k) + ':</span> ' + esc(v) + "</p>"; }
  }

  // ------------------------------------------------------------ Home content
  views.home = async function () {
    var s = await api("GET", "/settings");
    var trust = Array.isArray(s.trust_items) ? s.trust_items.join("\n") : "";
    panel.innerHTML =
      '<div class="page-head"><h2>Home content</h2></div>' +
      '<form class="card" id="home-form">' +
        field("Business name", '<input type="text" name="business_name" value="' + esc(s.business_name) + '">') +
        field("Hero eyebrow (small line above the title)", '<input type="text" name="hero_eyebrow" value="' + esc(s.hero_eyebrow) + '">') +
        field("Hero title (main headline)", '<input type="text" name="hero_title" value="' + esc(s.hero_title) + '">') +
        field("Hero subtitle", '<textarea name="hero_subtitle">' + esc(s.hero_subtitle) + "</textarea>") +
        field("Trust strip items (one per line)", '<textarea name="trust_items">' + esc(trust) + "</textarea>") +
        field("Footer blurb", '<textarea name="footer_about">' + esc(s.footer_about) + "</textarea>") +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Save changes</button>' +
          '<a class="btn" href="/" target="_blank" rel="noopener">Preview site ↗</a></div>' +
      "</form>";
    $("#home-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target;
      try {
        await api("PUT", "/settings", {
          business_name: f.business_name.value,
          hero_eyebrow: f.hero_eyebrow.value,
          hero_title: f.hero_title.value,
          hero_subtitle: f.hero_subtitle.value,
          trust_items: f.trust_items.value,
          footer_about: f.footer_about.value
        });
        toast("Home content saved.", "ok");
      } catch (err) { handleError(err); }
    });
  };

  // --------------------------------------------------------------- Settings
  views.settings = async function () {
    var s = await api("GET", "/settings");
    panel.innerHTML =
      '<div class="page-head"><h2>Settings</h2></div>' +
      '<form class="card" id="settings-form">' +
        "<h3>Contact &amp; social</h3>" +
        '<div class="grid-2">' +
          field("Instagram handle (no @)", '<input type="text" name="instagram_handle" value="' + esc(s.instagram_handle) + '">') +
          field("WhatsApp number (digits only)", '<input type="text" name="whatsapp" value="' + esc(s.whatsapp) + '">') +
        "</div>" +
        field("Contact email", '<input type="email" name="email" value="' + esc(s.email) + '">') +
        '<h3 style="margin-top:18px">Analytics &amp; CRM</h3>' +
        field("GA4 Measurement ID (G-XXXXXXXXXX)", '<input type="text" name="ga4_measurement_id" value="' + esc(s.ga4_measurement_id) + '">') +
        '<div class="grid-2">' +
          field("HubSpot Portal ID (optional)", '<input type="text" name="hubspot_portal_id" value="' + esc(s.hubspot_portal_id) + '">') +
          field("HubSpot Form ID (optional)", '<input type="text" name="hubspot_form_id" value="' + esc(s.hubspot_form_id) + '">') +
        "</div>" +
        '<h3 style="margin-top:18px">Email notifications (SMTP)</h3>' +
        '<p class="help" style="margin-top:0">Get emailed whenever a new booking arrives. For Gmail, create an App Password and use it below.</p>' +
        '<div class="grid-2">' +
          field("SMTP host", '<input type="text" name="smtp_host" value="' + esc(s.smtp_host || "") + '" placeholder="smtp.gmail.com">') +
          field("Port", '<input type="number" name="smtp_port" value="' + esc(s.smtp_port || "587") + '">') +
        "</div>" +
        '<div class="grid-2">' +
          field("SMTP username", '<input type="text" name="smtp_user" value="' + esc(s.smtp_user || "") + '" autocomplete="off">') +
          field("SMTP password" + (s.smtp_pass_set ? " (saved — leave blank to keep)" : ""), '<input type="password" name="smtp_pass" value="" autocomplete="new-password" placeholder="' + (s.smtp_pass_set ? "••••••••" : "") + '">') +
        "</div>" +
        '<div class="grid-2">' +
          field("From address", '<input type="text" name="mail_from" value="' + esc(s.mail_from || "") + '" placeholder="Studio <you@example.com>">') +
          field("Send notifications to", '<input type="email" name="mail_to" value="' + esc(s.mail_to || "") + '" placeholder="defaults to contact email">') +
        "</div>" +
        '<div class="field"><label class="check"><input type="checkbox" name="smtp_secure"' + (String(s.smtp_secure) === "true" ? " checked" : "") + "> Use TLS/SSL (turn on for port 465)</label></div>" +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Save settings</button>' +
          '<button class="btn" type="button" id="test-email">Save &amp; send test email</button></div>' +
        '<p class="help" id="settings-msg"></p>' +
      "</form>";

    var form = $("#settings-form");
    function payload(f) {
      return {
        instagram_handle: f.instagram_handle.value, whatsapp: f.whatsapp.value, email: f.email.value,
        ga4_measurement_id: f.ga4_measurement_id.value, hubspot_portal_id: f.hubspot_portal_id.value, hubspot_form_id: f.hubspot_form_id.value,
        smtp_host: f.smtp_host.value, smtp_port: f.smtp_port.value, smtp_secure: f.smtp_secure.checked ? "true" : "false",
        smtp_user: f.smtp_user.value, smtp_pass: f.smtp_pass.value, mail_from: f.mail_from.value, mail_to: f.mail_to.value
      };
    }
    form.addEventListener("submit", async function (e) {
      e.preventDefault();
      try { await api("PUT", "/settings", payload(form)); form.smtp_pass.value = ""; toast("Settings saved.", "ok"); }
      catch (err) { handleError(err); }
    });
    $("#test-email").addEventListener("click", async function () {
      var msg = $("#settings-msg");
      msg.textContent = "Saving & sending…"; msg.style.color = "";
      try {
        await api("PUT", "/settings", payload(form)); form.smtp_pass.value = "";
        var r = await api("POST", "/settings/test-email");
        msg.textContent = "Test email sent to " + r.to + ".";
        msg.style.color = "var(--green)";
      } catch (err) { msg.textContent = (err && err.message) || "Test failed."; msg.style.color = "var(--red)"; }
    });
  };

  // --------------------------------------------------------------- Packages
  views.packages = async function () {
    var pkgs = await api("GET", "/packages");
    var list = pkgs.length ? pkgs.map(function (p) {
      return '<div class="row-item' + (p.active ? "" : " inactive") + '" data-id="' + p.id + '">' +
        '<span class="drag-handle" aria-hidden="true">⠿</span>' +
        '<img src="' + esc(thumb(p.image, p.slug)) + '" alt="">' +
        '<div class="info"><b>' + esc(p.name) + (p.popular ? ' <span class="pill">Popular</span>' : "") +
          (p.active ? "" : ' <span class="pill">Hidden</span>') + "</b>" +
          '<span class="muted">' + esc(p.price) + " · " + p.features.length + " features</span></div>" +
        '<div class="actions">' +
          '<button class="btn btn-sm" data-move="up" data-id="' + p.id + '" aria-label="Move up">↑</button>' +
          '<button class="btn btn-sm" data-move="down" data-id="' + p.id + '" aria-label="Move down">↓</button>' +
          '<button class="btn btn-sm" data-toggle="' + p.id + '">' + (p.active ? "Hide" : "Show") + "</button>" +
          '<button class="btn btn-sm" data-edit="' + p.id + '">Edit</button>' +
          '<button class="btn btn-sm btn-danger" data-del="' + p.id + '">Delete</button>' +
        "</div>" +
      "</div>";
    }).join("") : '<div class="card empty">No packages yet.</div>';

    panel.innerHTML =
      '<div class="page-head"><h2>Packages</h2><button class="btn btn-primary" id="add-pkg">+ Add package</button></div>' +
      '<p class="help" style="margin:-8px 0 16px">Use ↑ ↓ to change the order they appear on the site; “Hide” keeps one saved but off the live site.</p>' +
      '<div class="list">' + list + "</div>";

    $("#add-pkg").addEventListener("click", function () { packageForm(null); });
    panel.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        packageForm(pkgs.find(function (x) { return x.id == b.getAttribute("data-edit"); }));
      });
    });
    panel.querySelectorAll("[data-move]").forEach(function (b) {
      b.addEventListener("click", async function () {
        try { await api("POST", "/packages/" + b.getAttribute("data-id") + "/move", { dir: b.getAttribute("data-move") }); views.packages().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    panel.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var p = pkgs.find(function (x) { return x.id == b.getAttribute("data-toggle"); });
        try { await api("PUT", "/packages/" + b.getAttribute("data-toggle"), { active: !p.active }); toast(p.active ? "Package hidden." : "Package shown.", "ok"); views.packages().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    panel.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var ok = await confirmDialog("Delete this package?", "Delete");
        if (!ok) return;
        try { await api("DELETE", "/packages/" + b.getAttribute("data-del")); toast("Package deleted.", "ok"); views.packages().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    enableDragReorder(panel.querySelector(".list"), "/packages/reorder", function () { views.packages().catch(handleError); });
  };

  function packageForm(p) {
    var isEdit = !!p;
    p = p || { name: "", price: "", popular: false, image: "", features: [], sort_order: 0, active: true };
    var m = openModal(isEdit ? "Edit package" : "Add package",
      '<form id="pkg-form"><div class="modal-body">' +
        field("Name", '<input type="text" name="name" value="' + esc(p.name) + '" required>') +
        field("Price (e.g. MVR 2,500)", '<input type="text" name="price" value="' + esc(p.price) + '">') +
        field("Features (one per line)", '<textarea name="features">' + esc((p.features || []).join("\n")) + "</textarea>") +
        '<div class="grid-2">' +
          field("Image seed or URL", '<input type="text" name="image" value="' + esc(p.image) + '">') +
          field("Sort order", '<input type="number" name="sort_order" value="' + (p.sort_order || 0) + '">') +
        "</div>" +
        uploaderHtml() +
        '<div class="field"><label class="check"><input type="checkbox" name="popular"' + (p.popular ? " checked" : "") + "> Mark as “Most popular”</label></div>" +
        '<div class="field"><label class="check"><input type="checkbox" name="active"' + (p.active ? " checked" : "") + "> Visible on the site</label></div>" +
        '<p class="form-error" id="pkg-error"></p>' +
      "</div><div class='modal-foot'><button type='button' class='btn' data-cancel>Cancel</button>" +
      "<button type='submit' class='btn btn-primary'>" + (isEdit ? "Save" : "Create") + "</button></div></form>");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    attachUploader(m, function (data) { m.querySelector("[name=image]").value = data.url; });
    m.querySelector("#pkg-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target;
      var payload = {
        name: f.name.value, price: f.price.value, image: f.image.value,
        features: f.features.value, sort_order: f.sort_order.value,
        popular: f.popular.checked, active: f.active.checked
      };
      try {
        if (isEdit) await api("PUT", "/packages/" + p.id, payload);
        else await api("POST", "/packages", payload);
        toast("Package saved.", "ok");
        closeModal();
        views.packages().catch(handleError);
      } catch (err) { m.querySelector("#pkg-error").textContent = (err && err.message) || "Save failed."; }
    });
  }

  // -------------------------------------------------------------- Portfolio
  views.portfolio = async function () {
    var items = await api("GET", "/portfolio");
    var list = items.length ? items.map(function (p) {
      return '<div class="row-item' + (p.active ? "" : " inactive") + '" data-id="' + p.id + '">' +
        '<span class="drag-handle" aria-hidden="true">⠿</span>' +
        '<img src="' + esc(thumb(p.image_url)) + '" alt="">' +
        '<div class="info"><b>' + esc(p.title) + (p.active ? "" : ' <span class="pill">Hidden</span>') + "</b>" +
          '<span class="muted">' + esc(p.category || "—") + "</span></div>" +
        '<div class="actions">' +
          '<button class="btn btn-sm" data-move="up" data-id="' + p.id + '" aria-label="Move up">↑</button>' +
          '<button class="btn btn-sm" data-move="down" data-id="' + p.id + '" aria-label="Move down">↓</button>' +
          '<button class="btn btn-sm" data-toggle="' + p.id + '">' + (p.active ? "Hide" : "Show") + "</button>" +
          '<button class="btn btn-sm" data-edit="' + p.id + '">Edit</button>' +
          '<button class="btn btn-sm btn-danger" data-del="' + p.id + '">Delete</button>' +
        "</div>" +
      "</div>";
    }).join("") : '<div class="card empty">No portfolio items yet.</div>';

    panel.innerHTML =
      '<div class="page-head"><h2>Portfolio</h2><button class="btn btn-primary" id="add-pf">+ Add item</button></div>' +
      '<p class="help" style="margin-top:-8px;margin-bottom:16px">Categories become the filter tabs on the site automatically. Use ↑ ↓ to reorder, and “Hide” to keep an item saved but off the live site.</p>' +
      '<div class="list">' + list + "</div>";

    $("#add-pf").addEventListener("click", function () { portfolioForm(null); });
    panel.querySelectorAll("[data-edit]").forEach(function (b) {
      b.addEventListener("click", function () {
        portfolioForm(items.find(function (x) { return x.id == b.getAttribute("data-edit"); }));
      });
    });
    panel.querySelectorAll("[data-move]").forEach(function (b) {
      b.addEventListener("click", async function () {
        try { await api("POST", "/portfolio/" + b.getAttribute("data-id") + "/move", { dir: b.getAttribute("data-move") }); views.portfolio().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    panel.querySelectorAll("[data-toggle]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var p = items.find(function (x) { return x.id == b.getAttribute("data-toggle"); });
        try { await api("PUT", "/portfolio/" + b.getAttribute("data-toggle"), { active: !p.active }); toast(p.active ? "Item hidden." : "Item shown.", "ok"); views.portfolio().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    panel.querySelectorAll("[data-del]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var ok = await confirmDialog("Delete this portfolio item?", "Delete");
        if (!ok) return;
        try { await api("DELETE", "/portfolio/" + b.getAttribute("data-del")); toast("Item deleted.", "ok"); views.portfolio().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    enableDragReorder(panel.querySelector(".list"), "/portfolio/reorder", function () { views.portfolio().catch(handleError); });
  };

  function portfolioForm(p) {
    var isEdit = !!p;
    p = p || { title: "", category: "", image_url: "", full_url: "", alt: "", sort_order: 0, active: true };
    var m = openModal(isEdit ? "Edit portfolio item" : "Add portfolio item",
      '<form id="pf-form"><div class="modal-body">' +
        field("Title", '<input type="text" name="title" value="' + esc(p.title) + '" required>') +
        field("Category (used as a filter tab)", '<input type="text" name="category" value="' + esc(p.category) + '" list="pf-cats">') +
        field("Image URL (thumbnail, ~600px)", '<input type="url" name="image_url" value="' + esc(p.image_url) + '">') +
        field("Full-size image URL (opens in lightbox — optional)", '<input type="url" name="full_url" value="' + esc(p.full_url) + '">') +
        uploaderHtml() +
        field("Alt text (accessibility)", '<input type="text" name="alt" value="' + esc(p.alt) + '">') +
        field("Sort order", '<input type="number" name="sort_order" value="' + (p.sort_order || 0) + '">') +
        '<div class="field"><label class="check"><input type="checkbox" name="active"' + (p.active ? " checked" : "") + "> Visible on the site</label></div>" +
        '<p class="form-error" id="pf-error"></p>' +
      "</div><div class='modal-foot'><button type='button' class='btn' data-cancel>Cancel</button>" +
      "<button type='submit' class='btn btn-primary'>" + (isEdit ? "Save" : "Create") + "</button></div></form>");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    attachUploader(m, function (data) {
      m.querySelector("[name=image_url]").value = data.thumb_url;
      m.querySelector("[name=full_url]").value = data.url;
    });
    m.querySelector("#pf-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target;
      var payload = {
        title: f.title.value, category: f.category.value, image_url: f.image_url.value,
        full_url: f.full_url.value, alt: f.alt.value, sort_order: f.sort_order.value, active: f.active.checked
      };
      try {
        if (isEdit) await api("PUT", "/portfolio/" + p.id, payload);
        else await api("POST", "/portfolio", payload);
        toast("Portfolio item saved.", "ok");
        closeModal();
        views.portfolio().catch(handleError);
      } catch (err) { m.querySelector("#pf-error").textContent = (err && err.message) || "Save failed."; }
    });
  }

  // ---------------------------------------------------------------- Account
  views.account = async function () {
    panel.innerHTML =
      '<div class="page-head"><h2>Account</h2></div>' +
      '<form class="card" id="pw-form" style="max-width:440px">' +
        "<h3>Change password</h3>" +
        field("Current password", '<input type="password" name="current_password" autocomplete="current-password" required>') +
        field("New password (min 8 characters)", '<input type="password" name="new_password" autocomplete="new-password" required>') +
        field("Confirm new password", '<input type="password" name="confirm_password" autocomplete="new-password" required>') +
        '<p class="form-error" id="pw-error"></p>' +
        '<div class="form-actions"><button class="btn btn-primary" type="submit">Update password</button></div>' +
      "</form>";
    $("#pw-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target;
      var errEl = $("#pw-error"); errEl.textContent = "";
      if (f.new_password.value !== f.confirm_password.value) { errEl.textContent = "New passwords do not match."; return; }
      try {
        await api("POST", "/change-password", { current_password: f.current_password.value, new_password: f.new_password.value });
        toast("Password updated.", "ok");
        f.reset();
      } catch (err) { errEl.textContent = (err && err.message) || "Update failed."; }
    });
  };

  // ---------------------------------------------------------------- Analytics
  views.analytics = async function () {
    var a = await api("GET", "/analytics");
    panel.innerHTML =
      '<div class="page-head"><h2>Analytics</h2></div>' +
      '<div class="stat-grid">' +
        '<div class="stat accent"><div class="n">' + a.total + '</div><div class="l">Total leads</div></div>' +
        '<div class="stat"><div class="n">' + a.booked + '</div><div class="l">Booked</div></div>' +
        '<div class="stat"><div class="n">' + a.conversion + '%</div><div class="l">Conversion rate</div></div>' +
        '<div class="stat"><div class="n">' + a.by_status.new + '</div><div class="l">Awaiting reply</div></div>' +
      "</div>" +
      '<div class="card" style="margin-bottom:20px"><h3>Leads — last ' + a.days + ' days</h3>' + chartSVG(a.timeseries) + "</div>" +
      '<div class="dash-2col">' +
        '<div class="card"><h3>By shoot type</h3>' + bars(a.by_shoot_type) + "</div>" +
        '<div class="card"><h3>By package</h3>' + bars(a.by_package) + "</div>" +
      "</div>" +
      '<div class="card" style="margin-top:20px"><h3>By status</h3>' +
        bars(LEAD_STATUSES.map(function (k) { return { name: statusLabel(k), c: a.by_status[k] || 0 }; })) +
      "</div>";
    function bars(list) {
      if (!list || !list.length) return '<p class="muted">No data yet.</p>';
      var max = Math.max.apply(null, list.map(function (x) { return x.c; })) || 1;
      return '<div class="bars">' + list.map(function (x) {
        return '<div class="bar-row"><span class="bar-row__label" title="' + esc(x.name) + '">' + esc(x.name) + "</span>" +
          '<span class="bar-row__track"><span class="bar-row__fill" style="width:' + Math.round(x.c / max * 100) + '%"></span></span>' +
          '<span class="bar-row__val">' + x.c + "</span></div>";
      }).join("") + "</div>";
    }
  };

  // ------------------------------------------------------------------- Users
  views.users = async function () {
    if (!isOwner()) {
      panel.innerHTML = '<div class="page-head"><h2>Users</h2></div><div class="card empty">Owner access required.</div>';
      return;
    }
    var users = await api("GET", "/users");
    var rows = users.map(function (u) {
      return '<div class="row-item"><div class="info"><b>' + esc(u.username) +
          ' <span class="pill">' + esc(u.role) + "</span></b>" +
          '<span class="muted">added ' + esc(fmtDate(u.created_at)) + "</span></div>" +
        '<div class="actions">' +
          (u.id === currentAdmin.id
            ? '<span class="pill">you</span>'
            : '<button class="btn btn-sm" data-role="' + u.id + '" data-current="' + esc(u.role) + '">Make ' + (u.role === "owner" ? "editor" : "owner") + "</button>" +
              '<button class="btn btn-sm" data-resetpw="' + u.id + '">Reset password</button>' +
              '<button class="btn btn-sm btn-danger" data-deluser="' + u.id + '">Delete</button>') +
        "</div></div>";
    }).join("");
    panel.innerHTML =
      '<div class="page-head"><h2>Users</h2><button class="btn btn-primary" id="add-user">+ Add user</button></div>' +
      '<p class="help" style="margin:-8px 0 16px">Owners manage users and settings; editors manage leads and content.</p>' +
      '<div class="list">' + rows + "</div>";
    $("#add-user").addEventListener("click", userForm);
    panel.querySelectorAll("[data-role]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var next = b.getAttribute("data-current") === "owner" ? "editor" : "owner";
        try { await api("PUT", "/users/" + b.getAttribute("data-role"), { role: next }); toast("Role updated.", "ok"); views.users().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
    panel.querySelectorAll("[data-resetpw]").forEach(function (b) {
      b.addEventListener("click", function () { resetPwForm(b.getAttribute("data-resetpw")); });
    });
    panel.querySelectorAll("[data-deluser]").forEach(function (b) {
      b.addEventListener("click", async function () {
        var ok = await confirmDialog("Delete this admin user?", "Delete");
        if (!ok) return;
        try { await api("DELETE", "/users/" + b.getAttribute("data-deluser")); toast("User deleted.", "ok"); views.users().catch(handleError); }
        catch (err) { handleError(err); }
      });
    });
  };

  function userForm() {
    var m = openModal("Add user",
      '<form id="user-form"><div class="modal-body">' +
        field("Username", '<input type="text" name="username" required autocomplete="off">') +
        field("Password (min 8 characters)", '<input type="password" name="password" required autocomplete="new-password">') +
        '<div class="field"><label>Role</label><select name="role"><option value="editor">Editor</option><option value="owner">Owner</option></select></div>' +
        '<p class="form-error" id="user-error"></p>' +
      "</div><div class='modal-foot'><button type='button' class='btn' data-cancel>Cancel</button><button type='submit' class='btn btn-primary'>Create</button></div></form>");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("#user-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      var f = e.target;
      try {
        await api("POST", "/users", { username: f.username.value, password: f.password.value, role: f.role.value });
        toast("User created.", "ok"); closeModal(); views.users().catch(handleError);
      } catch (err) { m.querySelector("#user-error").textContent = (err && err.message) || "Failed."; }
    });
  }

  function resetPwForm(id) {
    var m = openModal("Reset password",
      '<form id="rpw-form"><div class="modal-body">' +
        field("New password (min 8 characters)", '<input type="password" name="password" required autocomplete="new-password">') +
        '<p class="form-error" id="rpw-error"></p>' +
      "</div><div class='modal-foot'><button type='button' class='btn' data-cancel>Cancel</button><button type='submit' class='btn btn-primary'>Set password</button></div></form>");
    m.querySelector("[data-cancel]").addEventListener("click", closeModal);
    m.querySelector("#rpw-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      try { await api("PUT", "/users/" + id, { password: e.target.password.value }); toast("Password reset.", "ok"); closeModal(); }
      catch (err) { m.querySelector("#rpw-error").textContent = (err && err.message) || "Failed."; }
    });
  }

  // ----------------------------------------------------------------- shared
  function field(label, control) {
    return '<div class="field"><label>' + esc(label) + "</label>" + control + "</div>";
  }
  function cap(s) { return s.charAt(0).toUpperCase() + s.slice(1); }

  // Drag-and-drop reorder for a .list of .row-item[data-id]; persists to endpoint.
  function enableDragReorder(listEl, endpoint, reload) {
    if (!listEl) return;
    var dragEl = null;
    function afterEl(y) {
      var els = [].slice.call(listEl.querySelectorAll(".row-item:not(.dragging)"));
      return els.reduce(function (closest, child) {
        var box = child.getBoundingClientRect();
        var offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) return { offset: offset, element: child };
        return closest;
      }, { offset: -Infinity, element: null }).element;
    }
    listEl.querySelectorAll(".row-item").forEach(function (item) {
      item.setAttribute("draggable", "true");
      item.addEventListener("dragstart", function (e) {
        dragEl = item; item.classList.add("dragging");
        if (e.dataTransfer) e.dataTransfer.effectAllowed = "move";
      });
      item.addEventListener("dragend", async function () {
        item.classList.remove("dragging");
        if (!dragEl) return;
        dragEl = null;
        var ids = [].map.call(listEl.querySelectorAll(".row-item"), function (r) { return Number(r.getAttribute("data-id")); });
        try { await api("POST", endpoint, { ids: ids }); toast("Order saved.", "ok"); }
        catch (err) { handleError(err); if (reload) reload(); }
      });
    });
    listEl.addEventListener("dragover", function (e) {
      if (!dragEl) return;
      e.preventDefault();
      var after = afterEl(e.clientY);
      if (after == null) listEl.appendChild(dragEl);
      else listEl.insertBefore(dragEl, after);
    });
  }

  // --- image upload helpers ---
  async function uploadFile(file) {
    var fd = new FormData();
    fd.append("image", file);
    var res = await fetch("/api/admin/upload", {
      method: "POST", credentials: "same-origin",
      headers: { "X-CSRF-Token": getCookie("cc_csrf") }, body: fd
    });
    var data = null; try { data = await res.json(); } catch (e) {}
    if (!res.ok) throw new Error((data && data.error) || "Upload failed (" + res.status + ")");
    return data; // { url, thumb_url }
  }

  function uploaderHtml() {
    return '<div class="field"><label>Or upload an image</label>' +
      '<input type="file" accept="image/*" data-upload-input hidden>' +
      '<button type="button" class="btn btn-sm" data-upload-btn>Choose &amp; upload image</button>' +
      '<span class="help" data-upload-status style="margin-left:8px"></span>' +
      '<div data-upload-preview></div></div>';
  }

  function attachUploader(modal, onUploaded) {
    var btn = modal.querySelector("[data-upload-btn]");
    var input = modal.querySelector("[data-upload-input]");
    var status = modal.querySelector("[data-upload-status]");
    var preview = modal.querySelector("[data-upload-preview]");
    if (!btn || !input) return;
    btn.addEventListener("click", function () { input.click(); });
    input.addEventListener("change", async function () {
      var file = input.files && input.files[0];
      if (!file) return;
      status.textContent = "Uploading…";
      btn.disabled = true;
      try {
        var data = await uploadFile(file);
        status.textContent = "Uploaded ✓";
        if (preview) preview.innerHTML = '<img src="' + esc(data.thumb_url) +
          '" alt="" style="width:90px;height:90px;object-fit:cover;border-radius:8px;margin-top:8px">';
        onUploaded(data);
      } catch (err) {
        status.textContent = (err && err.message) || "Upload failed.";
      } finally {
        btn.disabled = false; input.value = "";
      }
    });
  }

  // Datalist for portfolio categories (added once, populated lazily is fine).
  var dl = document.createElement("datalist");
  dl.id = "pf-cats";
  document.body.appendChild(dl);

  // ------------------------------------------------------------------- boot
  (async function init() {
    try {
      var me = await api("GET", "/me");
      showApp(me.admin);
    } catch (err) {
      showLogin();
    }
  })();
})();
