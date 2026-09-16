/* role preview */
(function () {
  var buttons = document.querySelectorAll("[data-role]");
  var panels = document.querySelectorAll("[data-panel]");
  buttons.forEach(function (btn) {
    btn.addEventListener("click", function () {
      var want = btn.getAttribute("data-role");
      buttons.forEach(function (b) {
        var on = b === btn;
        b.setAttribute("aria-selected", on ? "true" : "false");
        b.classList.toggle("filled", on);
      });
      panels.forEach(function (p) {
        p.hidden = p.getAttribute("data-panel") !== want;
      });
    });
  });
})();

/* sign in form */

/* theme */
(function () {
  var root = document.documentElement;
  var btn = document.getElementById("theme-btn");
  var icon = document.getElementById("theme-icon");
  var SUN = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>';
  var MOON = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"></path>';

  function stored() {
    try { return localStorage.getItem("sb-theme"); } catch (e) { return null; }
  }
  function current() {
    var set = root.getAttribute("data-theme");
    if (set) return set;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  function paint() {
    var dark = current() === "dark";
    icon.innerHTML = dark ? SUN : MOON;
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  var saved = stored();
  if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  paint();
  btn.addEventListener("click", function () {
    var next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("sb-theme", next); } catch (e) {}
    paint();
  });
})();

/* install guide */
(function () {
  var modal = document.getElementById("soon");
  var card = modal.querySelector(".modal-card");
  var closeBtn = modal.querySelector(".modal-close");
  var tabs = modal.querySelectorAll("[data-guide]");
  var panels = modal.querySelectorAll("[data-guide-panel]");
  var opener = null;

  function thisDevice() {
    var ua = navigator.userAgent || "";
    if (/iPhone|iPad|iPod/i.test(ua)) return "ios";
    if (/Android/i.test(ua)) return "android";
    return "other";
  }
  function show(which) {
    tabs.forEach(function (t) {
      t.setAttribute("aria-selected", t.getAttribute("data-guide") === which ? "true" : "false");
    });
    panels.forEach(function (p) {
      p.hidden = p.getAttribute("data-guide-panel") !== which;
    });
  }
  var kicker = modal.querySelector(".eyebrow");
  var title = document.getElementById("guide-title");
  var say = modal.querySelector(".say");
  var COPY = {
    ios: {
      title: "Install on your iPhone.",
      say: "Safari puts it on your home screen in three taps. Not on the App Store yet; this is how it gets on your phone today."
    },
    android: {
      title: "Install on your Android.",
      say: "Chrome installs it properly: own icon, own window, no browser bar. Not on Play Store yet; this is how it gets on your phone today."
    },
    other: {
      title: "Install on this computer.",
      say: "Chrome and Edge can keep SportBase in its own window. Everything works in a normal tab too, so the install is only for convenience."
    }
  };
  function open(el) {
    var want = el.getAttribute("data-guide-open") || "auto";
    var which = want === "auto" ? thisDevice() : want;
    show(which);
    var copy = COPY[which] || COPY.other;
    title.textContent = copy.title;
    say.textContent = copy.say;
    opener = el;
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    closeBtn.focus();
    modal.scrollTop = 0;
    card.scrollTop = 0;
  }
  function close() {
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    if (opener) opener.focus();
  }

  tabs.forEach(function (t) {
    t.addEventListener("click", function () {
      var which = t.getAttribute("data-guide");
      show(which);
      var copy = COPY[which] || COPY.other;
      title.textContent = copy.title;
      say.textContent = copy.say;
    });
  });
  document.querySelectorAll("[data-guide-open]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); open(el); });
  });
  modal.querySelectorAll("[data-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (modal.hidden) return;
    if (e.key === "Escape") { close(); return; }
    if (e.key !== "Tab") return;
    var items = Array.prototype.filter.call(
      card.querySelectorAll("button, a[href]"),
      function (el) { return el.offsetParent !== null; }
    );
    if (!items.length) return;
    var first = items[0];
    var last = items[items.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });

  /* copy button */
  modal.querySelectorAll("[data-copy]").forEach(function (btn) {
    var label = btn.textContent;
    btn.addEventListener("click", function () {
      var value = btn.getAttribute("data-copy") === "mail"
        ? "angelicamongaya8@gmail.com"
        : window.location.origin + window.location.pathname;
      function ok() {
        btn.textContent = "Copied";
        setTimeout(function () { btn.textContent = label; }, 1800);
      }
      function nope() { btn.textContent = value; }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(value).then(ok, nope);
        } else { nope(); }
      } catch (e) { nope(); }
    });
  });

  /* prompt delay */
  var prompt = document.getElementById("prompt");
  var WEEK = 7 * 24 * 60 * 60 * 1000;
  var snoozed = false;
  try {
    var until = parseInt(localStorage.getItem("sb-prompt-until") || "0", 10);
    snoozed = until > Date.now();
  } catch (e) {}

  function maybeShow() {
    if (snoozed) return;
    if (window.scrollY < 320) return;
    prompt.hidden = false;
    window.removeEventListener("scroll", maybeShow);
  }
  window.addEventListener("scroll", maybeShow, { passive: true });
  maybeShow();

  function later() {
    prompt.hidden = true;
    snoozed = true;
    try { localStorage.setItem("sb-prompt-until", String(Date.now() + WEEK)); } catch (e) {}
  }
  document.getElementById("prompt-close").addEventListener("click", later);
  document.getElementById("prompt-later").addEventListener("click", later);
})();

/* live venues */
(function () {
  var API = "https://xbhzofzpsbdrdrdkltbs.supabase.co/rest/v1/";
  var KEY = "sb_publishable_8VooxzEgXLxbVWrJbgJuYg_sOXfnkQd";
  var APP = "https://angelicamongaya8-design.github.io/sportbase-site/app.html";
  var grid = document.getElementById("venue-grid");
  var note = document.getElementById("venue-note");

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function peso(n) { return "\u20B1" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 }); }

  function card(v) {
    var courts = (v.courts || []).filter(function (c) { return c.status !== "unavailable"; });
    var sports = [];
    courts.forEach(function (c) { if (c.sport && sports.indexOf(c.sport) === -1) sports.push(c.sport); });
    var cheapest = null;
    courts.forEach(function (c) { if (c.hourly_rate != null && (cheapest == null || c.hourly_rate < cheapest)) cheapest = c.hourly_rate; });
    var photo = v.photo_url || (v.photos && v.photos[0]) || null;
    var hours = v.opening_time && v.closing_time ? v.opening_time + " \u2013 " + v.closing_time : (v.business_hours || "hours on the venue page");
    return '<a class="vcard" href="' + APP + "?venue=" + encodeURIComponent(v.id) + '">' +
      (photo
        ? '<img class="vshot" src="' + esc(photo) + '" alt="" loading="lazy" onerror="this.replaceWith(Object.assign(document.createElement(\'span\'),{className:\'vshot vshot-blank\',textContent:\'no photo yet\'}))">'
        : '<span class="vshot vshot-blank">' + esc(sports[0] || "court") + '</span>') +
      '<span class="vbody"><b>' + esc(v.name) + '</b>' +
      '<span class="where">' + esc([v.city, v.address].filter(Boolean).join(" \u00b7 ")) + '</span>' +
      '<span class="vmeta">' +
      (cheapest != null ? '<span class="vtag rate">from ' + peso(cheapest) + '/hr</span>' : "") +
      '<span class="vtag">' + esc(hours) + '</span>' +
      (sports.length ? '<span class="vtag">' + esc(sports.slice(0, 2).join(", ")) + '</span>' : "") +
      '</span></span></a>';
  }

  var url = API + "venues?select=id,name,city,address,photo_url,photos,opening_time,closing_time,business_hours,courts(sport,hourly_rate,status)&status=eq.approved&limit=6";
  fetch(url, { headers: { apikey: KEY, Authorization: "Bearer " + KEY } })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error(String(r.status))); })
    .then(function (rows) {
      if (!rows || !rows.length) throw new Error("empty");
      grid.innerHTML = rows.map(card).join("");
      note.hidden = false;
      note.innerHTML = 'Tap any venue to open the web app. Free hours, prices and the booking itself live in there. <a href="' + APP + '?auth=in">sign in or create an account</a>.';
    })
    .catch(function () {
      grid.innerHTML = '<div class="skeleton" style="grid-column:1/-1;min-height:120px">Venue list opens in the app</div>';
      note.hidden = false;
      note.innerHTML = 'The live list could not be loaded here. <a href="' + APP + '">Open the web app</a> to see every venue.';
    });
})();

/* sample screens */
(function () {
  document.querySelectorAll("[data-screen-tab]").forEach(function (tab) {
    tab.addEventListener("click", function () {
      var want = tab.getAttribute("data-screen-tab");
      var bar = tab.parentElement;
      var screen = tab.closest("[data-panel]");
      bar.querySelectorAll("[data-screen-tab]").forEach(function (t) {
        if (t === tab) t.setAttribute("aria-current", "page");
        else t.removeAttribute("aria-current");
      });
      screen.querySelectorAll("[data-screen]").forEach(function (panel) {
        panel.hidden = panel.getAttribute("data-screen") !== want;
      });
    });
  });
})();

/* one query */
(function () {
  var API = "https://xbhzofzpsbdrdrdkltbs.supabase.co/rest/v1/";
  var KEY = "sb_publishable_8VooxzEgXLxbVWrJbgJuYg_sOXfnkQd";
  var stat = document.getElementById("live-stat");
  var rateGrid = document.getElementById("rate-grid");

  function peso(n) { return "\u20B1" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 }); }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  fetch(API + "venues?select=id,courts(sport,hourly_rate,status)&status=eq.approved", {
    headers: { apikey: KEY, Authorization: "Bearer " + KEY },
  })
    .then(function (r) { return r.ok ? r.json() : Promise.reject(new Error("no")); })
    .then(function (rows) {
      var courts = 0;
      var cheapest = null;
      var bySport = {};
      rows.forEach(function (v) {
        (v.courts || []).forEach(function (c) {
          if (c.status === "unavailable") return;
          courts += 1;
          if (c.hourly_rate != null) {
            if (cheapest == null || c.hourly_rate < cheapest) cheapest = c.hourly_rate;
            if (c.sport) {
              if (!bySport[c.sport]) bySport[c.sport] = { min: c.hourly_rate, courts: 1 };
              else {
                bySport[c.sport].courts += 1;
                if (c.hourly_rate < bySport[c.sport].min) bySport[c.sport].min = c.hourly_rate;
              }
            }
          }
        });
      });
      if (stat) {
        stat.innerHTML = "<b>" + rows.length + "</b> venues \u00b7 <b>" + courts +
          "</b> courts" + (cheapest != null ? " \u00b7 from <b>" + peso(cheapest) + "</b> an hour" : "");
      }
      if (rateGrid) {
        var sports = Object.keys(bySport).sort(function (a, b) { return bySport[a].min - bySport[b].min; });
        rateGrid.innerHTML = sports.length
          ? sports.map(function (s) {
              return '<div class="rate"><small>' + esc(s) + "</small><b>" + peso(bySport[s].min) +
                '</b><i>from, ' + bySport[s].courts + " court" + (bySport[s].courts === 1 ? "" : "s") + "</i></div>";
            }).join("")
          : '<div class="skeleton" style="grid-column:1/-1;min-height:96px">Prices open in the app</div>';
      }
    })
    .catch(function () {
      if (stat) stat.textContent = "Venues and prices open in the app.";
      if (rateGrid) rateGrid.innerHTML = '<div class="skeleton" style="grid-column:1/-1;min-height:96px">Prices open in the app</div>';
    });
})();

/* launch list */
(function () {
  var API = "https://xbhzofzpsbdrdrdkltbs.supabase.co/rest/v1/launch_notify";
  var KEY = "sb_publishable_8VooxzEgXLxbVWrJbgJuYg_sOXfnkQd";

  function wire(inputId, btnId, msgId, source) {
    var input = document.getElementById(inputId);
    var btn = document.getElementById(btnId);
    var msg = document.getElementById(msgId);
    if (!input || !btn || !msg) return;

    btn.addEventListener("click", async function () {
      var email = (input.value || "").trim();
      msg.hidden = false;
      msg.className = "notify-msg";
      if (!email || email.indexOf("@") < 1) { msg.textContent = "An email address, please. That is all we need."; return; }
      btn.disabled = true;
      msg.textContent = "Adding you\u2026";
      var ctrl = new AbortController();
      var timer = setTimeout(function () { ctrl.abort(); }, 15000);
      try {
        var r = await fetch(API, {
          method: "POST",
          headers: { apikey: KEY, Authorization: "Bearer " + KEY, "Content-Type": "application/json", Prefer: "return=minimal" },
          body: JSON.stringify({ email: email, source: source }),
          signal: ctrl.signal,
        });
        if (r.ok || r.status === 409) {
          msg.className = "notify-msg good";
          msg.textContent = "Done. You will hear from us the day it is on the stores.";
          input.value = "";
        } else {
          var body = await r.text();
          msg.textContent = body.indexOf("duplicate") > -1
            ? "You are already on the list."
            : "That did not save. Try again in a moment.";
        }
      } catch (e) {
        msg.textContent = "That did not save. Check the connection and try again.";
      } finally {
        clearTimeout(timer);
        btn.disabled = false;
      }
    });

    input.addEventListener("keydown", function (e) { if (e.key === "Enter") btn.click(); });
  }

  wire("notify-email", "notify-go", "notify-msg", "website");
  wire("tell-email", "tell-go", "tell-msg", "website-cta");
})();

/* notify form */
(function () {
  var modal = document.getElementById("tell");
  if (!modal) return;
  var input = document.getElementById("tell-email");
  var opener = null;

  function open(el) {
    opener = el;
    modal.hidden = false;
    document.documentElement.style.overflow = "hidden";
    if (input) { input.value = ""; input.focus(); }
    var msg = document.getElementById("tell-msg");
    if (msg) { msg.hidden = true; msg.textContent = ""; }
  }
  function close() {
    modal.hidden = true;
    document.documentElement.style.overflow = "";
    if (opener) opener.focus();
  }
  document.querySelectorAll("[data-tell-open]").forEach(function (el) {
    el.addEventListener("click", function (e) { e.preventDefault(); open(el); });
  });
  modal.querySelectorAll("[data-tell-close]").forEach(function (el) {
    el.addEventListener("click", close);
  });
  document.addEventListener("keydown", function (e) {
    if (!modal.hidden && e.key === "Escape") close();
  });
})();

/* install prompt */
(function () {
  var deferred = null;
  var panel = document.getElementById("install-live");
  var btn = document.getElementById("install-now");

  var promptBtn = document.getElementById("prompt-install");
  var howBtn = document.getElementById("prompt-how");

  window.addEventListener("beforeinstallprompt", function (e) {
    e.preventDefault();
    deferred = e;
    if (panel) panel.hidden = false;
    /* native install */
    if (promptBtn && howBtn) { promptBtn.hidden = false; howBtn.hidden = true; }
  });
  window.addEventListener("appinstalled", function () {
    deferred = null;
    if (panel) panel.hidden = true;
    if (promptBtn && howBtn) { promptBtn.hidden = true; howBtn.hidden = false; }
    var card = document.getElementById("prompt");
    if (card) card.hidden = true;
  });

  async function spend() {
    if (!deferred) return false;
    deferred.prompt();
    try { await deferred.userChoice; } catch (e) {}
    deferred = null;
    return true;
  }
  if (promptBtn) {
    promptBtn.addEventListener("click", async function () {
      promptBtn.disabled = true;
      var did = false;
      try { did = await spend(); } finally { promptBtn.disabled = false; }
      if (!did && howBtn) { promptBtn.hidden = true; howBtn.hidden = false; }
    });
  }
  if (btn) {
    btn.addEventListener("click", async function () {
      if (!deferred) { if (panel) panel.hidden = true; return; }
      btn.disabled = true;
      try {
        deferred.prompt();
        await deferred.userChoice;
      } catch (e) {
      } finally {
        deferred = null;
        btn.disabled = false;
        if (panel) panel.hidden = true;
      }
    });
  }

  /* service worker */
  if ("serviceWorker" in navigator && location.protocol === "https:") {
    window.addEventListener("load", function () {
      navigator.serviceWorker.register("sw.js").catch(function () {});
    });
  }
})();

/* venue rail */
(function () {
  var rail = document.getElementById("venue-grid");
  if (!rail) return;
  var prev = document.querySelector('[data-rail="prev"]');
  var next = document.querySelector('[data-rail="next"]');

  function step() {
    var card = rail.firstElementChild;
    var w = card ? card.getBoundingClientRect().width : 260;
    return Math.round(w + 16);
  }
  function sync() {
    if (!prev || !next) return;
    var max = rail.scrollWidth - rail.clientWidth - 2;
    prev.disabled = rail.scrollLeft <= 2;
    next.disabled = rail.scrollLeft >= max;
    var idle = max <= 2;
    prev.hidden = idle;
    next.hidden = idle;
  }
  if (prev) prev.addEventListener("click", function () { rail.scrollBy({ left: -step(), behavior: "smooth" }); });
  if (next) next.addEventListener("click", function () { rail.scrollBy({ left: step(), behavior: "smooth" }); });
  rail.addEventListener("scroll", sync, { passive: true });
  window.addEventListener("resize", sync);
  new MutationObserver(sync).observe(rail, { childList: true });
  sync();
})();
