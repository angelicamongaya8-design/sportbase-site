/* setup */

document.getElementById("brand-img").src = document.querySelector("link[rel=icon]").href;

const SUPABASE_URL = "https://xbhzofzpsbdrdrdkltbs.supabase.co";
const SUPABASE_KEY = "sb_publishable_8VooxzEgXLxbVWrJbgJuYg_sOXfnkQd";
const HCAPTCHA_SITE_KEY = "db5ca28e-2866-4e50-ab8c-d1fec17ae1d6";
const VENUE_TZ = "Asia/Manila";

if (!window.supabase) {
  document.getElementById("auth-msg").hidden = false;
  document.getElementById("auth-msg").innerHTML =
    "<b>Could not load the SportBase library.</b> Check the connection and reload; nothing else on this page will work until it loads.";
  throw new Error("supabase-js did not load");
}

const sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

/* public client */
const sbPublic = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
    /* own storage */
    storageKey: "sb-public-" + Math.random().toString(36).slice(2),
  },
});

/* timeout */
function withTimeout(promise, ms, fallback) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms)),
  ]);
}

/* clear token */
const AUTH_KEY = "sb-" + SUPABASE_URL.replace(/^https:\/\//, "").split(".")[0] + "-auth-token";
function healStuckSession() {
  let already = false;
  try { already = sessionStorage.getItem("sb-healed") === "1"; } catch (e) {}
  if (already) return false;
  try {
    sessionStorage.setItem("sb-healed", "1");
    localStorage.removeItem(AUTH_KEY);
  } catch (e) { return false; }
  location.reload();
  return true;
}

/* session read */
async function sessionNow() {
  const res = await withTimeout(sb.auth.getSession(), 4000, { stuck: true });
  if (res && res.stuck) {
    healStuckSession();
    return null;
  }
  return (res && res.data && res.data.session) || null;
}

/* helpers */
const $ = (id) => document.getElementById(id);
const peso = (n) => "₱" + Number(n || 0).toLocaleString("en-PH", { maximumFractionDigits: 0 });

function todayKey() {
  /* venue day */
  return new Intl.DateTimeFormat("en-CA", { timeZone: VENUE_TZ }).format(new Date());
}
function addDays(key, n) {
  const [y, m, d] = key.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d));
  dt.setUTCDate(dt.getUTCDate() + n);
  return dt.toISOString().slice(0, 10);
}
function dayName(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", { weekday: "short", timeZone: "UTC" });
}
function dayNum(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).getUTCDay();
}
function prettyDate(key) {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-PH", {
    weekday: "short", day: "numeric", month: "short", timeZone: "UTC",
  });
}
function toMinutes(t) {
  /* parse hours */
  if (!t) return null;
  const m = String(t).trim().match(/^(\d{1,2}):(\d{2})(?::\d{2})?\s*([AaPp][Mm])?/);
  if (!m) return null;
  let h = Number(m[1]);
  const mins = Number(m[2]);
  const ap = m[3] ? m[3].toLowerCase() : null;
  if (ap === "pm" && h !== 12) h += 12;
  if (ap === "am" && h === 12) h = 0;
  return h * 60 + mins;
}
const hour24 = (h) => String(h).padStart(2, "0") + ":00:00";
function hourLabel(h) {
  const suffix = h < 12 || h === 24 ? "am" : "pm";
  const twelve = h % 12 === 0 ? 12 : h % 12;
  return twelve + suffix;
}
function escapeHtml(s) {
  return String(s == null ? "" : s).replace(/[&<>"']/g, (c) => (
    { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]
  ));
}

/* peak rate */
function isPeak(venue, dateKey, hour) {
  const start = toMinutes(venue.peak_start);
  const end = toMinutes(venue.peak_end);
  if (start == null || end == null) return false;
  const days = venue.peak_days || [];
  if (days.length && !days.includes(dayNum(dateKey))) return false;
  const at = hour * 60;
  return end > start ? at >= start && at < end : at >= start || at < end;
}
function rateFor(court, venue, dateKey, hour) {
  if (court.peak_rate == null) return court.hourly_rate;
  return isPeak(venue, dateKey, hour) ? court.peak_rate : court.hourly_rate;
}

/* theme */
(function () {
  const root = document.documentElement;
  const btn = $("theme-btn");
  const icon = $("theme-icon");
  const SUN = '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"></path>';
  const MOON = '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a6.8 6.8 0 0 0 10.5 10.5z"></path>';
  const current = () => root.getAttribute("data-theme") ||
    (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  function paint() {
    const dark = current() === "dark";
    icon.innerHTML = dark ? SUN : MOON;
    btn.setAttribute("aria-label", dark ? "Switch to light theme" : "Switch to dark theme");
  }
  try {
    const saved = localStorage.getItem("sb-theme");
    if (saved === "dark" || saved === "light") root.setAttribute("data-theme", saved);
  } catch (e) {}
  paint();
  btn.addEventListener("click", function () {
    const next = current() === "dark" ? "light" : "dark";
    root.setAttribute("data-theme", next);
    try { localStorage.setItem("sb-theme", next); } catch (e) {}
    paint();
  });
})();

/* state */
const state = {
  session: null,
  profile: null,
  venues: [],
  venue: null,
  dateKey: todayKey(),
  busy: [],
  picked: [],          // { courtId, courtName, date, hour, rate }
  gear: [],            // equipment rows for this venue
  qty: {},             // equipment id -> how many
  promo: null,         // the applied promotion, if any
  bookings: [],
  booking: null,
  chats: [],
  chatNames: {},
  chat: null,           // the open conversation
  ratings: {},          // venue id -> { avg, count }
  reviews: [],          // reviews for the open venue
  favs: {},             // venue id -> favourite row id
};

/* views */
const VIEWS = ["auth", "browse", "venue", "bookings", "booking", "owner", "admin", "apply", "me", "chats", "chat"];

/* back stack */
let navTrail = [];
let goingBack = false;

const BACK_LABEL = {
  browse: "All venues",
  bookings: "Your bookings",
  booking: "That booking",
  venue: "The venue",
  owner: "Your venue",
  admin: "The queue",
  me: "Your account",
  chats: "Messages",
  auth: "Sign in",
};

function currentView() {
  return VIEWS.find((v) => !$("view-" + v).hidden) || null;
}

function updateBackLabels() {
  const to = navTrail[navTrail.length - 1];
  const text = "\u2190 " + (to && BACK_LABEL[to] ? BACK_LABEL[to] : "Back");
  ["venue-back", "booking-back", "apply-back", "auth-back", "chat-back"].forEach((id) => {
    const b = $(id);
    if (b) b.textContent = text;
  });
}

function goBack(fallback) {
  const target = navTrail.pop() || fallback || "browse";
  goingBack = true;
  show(target);
  goingBack = false;
  if (target === "bookings") loadBookings();
  else if (target === "owner") loadOwner();
  else if (target === "admin") loadAdmin();
  else if (target === "me") renderMe();
  else if (target === "browse") renderVenues();
}

/* remember view */
const WHERE = "sb-where";
function rememberWhere(view) {
  try {
    sessionStorage.setItem(WHERE, JSON.stringify({
      v: view,
      venue: state.venue ? state.venue.id : null,
      booking: state.booking ? state.booking.id : null,
      chat: state.chat ? state.chat.id : null,
      sport: $("sport-filter") ? $("sport-filter").value : "",
    }));
  } catch (e) {}
}
function readWhere() {
  try { return JSON.parse(sessionStorage.getItem(WHERE) || "null"); } catch (e) { return null; }
}

async function restoreWhere(saved) {
  const w = saved || readWhere();
  if (!w || !w.v) return false;
  /* skip forms */
  if (w.v === "auth" || w.v === "apply") return false;
  const needsAccount = ["bookings", "booking", "owner", "admin", "me"].indexOf(w.v) > -1;
  if (needsAccount && !state.session) return false;

  if (w.sport && $("sport-filter")) {
    const opt = Array.from($("sport-filter").options).find((o) => o.value === w.sport);
    if (opt) { $("sport-filter").value = w.sport; syncSportNote(); renderVenues(); }
  }
  if (w.v === "venue" && w.venue) { await openVenue(w.venue); return true; }
  if (w.v === "booking" && w.booking) { await openBooking(w.booking); return true; }
  if (w.v === "bookings") { show("bookings"); loadBookings(); return true; }
  if (w.v === "owner") { show("owner"); loadOwner(); return true; }
  if (w.v === "admin") { show("admin"); loadAdmin(); return true; }
  if (w.v === "me") { show("me"); renderMe(); return true; }
  if (w.v === "chats") { show("chats"); loadChats(); return true; }
  if (w.v === "chat" && w.chat) { await openChat(w.chat); return true; }
  if (w.v === "browse") { show("browse"); return true; }
  return false;
}

function show(view) {
  const from = currentView();
  rememberWhere(view);
  if (!goingBack && from && from !== view) navTrail.push(from);
  if (navTrail.length > 12) navTrail.shift();
  VIEWS.forEach((v) => { $("view-" + v).hidden = v !== view; });
  const inApp = view !== "auth";
  const signedIn = !!state.session;
  /* tab bar */
  $("navbar").hidden = !(inApp && signedIn);
  $("signin-btn").hidden = !(inApp && !signedIn);
  $("account-btn").hidden = !(inApp && signedIn);
  if (!signedIn) closeAccountMenu();
  /* guarded views */
  document.querySelector('[data-nav="bookings"]').hidden = !signedIn;
  document.querySelector('[data-nav="me"]').hidden = !signedIn;
  document.querySelector('[data-nav="chats"]').hidden = !signedIn;
  document.querySelectorAll("[data-nav]").forEach((b) => {
    const nav = b.getAttribute("data-nav");
    const on = (view === "venue" || view === "browse") ? nav === "browse"
      : (view === "booking" ? nav === "bookings" : nav === view);
    if (on) b.setAttribute("aria-current", "page"); else b.removeAttribute("aria-current");
  });
  $("basket").hidden = !(view === "venue" && state.picked.length > 0);
  updateBackLabels();
  syncDock();
  window.scrollTo(0, 0);
}

/* home by role */
function homeView() {
  const role = (state.profile && state.profile.role) || "player";
  if (role === "owner") return "owner";
  if (role === "admin") return "admin";
  return "browse";
}
function say(text, kind) {
  const box = $("auth-msg");
  box.hidden = !text;
  box.innerHTML = text || "";
  box.style.borderLeftColor = kind === "ok" ? "#2F9E63" : "var(--accent)";
}

/* captcha */
/* render widget */
let captchaId = null;
function captchaReady() {
  if (captchaId !== null || !window.hcaptcha) return;
  try {
    captchaId = window.hcaptcha.render("captcha-slot", { sitekey: HCAPTCHA_SITE_KEY, theme: "dark" });
  } catch (e) { captchaId = null; }
}
window.onHcaptchaLoad = captchaReady;
function captchaToken() {
  if (captchaId === null || !window.hcaptcha) return null;
  const token = window.hcaptcha.getResponse(captchaId);
  return token || null;
}
function captchaReset() {
  if (captchaId !== null && window.hcaptcha) window.hcaptcha.reset(captchaId);
}

/* auth */
let authMode = "in";
function setAuthMode(mode) {
  authMode = mode;
  const up = mode === "up";
  $("auth-heading").textContent = up ? "Create account" : "Sign in";
  $("auth-lede").textContent = up
    ? "One account for the web and the phone app. Use an email you can open, because the confirmation lands there."
    : "Same account as the phone app. Your bookings follow you.";
  $("name-field").hidden = !up;
  $("auth-go").textContent = up ? "Create my account" : "Sign in";
  $("f-pass").setAttribute("autocomplete", up ? "new-password" : "current-password");
  document.querySelectorAll("[data-auth-tab]").forEach((t) => {
    t.setAttribute("aria-selected", t.getAttribute("data-auth-tab") === mode ? "true" : "false");
  });
  say("");
}
document.querySelectorAll("[data-auth-tab]").forEach((t) => {
  t.addEventListener("click", () => setAuthMode(t.getAttribute("data-auth-tab")));
});

$("auth-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const email = $("f-email").value.trim();
  const password = $("f-pass").value;
  const name = $("f-name").value.trim();
  if (!email || !password) return say("Email and password, please.");
  if (authMode === "up" && !name) return say("What should we call you?");

  const token = captchaToken();
  const go = $("auth-go");
  go.disabled = true;
  go.innerHTML = '<span class="spinner"></span>';

  try {
    if (authMode === "up") {
      const { error } = await sb.auth.signUp({
        email, password,
        options: {
          data: { name },
          captchaToken: token || undefined,
          /* redirect back */
          emailRedirectTo: window.location.origin + window.location.pathname,
        },
      });
      if (error) throw error;
      captchaReset();
      setAuthMode("in");
      say("<b>Account made.</b> Check your email for the confirmation link, then sign in here.", "ok");
    } else {
      const { error } = await sb.auth.signInWithPassword({
        email, password, options: { captchaToken: token || undefined },
      });
      if (error) throw error;
      captchaReset();
    }
  } catch (err) {
    captchaReset();
    say(escapeHtml(err.message || "That did not work."));
  } finally {
    go.disabled = false;
    go.textContent = authMode === "up" ? "Create my account" : "Sign in";
  }
});

document.querySelectorAll("[data-oauth]").forEach((btn) => {
  btn.addEventListener("click", async () => {
    const provider = btn.getAttribute("data-oauth");
    const { error } = await sb.auth.signInWithOAuth({
      provider,
      options: { redirectTo: window.location.origin + window.location.pathname },
    });
    if (error) say(escapeHtml(error.message));
  });
});

/* sign out */
async function signOut() {
  try { sessionStorage.removeItem(WHERE); } catch (e) {}
  navTrail = [];
  state.favs = {};
  state.profile = null;
  await withTimeout(sb.auth.signOut(), 4000, null);
  state.session = null;
  show("browse");
  renderVenues();
}

/* boot */
async function loadProfile() {
  const { data } = await sb.rpc("my_profile");
  state.profile = (data && data[0]) || null;
  const role = (state.profile && state.profile.role) || "player";
  renderAccountButton();
  document.querySelector('[data-nav="owner"]').hidden = !(role === "owner" || role === "admin");
  document.querySelector('[data-nav="admin"]').hidden = role !== "admin";
  renderMe();
  loadFavourites();
}

sb.auth.onAuthStateChange(async (_event, session) => {
  const wasSignedOut = !state.session;
  state.session = session;
  if (!session) {
    document.querySelector('[data-nav="owner"]').hidden = true;
    document.querySelector('[data-nav="admin"]').hidden = true;
    show("browse");
    return;
  }
  await loadProfile();
  /* resume picks */
  if (wantsToApply) { openApply(); }
  else if (wasSignedOut && state.venue && state.picked.length) show("venue");
  else openHome();
  loadVenues();
  const paid = new URLSearchParams(window.location.search).get("paid");
  if (paid) {
    history.replaceState({}, "", window.location.pathname);
    openBooking(paid, true);
  }
});

(async function boot() {
  /* read first */
  const saved = readWhere();
  /* public first */
  show("browse");
  const venuesReady = loadVenues();
  state.session = await sessionNow();

  /* form wins */
  const door = new URLSearchParams(window.location.search).get("auth");
  if (!state.session && (door === "in" || door === "up")) {
    setAuthMode(door);
    show("auth");
    return;
  }
  if (state.session) await loadProfile();
  if (wantsToApply) {
    if (state.session) openApply(); else askForAccountFirst();
    return;
  }
  await venuesReady;

  /* deep link */
  const wantedVenue = new URLSearchParams(window.location.search).get("venue");
  if (wantedVenue && state.venues.some((v) => String(v.id) === wantedVenue)) {
    navTrail = ["browse"];
    updateBackLabels();
    await openVenue(wantedVenue);
    return;
  }

  if (await restoreWhere(saved)) return;
  if (state.session) openHome();
})();

/* service worker */
if ("serviceWorker" in navigator && location.protocol === "https:") {
  window.addEventListener("load", () => navigator.serviceWorker.register("sw.js").catch(() => {}));
}

$("signin-btn").addEventListener("click", () => { setAuthMode("in"); say(""); show("auth"); });
/* list a venue */
/* apply form */
var wantsToApply = new URLSearchParams(window.location.search).get("intent") === "venue";

function applyState(html) {
  $("apply-state").hidden = !html;
  $("apply-state-msg").innerHTML = html || "";
  $("apply-card").hidden = !!html;
}

async function openApply() {
  wantsToApply = false;
  /* clear query */
  if (window.location.search.indexOf("intent=") > -1) {
    history.replaceState({}, "", window.location.pathname);
  }
  show("apply");
  applyState("");
  $("apply-chip").hidden = true;
  $("apply-msg").hidden = true;

  const role = (state.profile && state.profile.role) || null;
  if (role === "owner" || role === "admin") {
    applyState("<b>You are already an owner here.</b> Your venue lives under " +
      "<b>Venue</b> in the bar at the bottom; adding another one is done in the phone app.");
    return;
  }

  const { data, error } = await sb
    .from("owner_applications")
    .select("id, venue_name, status, rejection_reason, created_at")
    .order("created_at", { ascending: false })
    .limit(1);
  if (error) return;
  const row = (data || [])[0];
  if (!row) return;

  if (row.status === "pending") {
    $("apply-chip").hidden = false;
    $("apply-chip").textContent = "waiting";
    applyState("<b>" + escapeHtml(row.venue_name) + " is in the queue.</b> An admin " +
      "reviews it and you will hear back in the app. Nothing else to do.");
  } else if (row.status === "approved") {
    applyState("<b>" + escapeHtml(row.venue_name) + " was approved.</b> Sign out and back " +
      "in if you do not see the Venue tab yet.");
  } else if (row.status === "rejected") {
    applyState("<b>That application was turned down.</b>" +
      (row.rejection_reason ? " Reason given: " + escapeHtml(row.rejection_reason) + "." : "") +
      " You can send a corrected one. <button class=\"btn small\" type=\"button\" id=\"apply-again\">try again</button>");
    const again = document.getElementById("apply-again");
    if (again) again.addEventListener("click", () => applyState(""));
  }
}

function askForAccountFirst() {
  setAuthMode("up");
  /* top notice */
  $("auth-heading").textContent = "List your venue";
  $("auth-lede").textContent =
    "It starts with an account, because an application belongs to somebody. " +
    "Make one here, or sign in, and the venue details come straight after.";
  show("auth");
}

$("apply-open").addEventListener("click", () => {
  if (!state.session) { wantsToApply = true; askForAccountFirst(); return; }
  openApply();
});
$("apply-back").addEventListener("click", () => goBack("browse"));

$("apply-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const msg = $("apply-msg");
  const go = $("apply-go");
  const row = {
    user_id: state.session && state.session.user.id,
    venue_name: $("a-venue").value.trim(),
    venue_address: $("a-address").value.trim(),
    business_name: $("a-business").value.trim(),
    permit_number: $("a-permit").value.trim(),
    permit_issuer: $("a-issuer").value.trim(),
    permit_expiry: $("a-expiry").value || null,
    contact_number: $("a-contact").value.trim(),
  };
  const missing = ["venue_name", "venue_address", "business_name", "permit_number", "permit_issuer", "contact_number"]
    .filter((k) => !row[k]);
  msg.hidden = false;
  if (!row.user_id) { msg.innerHTML = "<b>Sign in first.</b>"; return; }
  if (missing.length) { msg.innerHTML = "<b>Still missing:</b> the " + missing.length + " empty field(s) above."; return; }

  go.disabled = true;
  go.innerHTML = '<span class="spinner"></span>';
  const { error } = await sb.from("owner_applications").insert(row);
  go.disabled = false;
  go.textContent = "Send the application";
  if (error) { msg.innerHTML = "<b>That did not send.</b> " + escapeHtml(error.message); return; }
  msg.hidden = true;
  openApply();
});

$("auth-back").addEventListener("click", () => goBack("browse"));

/* browse */
async function loadVenues() {
  const list = $("venue-list");
  list.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const res = await withTimeout(
    sbPublic
      .from("venues")
      .select("id, name, address, city, status, description, amenities, photo_url, photos, lat, lng, contact_number, business_hours, opening_time, closing_time, open_days, peak_start, peak_end, peak_days, courts(id, name, sport, hourly_rate, peak_rate, status)")
      .eq("status", "approved"),
    9000,
    { slow: true }
  );
  if (res && res.slow) {
    /* stop spinner */
    list.innerHTML = '<div class="empty">The courts are taking too long to load. ' +
      '<button class="btn small" type="button" id="venue-retry" style="margin-left:8px">Try again</button></div>';
    const again = $("venue-retry");
    if (again) again.addEventListener("click", loadVenues);
    return;
  }
  const { data, error } = res;
  if (error) {
    list.innerHTML = '<div class="empty">' + escapeHtml(error.message) + "</div>";
    return;
  }
  state.venues = data || [];
  const sports = new Set();
  state.venues.forEach((v) => (v.courts || []).forEach((c) => c.sport && sports.add(c.sport)));
  const sel = $("sport-filter");
  sel.innerHTML = '<option value="">Every sport</option>' +
    Array.from(sports).sort().map((s) => '<option value="' + escapeHtml(s) + '">' + escapeHtml(s) + "</option>").join("");

  /* sport filter */
  const wanted = new URLSearchParams(window.location.search).get("sport");
  if (wanted) {
    const match = Array.from(sel.options).find(
      (o) => o.value && o.value.toLowerCase() === wanted.toLowerCase()
    );
    if (match) sel.value = match.value;
  }
  syncSportNote();
  renderVenues();
  loadRatings();
  loadFavourites();
}

function venueShot(v) {
  const list = Array.isArray(v.photos) ? v.photos.filter(Boolean) : [];
  return v.photo_url || list[0] || null;
}

/* stars */
function starLine(venueId) {
  const r = state.ratings[venueId];
  if (!r || !r.count) return '<span class="stars"><span>no reviews yet</span></span>';
  const full = Math.round(r.avg);
  return '<span class="stars">' + "\u2605".repeat(full) + "\u2606".repeat(5 - full) +
    " <span>" + r.avg.toFixed(1) + " \u00b7 " + r.count + (r.count === 1 ? " review" : " reviews") + "</span></span>";
}

function renderVenues() {
  const q = $("venue-search").value.trim().toLowerCase();
  const sport = $("sport-filter").value;
  const rows = state.venues.filter((v) => {
    const courts = courtsHere(v);
    if (sport && !courts.length) return false;
    if (!q) return true;
    return (v.name + " " + (v.city || "") + " " + (v.address || "")).toLowerCase().includes(q);
  });
  $("venue-count").textContent = rows.length + (rows.length === 1 ? " venue" : " venues");
  $("venue-empty").hidden = rows.length > 0;
  $("venue-list").innerHTML = rows.map((v) => venueCard(v)).join("");
  $("venue-list").querySelectorAll("[data-venue]").forEach((b) => {
    b.addEventListener("click", () => openVenue(b.getAttribute("data-venue")));
  });
  syncRailHints();
}

function venueCard(v) {
  const courts = courtsHere(v);
  const cheapest = courts.reduce((min, c) => (c.hourly_rate != null && (min == null || c.hourly_rate < min) ? c.hourly_rate : min), null);
  const sports = Array.from(new Set(courts.map((c) => c.sport).filter(Boolean))).slice(0, 3).join(", ");
  const shot = venueShot(v);
  return '<button class="vcard" type="button" data-venue="' + v.id + '">' +
    (shot
      /* photo fallback */
      ? '<img class="vshot" src="' + escapeHtml(shot) + '" alt="" loading="lazy" ' +
        'onerror="this.outerHTML=\'<div class=&quot;vshot vshot-none&quot;>No photo yet</div>\'">'
      : '<div class="vshot vshot-none">No photo yet</div>') +
    '<span class="vbody"><b>' + escapeHtml(v.name) + "</b>" +
    "<small>" + escapeHtml([v.city, v.address].filter(Boolean).join(" \u00b7 ")) + "</small>" +
    (sports ? "<small>" + escapeHtml(sports) + "</small>" : "") +
    '<span class="vmeta">' +
    (cheapest != null ? '<span class="pill go">from ' + peso(cheapest) + "/hr</span>" : "") +
    starLine(v.id) +
    "</span></span></button>";
}
$("venue-sport-clear").addEventListener("click", () => {
  $("sport-filter").value = "";
  syncSportNote();
  renderVenues();
  if (state.venue) openVenue(state.venue.id);
});
$("venue-search").addEventListener("input", renderVenues);
$("sport-filter").addEventListener("change", () => { syncSportNote(); renderVenues(); });

/* ratings */
async function loadRatings() {
  const { data } = await sbPublic.from("reviews").select("venue_id, rating");
  const by = {};
  (data || []).forEach((r) => {
    const k = r.venue_id;
    if (!by[k]) by[k] = { sum: 0, count: 0 };
    by[k].sum += Number(r.rating || 0);
    by[k].count += 1;
  });
  state.ratings = {};
  Object.keys(by).forEach((k) => { state.ratings[k] = { avg: by[k].sum / by[k].count, count: by[k].count }; });
  renderVenues();
  renderFavourites();
}

async function loadFavourites() {
  state.favs = {};
  if (!state.session) { renderFavourites(); return; }
  const { data } = await sb.from("favorites").select("id, venue_id").eq("user_id", state.session.user.id);
  (data || []).forEach((f) => { state.favs[f.venue_id] = f.id; });
  renderFavourites();
  syncHeart();
}

function renderFavourites() {
  const box = $("fav-list");
  if (!box) return;
  const ids = Object.keys(state.favs);
  const rows = state.venues.filter((v) => ids.indexOf(v.id) > -1);
  $("fav-empty").hidden = rows.length > 0 || !state.session;
  box.innerHTML = rows.map((v) => venueCard(v)).join("");
  box.querySelectorAll("[data-venue]").forEach((b) => {
    b.addEventListener("click", () => openVenue(b.getAttribute("data-venue")));
  });
  syncRailHints();
}

function syncHeart() {
  const btn = $("venue-fav");
  if (!btn || !state.venue) return;
  btn.hidden = !state.session;
  const on = !!state.favs[state.venue.id];
  btn.setAttribute("aria-pressed", on ? "true" : "false");
  btn.innerHTML = on ? "\u2665" : "\u2661";
  btn.setAttribute("aria-label", on ? "Saved. Tap to remove" : "Save this venue");
}

$("venue-fav").addEventListener("click", async () => {
  if (!state.session || !state.venue) return;
  const id = state.venue.id;
  const existing = state.favs[id];
  if (existing) {
    delete state.favs[id];
    syncHeart();
    await sb.from("favorites").delete().eq("id", existing);
  } else {
    state.favs[id] = "pending";
    syncHeart();
    const { data } = await sb.from("favorites").insert({ user_id: state.session.user.id, venue_id: id }).select("id").maybeSingle();
    if (data) state.favs[id] = data.id; else delete state.favs[id];
    syncHeart();
  }
  renderFavourites();
});

/* keep sport */
function currentSport() {
  const sel = $("sport-filter");
  return sel && sel.value ? sel.value : null;
}
function syncSportNote() {
  const sport = currentSport();
  $("sport-note").hidden = !sport;
  if (sport) $("sport-note-name").textContent = sport;
}
function courtsHere(venue) {
  const sport = currentSport();
  return (venue.courts || [])
    .filter((c) => c.status !== "unavailable")
    .filter((c) => !sport || c.sport === sport);
}
$("sport-clear").addEventListener("click", () => {
  $("sport-filter").value = "";
  syncSportNote();
  renderVenues();
  if (!$("view-venue").hidden && state.venue) openVenue(state.venue.id);
});

/* one venue */
async function openVenue(id) {
  const venue = state.venues.find((v) => v.id === id);
  if (!venue) return;
  state.venue = venue;
  state.picked = [];
  state.dateKey = todayKey();
  $("venue-name").textContent = venue.name;
  $("venue-address").textContent = [venue.address, venue.city].filter(Boolean).join(", ");
  /* venue hours */
  $("venue-hours").textContent = venue.opening_time && venue.closing_time
    ? venue.opening_time + " to " + venue.closing_time
    : (venue.business_hours || "hours not set");
  state.gear = [];
  state.qty = {};
  state.promo = null;
  $("promo-input").value = "";
  $("promo-msg").hidden = true;
  const sport = currentSport();
  $("venue-sport-note").hidden = !sport;
  if (sport) $("venue-sport-name").textContent = sport;
  renderVenueDetail(venue);
  show("venue");
  renderDays();
  await loadBoard();
  await loadGear(venue.id);
}

/* venue page */
const AMENITY = {
  parking: "Parking", canteen: "Canteen", referee: "Referee available",
  water: "Drinking water", covered: "Covered court", lights: "Night lights",
  restroom: "Restrooms", shower: "Showers", aircon: "Air-conditioned",
  locker: "Lockers", wifi: "Wi-Fi", seating: "Seating",
};
const DAY_NAME = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function renderVenueDetail(venue) {
  const shots = [venue.photo_url].concat(Array.isArray(venue.photos) ? venue.photos : []).filter(Boolean);
  const seen = [];
  shots.forEach((u) => { if (seen.indexOf(u) === -1) seen.push(u); });
  $("venue-gallery").hidden = seen.length === 0;
  $("venue-gallery").innerHTML = seen.map((u) =>
    '<img src="' + escapeHtml(u) + '" alt="" loading="lazy" ' +
    'onerror="this.remove(); if (!this.parentNode || !this.parentNode.children.length) ' +
    'document.getElementById(\'venue-gallery\').hidden = true;">').join("");

  $("venue-desc").textContent = venue.description || "";
  $("venue-desc").hidden = !venue.description;

  const tags = (venue.amenities || []).map((a) => '<span class="tag">' + escapeHtml(AMENITY[a] || a) + "</span>").join("");
  $("venue-tags").innerHTML = tags;

  const days = Array.isArray(venue.open_days) && venue.open_days.length
    ? venue.open_days.slice().sort().map((d) => DAY_NAME[d]).join(", ") : null;
  const facts = [];
  if (venue.business_hours) facts.push(["Hours", venue.business_hours]);
  else if (venue.opening_time && venue.closing_time) facts.push(["Hours", venue.opening_time + " to " + venue.closing_time]);
  if (days) facts.push(["Open", days]);
  if (venue.peak_start && venue.peak_end) facts.push(["Peak", venue.peak_start + " to " + venue.peak_end + ", priced higher"]);
  if (venue.contact_number) facts.push(["Phone", venue.contact_number]);
  $("venue-facts").innerHTML = facts.map((f) =>
    '<div class="fact2"><span>' + escapeHtml(f[0]) + "</span><span>" + escapeHtml(f[1]) + "</span></div>").join("");

  const hasMap = venue.lat != null && venue.lng != null;
  $("venue-map").hidden = !hasMap;
  if (hasMap) {
    const lat = Number(venue.lat), lng = Number(venue.lng);
    const box = [lng - 0.008, lat - 0.005, lng + 0.008, lat + 0.005].join("%2C");
    $("venue-map-frame").src = "https://www.openstreetmap.org/export/embed.html?bbox=" + box +
      "&layer=mapnik&marker=" + lat + "%2C" + lng;
    $("venue-map-link").href = "https://www.google.com/maps/search/?api=1&query=" + lat + "," + lng;
  }

  $("venue-about").hidden = !(venue.description || tags || facts.length || hasMap);
  syncHeart();
  loadReviews(venue.id);
}

async function loadReviews(venueId) {
  const box = $("review-list");
  $("venue-reviews").hidden = false;
  box.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const { data } = await sbPublic
    .from("reviews")
    .select("id, rating, comment, created_at")
    .eq("venue_id", venueId)
    .order("created_at", { ascending: false })
    .limit(20);
  const rows = data || [];
  const r = state.ratings[venueId];
  $("review-note").textContent = rows.length
    ? "Reviews are written in the phone app. Names are kept private."
    : "No review yet for this venue.";
  if (!rows.length) { box.innerHTML = ""; return; }
  box.innerHTML = rows.map((rev) => {
    const full = Math.max(0, Math.min(5, Math.round(Number(rev.rating || 0))));
    return '<div class="review"><div class="top"><span class="stars">' +
      "\u2605".repeat(full) + "\u2606".repeat(5 - full) + "</span><time>" +
      prettyDate(String(rev.created_at).slice(0, 10)) + "</time></div>" +
      (rev.comment ? "<p>" + escapeHtml(rev.comment) + "</p>" : "") + "</div>";
  }).join("");
  if (r) $("venue-hours").title = r.avg.toFixed(1) + " out of 5";
}

/* gear */
async function loadGear(venueId) {
  const { data } = await sbPublic
    .from("equipment")
    .select("id, name, category, sport, rental_price, deposit, quantity_available")
    .eq("venue_id", venueId)
    .order("name", { ascending: true });
  state.gear = (data || []).filter((g) => (g.quantity_available ?? 0) > 0);
  $("extras").hidden = false;
  renderGear();
}

function renderGear() {
  const list = $("gear-list");
  if (!state.gear.length) {
    list.innerHTML = '<p class="hint">This venue does not rent anything yet. Bring your own.</p>';
  } else {
    list.innerHTML = state.gear.map((g) => {
      const n = state.qty[g.id] || 0;
      const deposit = Number(g.deposit || 0);
      return '<div class="gear-row"><span><b>' + escapeHtml(g.name) + "</b><small>" +
        peso(g.rental_price) + " each" +
        (deposit ? " \u00b7 " + peso(deposit) + " deposit, refunded" : "") +
        " \u00b7 " + g.quantity_available + " available</small></span>" +
        '<span class="stepper">' +
        '<button type="button" data-gear-minus="' + g.id + '" aria-label="One fewer"' + (n === 0 ? " disabled" : "") + ">&minus;</button>" +
        "<span>" + n + "</span>" +
        '<button type="button" data-gear-plus="' + g.id + '" aria-label="One more"' + (n >= g.quantity_available ? " disabled" : "") + ">+</button>" +
        "</span></div>";
    }).join("");
    list.querySelectorAll("[data-gear-plus]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-gear-plus");
        const g = state.gear.find((x) => x.id === id);
        const n = (state.qty[id] || 0) + 1;
        if (n <= (g.quantity_available ?? 0)) state.qty[id] = n;
        renderGear();
        renderBasket();
      });
    });
    list.querySelectorAll("[data-gear-minus]").forEach((b) => {
      b.addEventListener("click", () => {
        const id = b.getAttribute("data-gear-minus");
        state.qty[id] = Math.max(0, (state.qty[id] || 0) - 1);
        renderGear();
        renderBasket();
      });
    });
  }
  renderTotals();
}

/* totals */
function money() {
  const court = state.picked.reduce((sum, p) => sum + (p.rate || 0), 0);
  let rental = 0;
  let deposit = 0;
  state.gear.forEach((g) => {
    const n = state.qty[g.id] || 0;
    rental += n * Number(g.rental_price || 0);
    deposit += n * Number(g.deposit || 0);
  });
  let discount = 0;
  if (state.promo) {
    if (state.promo.discount_percent != null) discount = Math.round((court * Number(state.promo.discount_percent)) / 100);
    else if (state.promo.discount_amount != null) discount = Math.min(Number(state.promo.discount_amount), court);
  }
  return { court, rental, deposit, discount, total: court - discount + rental + deposit };
}

function renderTotals() {
  const box = $("totals");
  const m = money();
  if (!state.picked.length && !m.rental && !m.deposit) { box.hidden = true; return; }
  box.hidden = false;
  box.innerHTML =
    '<div><span>Court time</span><span class="num">' + peso(m.court) + "</span></div>" +
    (m.discount ? '<div><span>Promo</span><span class="num">\u2212' + peso(m.discount) + "</span></div>" : "") +
    (m.rental ? '<div><span>Gear</span><span class="num">' + peso(m.rental) + "</span></div>" : "") +
    (m.deposit ? '<div><span>Deposit (refunded)</span><span class="num">' + peso(m.deposit) + "</span></div>" : "") +
    '<div class="sum"><span>Total</span><span class="num">' + peso(m.total) + "</span></div>";
}

/* promo code */
$("promo-go").addEventListener("click", async () => {
  const code = $("promo-input").value.trim().toUpperCase();
  const msg = $("promo-msg");
  if (!code) return;
  msg.hidden = false;
  msg.className = "code-msg";
  msg.textContent = "Checking\u2026";
  const { data, error } = await sb.rpc("promo_for_code", { code: code, venue: state.venue.id });
  const found = (data || [])[0];
  if (error || !found) {
    state.promo = null;
    msg.className = "code-msg";
    msg.textContent = "That code is not running right now, or not at this venue.";
  } else {
    state.promo = found;
    msg.className = "code-msg good";
    msg.textContent = (found.title ? found.title + ": " : "") +
      (found.discount_percent != null ? found.discount_percent + "% off the court time" : peso(found.discount_amount) + " off the court time");
  }
  renderTotals();
  renderBasket();
});

function renderDays() {
  const today = todayKey();
  const strip = $("day-strip");
  const openDays = (state.venue && state.venue.open_days) || [];
  strip.innerHTML = Array.from({ length: 7 }, (_, i) => {
    const key = addDays(today, i);
    /* closed days */
    const shut = openDays.length > 0 && !openDays.includes(dayNum(key));
    return '<button class="day" type="button" data-day="' + key + '" aria-pressed="' +
      (key === state.dateKey) + '"' + (shut ? " disabled" : "") + '>' +
      (i === 0 ? "Today" : dayName(key)) + " " + key.slice(8) + (shut ? " \u00b7 shut" : "") + "</button>";
  }).join("");
  strip.querySelectorAll("[data-day]").forEach((b) => {
    b.addEventListener("click", async () => {
      state.dateKey = b.getAttribute("data-day");
      state.picked = [];
      renderDays();
      await loadBoard();
    });
  });
}

async function loadBoard() {
  const wrap = $("court-list");
  const venue = state.venue;
  const courts = courtsHere(venue);
  $("court-empty").hidden = courts.length > 0;
  if (!courts.length) { wrap.innerHTML = ""; return; }

  wrap.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const { data: busy } = await sbPublic
    .from("court_busy_slots")
    .select("court_id, date, start_time, end_time")
    .in("court_id", courts.map((c) => c.id))
    .eq("date", state.dateKey);
  state.busy = busy || [];
  renderBoard(courts);
}

function renderBoard(courts) {
  const venue = state.venue;
  const open = toMinutes(venue.opening_time) != null ? Math.floor(toMinutes(venue.opening_time) / 60) : 6;
  const close = toMinutes(venue.closing_time) != null ? Math.ceil(toMinutes(venue.closing_time) / 60) : 22;
  const nowHour = state.dateKey === todayKey()
    ? Number(new Intl.DateTimeFormat("en-GB", { timeZone: VENUE_TZ, hour: "2-digit", hour12: false }).format(new Date()))
    : -1;

  $("court-list").innerHTML = courts.map((court) => {
    const slots = [];
    for (let h = open; h < close; h++) {
      const rate = rateFor(court, venue, state.dateKey, h);
      const taken = state.busy.some((b) =>
        b.court_id === court.id &&
        toMinutes(b.start_time) < (h + 1) * 60 &&
        h * 60 < toMinutes(b.end_time));
      const gone = h <= nowHour;
      const peak = isPeak(venue, state.dateKey, h);
      const picked = state.picked.some((p) => p.courtId === court.id && p.hour === h);
      const cls = taken || gone ? "slot booked" : "slot" + (peak ? " peak" : "");
      slots.push(
        "<button class='" + cls + "' type='button' aria-pressed='" + picked + "' " +
        (taken || gone ? "disabled " : "") +
        "data-court='" + court.id + "' data-hour='" + h + "' data-rate='" + (rate == null ? "" : rate) + "'>" +
        hourLabel(h) + "<span class='hr'>" +
        (taken ? "booked" : gone ? "gone" : rate == null ? "n/a" : peso(rate)) +
        "</span></button>"
      );
    }
    return '<div class="court"><div class="court-head"><b>' + escapeHtml(court.name) + "</b><span class='pill'>" +
      escapeHtml(court.sport || "court") + "</span></div><div class='slots'>" + slots.join("") + "</div></div>";
  }).join("");

  document.querySelectorAll(".slot[data-hour]").forEach((el) => {
    el.addEventListener("click", () => {
      const courtId = el.getAttribute("data-court");
      const hour = Number(el.getAttribute("data-hour"));
      const rateAttr = el.getAttribute("data-rate");
      const rate = rateAttr === "" ? null : Number(rateAttr);
      const court = (state.venue.courts || []).find((c) => c.id === courtId);
      const at = state.picked.findIndex((p) => p.courtId === courtId && p.hour === hour);
      if (at >= 0) state.picked.splice(at, 1);
      else state.picked.push({ courtId, courtName: court ? court.name : "Court", date: state.dateKey, hour, rate: rate || 0 });
      renderBoard(courts);
      renderBasket();
    });
  });
  renderBasket();
}

function renderBasket() {
  const n = state.picked.length;
  $("basket").hidden = n === 0;
  renderTotals();
  if (!n) return;
  const m = money();
  const gearCount = Object.values(state.qty).reduce((a, b) => a + b, 0);
  $("basket-total").textContent = peso(m.total);
  $("basket-detail").textContent = n + (n === 1 ? " hour" : " hours") +
    (gearCount ? " \u00b7 " + gearCount + " item" + (gearCount === 1 ? "" : "s") : "") +
    " \u00b7 " + prettyDate(state.dateKey);
  /* one hour */
  $("basket-go").textContent = basketLabel();
  syncDock();
}

function basketLabel() {
  const n = state.picked.length;
  return n === 1 ? "Book this hour" : "Book these " + n + " hours";
}

/* dock padding */
/* swipe hint */
function syncRailHint(listId, hintId) {
  const list = document.getElementById(listId);
  const hint = document.getElementById(hintId);
  if (!list || !hint) return;
  hint.hidden = !(list.scrollWidth > list.clientWidth + 8);
}
function syncRailHints() {
  syncRailHint("venue-list", "venue-hint");
  syncRailHint("fav-list", "fav-hint");
}
window.addEventListener("resize", syncRailHints);

function syncDock() {
  const dock = document.getElementById("dock");
  if (!dock) return;
  const vv = window.visualViewport;
  if (vv) {
    const hidden = Math.max(0, Math.round(window.innerHeight - vv.height - vv.offsetTop));
    dock.style.bottom = hidden + "px";
  }
  const h = dock.getBoundingClientRect().height;
  document.body.style.paddingBottom = (h ? Math.round(h) + 18 : 24) + "px";
}
window.addEventListener("resize", syncDock);
window.addEventListener("orientationchange", syncDock);
if (window.visualViewport) {
  window.visualViewport.addEventListener("resize", syncDock);
  window.visualViewport.addEventListener("scroll", syncDock);
}
window.addEventListener("scroll", syncDock, { passive: true });

/* group hours */
function mergePicked() {
  const sorted = state.picked.slice().sort((a, b) =>
    a.courtId === b.courtId ? a.hour - b.hour : a.courtId.localeCompare(b.courtId));
  const runs = [];
  sorted.forEach((p) => {
    const last = runs[runs.length - 1];
    if (last && last.courtId === p.courtId && last.date === p.date && last.endHour === p.hour) {
      last.endHour = p.hour + 1;
      last.amount += p.rate || 0;
      last.hours += 1;
    } else {
      runs.push({
        courtId: p.courtId, courtName: p.courtName, date: p.date,
        startHour: p.hour, endHour: p.hour + 1, amount: p.rate || 0, hours: 1, rate: p.rate || 0,
      });
    }
  });
  return runs;
}

$("basket-go").addEventListener("click", async () => {
  if (!state.picked.length) return;
  if (!state.session) {
    /* keep picks */
    setAuthMode("in");
    say("<b>Nearly there.</b> Sign in (or make an account) and these hours are booked in your name.", "ok");
    show("auth");
    return;
  }
  const go = $("basket-go");
  go.disabled = true;
  go.innerHTML = '<span class="spinner"></span>';
  const m = money();
  const runs = mergePicked();
  const rows = runs.map((r, i) => ({
    player_id: state.session.user.id,
    court_id: r.courtId,
    date: r.date,
    start_time: hour24(r.startHour),
    end_time: hour24(r.endHour),
    status: "pending_payment",
    /* first booking */
    total_amount: r.amount + (i === 0 ? m.rental + m.deposit - m.discount : 0),
    rate_at_booking: r.rate,
    promotion_id: i === 0 ? (state.promo ? state.promo.id : null) : null,
    discount_amount: i === 0 ? m.discount : 0,
  }));

  const { data: lead, error } = await sb.from("bookings").insert(rows[0]).select("id, group_id").single();
  if (error || !lead) {
    go.disabled = false;
    go.textContent = basketLabel();
    alert("Booking failed: " + ((error && error.message) || "unknown error"));
    return;
  }
  if (rows.length > 1) {
    const rest = rows.slice(1).map((r) => Object.assign({}, r, { group_id: lead.group_id }));
    const { error: restError } = await sb.from("bookings").insert(rest);
    if (restError) alert("Some hours could not be saved: " + restError.message);
  }
  const gearRows = state.gear
    .filter((g) => (state.qty[g.id] || 0) > 0)
    .map((g) => ({
      booking_id: lead.id,
      equipment_id: g.id,
      quantity: state.qty[g.id],
      price: Number(g.rental_price || 0) * state.qty[g.id],
      deposit_held: Number(g.deposit || 0) * state.qty[g.id],
    }));
  if (gearRows.length) {
    const { error: gearError } = await sb.from("equipment_bookings").insert(gearRows);
    /* gear failed */
    if (gearError) alert("The court is booked, but the gear could not be added: " + gearError.message);
  }

  state.picked = [];
  state.qty = {};
  state.promo = null;
  go.disabled = false;
  go.textContent = basketLabel();
  openBooking(lead.id);
});

/* bookings */
async function loadBookings() {
  const list = $("booking-list");
  list.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const { data, error } = await sb
    .from("bookings")
    .select("id, date, start_time, end_time, status, total_amount, court_id, courts(name, sport, venues(name))")
    .eq("player_id", state.session.user.id)
    .is("deleted_at", null)
    .order("date", { ascending: false });
  if (error) { list.innerHTML = '<div class="empty">' + escapeHtml(error.message) + "</div>"; return; }
  state.bookings = data || [];
  $("booking-empty").hidden = state.bookings.length > 0;
  list.innerHTML = state.bookings.map((b) => {
    const court = b.courts || {};
    const venue = (court.venues && court.venues.name) || "Venue";
    return '<button class="row" type="button" data-booking="' + b.id + '"><span><b>' +
      escapeHtml(venue) + " · " + escapeHtml(court.name || "Court") + "</b><small>" +
      prettyDate(b.date) + ", " + String(b.start_time).slice(0, 5) + " to " + String(b.end_time).slice(0, 5) +
      "</small></span><span class='pill " + (b.status === "confirmed" ? "ok" : b.status === "pending_payment" ? "go" : "") + "'>" +
      escapeHtml(String(b.status).replace(/_/g, " ")) + "</span></button>";
  }).join("");
  list.querySelectorAll("[data-booking]").forEach((b) => {
    b.addEventListener("click", () => openBooking(b.getAttribute("data-booking")));
  });
}
$("bookings-refresh").addEventListener("click", loadBookings);
$("booking-back").addEventListener("click", () => goBack("bookings"));
$("venue-back").addEventListener("click", () => { state.picked = []; goBack("browse"); });

async function openBooking(id, justPaid) {
  show("booking");
  const card = $("booking-card");
  card.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const { data, error } = await sb
    .from("bookings")
    .select("id, date, start_time, end_time, status, total_amount, rate_at_booking, group_id, courts(name, sport, venues(name, address))")
    .eq("id", id)
    .maybeSingle();
  if (error || !data) { card.innerHTML = '<div class="empty">Could not open that booking.</div>'; return; }
  state.booking = data;
  const court = data.courts || {};
  const venue = (court.venues) || {};
  const payable = data.status === "pending_payment";
  card.innerHTML =
    '<p class="eyebrow">' + escapeHtml(String(data.status).replace(/_/g, " ")) + "</p>" +
    "<h1 style='font-size:24px;font-weight:700;margin-top:6px'>" + escapeHtml(venue.name || "Venue") + "</h1>" +
    "<p class='note'>" + escapeHtml(court.name || "Court") + " · " + escapeHtml(court.sport || "") +
    (venue.address ? "<br>" + escapeHtml(venue.address) : "") + "</p>" +
    "<div class='tiles'><div class='tile'><small>Date</small><b style='font-size:15px'>" + prettyDate(data.date) + "</b></div>" +
    "<div class='tile'><small>Hours</small><b style='font-size:15px'>" + String(data.start_time).slice(0, 5) + " to " + String(data.end_time).slice(0, 5) + "</b></div>" +
    "<div class='tile'><small>Total</small><b>" + peso(data.total_amount) + "</b></div></div>" +
    (justPaid ? "<div class='msg'><b>Back from GCash.</b> Waiting for the payment to be confirmed. This page updates itself.</div>" : "") +
    "<div style='margin-top:18px;display:flex;gap:8px;flex-wrap:wrap'>" +
    (payable ? "<button class='btn filled' type='button' id='pay-btn'>Pay with GCash</button>" : "") +
    (data.status !== "cancelled" && data.status !== "completed" ? "<button class='btn' type='button' id='cancel-btn'>Cancel booking</button>" : "") +
    "</div>" +
    "<p class='note'>Payments run through PayMongo, in test mode while the app is being built, so use GCash's test flow, not real money.</p>";

  if ($("pay-btn")) $("pay-btn").addEventListener("click", () => payWithGCash(data));
  if ($("cancel-btn")) $("cancel-btn").addEventListener("click", () => cancelBooking(data));
  if (justPaid) pollStatus(data.id, 0);
}

async function cancelBooking(booking) {
  const why = prompt("Why are you cancelling? The venue sees this.");
  if (why === null) return;
  const { error } = await sb.from("bookings").update({
    status: "cancelled",
    previous_status: booking.status,
    cancellation_reason: why.trim() || null,
  }).eq("id", booking.id);
  if (error) alert("Could not cancel: " + error.message);
  openBooking(booking.id);
}

async function pollStatus(id, tries) {
  if (tries > 10) return;
  setTimeout(async () => {
    const { data } = await sb.from("bookings").select("status").eq("id", id).maybeSingle();
    if (data && data.status === "confirmed") { openBooking(id); return; }
    pollStatus(id, tries + 1);
  }, 2500);
}

/* paying */
/* payment steps */
const PAYMONGO_PUBLIC_KEY = "pk_test_HAtbsoq8qJxuj25yrVGwRTDN";
async function payWithGCash(booking) {
  const btn = $("pay-btn");
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  try {
    const { data: intent, error } = await sb.functions.invoke("create-payment-intent", {
      body: { bookingId: booking.id },
    });
    if (error || !intent || !intent.paymentIntentId) throw new Error("Could not start the payment.");

    const auth = "Basic " + btoa(PAYMONGO_PUBLIC_KEY + ":");
    const pmResp = await fetch("https://api.paymongo.com/v1/payment_methods", {
      method: "POST",
      headers: { Authorization: auth, "Content-Type": "application/json" },
      body: JSON.stringify({ data: { attributes: { type: "gcash" } } }),
    });
    const pmJson = await pmResp.json();
    if (!pmResp.ok) throw new Error("GCash could not be set up.");

    const returnUrl = window.location.origin + window.location.pathname + "?paid=" + booking.id;
    const attachResp = await fetch(
      "https://api.paymongo.com/v1/payment_intents/" + intent.paymentIntentId + "/attach",
      {
        method: "POST",
        headers: { Authorization: auth, "Content-Type": "application/json" },
        body: JSON.stringify({
          data: { attributes: { payment_method: pmJson.data.id, client_key: intent.clientKey, return_url: returnUrl } },
        }),
      }
    );
    const attachJson = await attachResp.json();
    if (!attachResp.ok) throw new Error(JSON.stringify(attachJson));

    const status = attachJson.data.attributes.status;
    if (status === "awaiting_next_action") {
      window.location.href = attachJson.data.attributes.next_action.redirect.url;
    } else if (status === "succeeded") {
      openBooking(booking.id, true);
    } else {
      throw new Error("GCash did not start.");
    }
  } catch (err) {
    alert(err.message || "Payment could not start.");
    btn.disabled = false;
    btn.textContent = "Pay with GCash";
  }
}

/* owner */
async function loadOwner() {
  const list = $("owner-list");
  const key = todayKey();
  $("owner-date").textContent = prettyDate(key);
  list.innerHTML = '<div class="empty"><span class="spinner"></span></div>';

  const { data: venues } = await sb.from("venues").select("id, name").eq("owner_id", state.session.user.id);
  const ids = (venues || []).map((v) => v.id);
  if (!ids.length) {
    list.innerHTML = "";
    $("owner-tiles").innerHTML = "";
    $("owner-empty").hidden = false;
    $("owner-empty").textContent = "No venue is listed under this account yet.";
    return;
  }
  const { data: courts } = await sb.from("courts").select("id, name, venue_id").in("venue_id", ids);
  const courtIds = (courts || []).map((c) => c.id);
  const { data: rows, error } = await sb
    .from("bookings")
    .select("id, date, start_time, end_time, status, total_amount, commission_amount, court_id")
    .in("court_id", courtIds.length ? courtIds : ["none"])
    .eq("date", key)
    .is("deleted_at", null)
    .order("start_time", { ascending: true });
  if (error) { list.innerHTML = '<div class="empty">' + escapeHtml(error.message) + "</div>"; return; }

  const live = (rows || []).filter((b) => b.status !== "cancelled");
  const expected = live.reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const paid = live.filter((b) => b.status === "confirmed" || b.status === "completed")
    .reduce((s, b) => s + Number(b.total_amount || 0), 0);
  const share = live.reduce((s, b) => s + Number(b.commission_amount || 0), 0);
  $("owner-tiles").innerHTML =
    "<div class='tile'><small>Expected</small><b>" + peso(expected) + "</b></div>" +
    "<div class='tile'><small>Paid</small><b>" + peso(paid) + "</b></div>" +
    "<div class='tile'><small>Our share</small><b>" + peso(share) + "</b></div>";

  $("owner-empty").hidden = live.length > 0;
  const courtName = (id) => (courts || []).find((c) => c.id === id);
  list.innerHTML = live.map((b) => {
    const c = courtName(b.court_id);
    return "<div class='row flat'><span><b>" + String(b.start_time).slice(0, 5) + " · " +
      escapeHtml(c ? c.name : "Court") + "</b><small>" + peso(b.total_amount) + " · " +
      escapeHtml(String(b.status).replace(/_/g, " ")) + "</small></span><span class='pill" +
      (b.status === "confirmed" ? " ok" : "") + "'>" +
      String(b.start_time).slice(0, 5) + " to " + String(b.end_time).slice(0, 5) + "</span></div>";
  }).join("");
}

/* admin */
async function loadAdmin() {
  const list = $("admin-list");
  list.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  const [venuesRes, appsRes] = await Promise.all([
    sb.from("venues").select("id, name, address, status, created_at").eq("status", "pending").order("created_at", { ascending: true }),
    sb.from("owner_applications").select("id, status, created_at").eq("status", "pending").order("created_at", { ascending: true }),
  ]);
  const venues = venuesRes.data || [];
  const apps = appsRes.data || [];
  const total = venues.length + apps.length;
  $("admin-count").textContent = total + " waiting";
  $("admin-empty").hidden = total > 0;
  list.innerHTML =
    venues.map((v) => "<div class='row flat'><span><b>" + escapeHtml(v.name) +
      "</b><small>New venue · " + escapeHtml(v.address || "no address") + "</small></span><span class='pill go'>venue</span></div>").join("") +
    apps.map((a) => "<div class='row flat'><span><b>Owner application</b><small>" +
      new Date(a.created_at).toLocaleDateString("en-PH") + "</small></span><span class='pill go'>owner</span></div>").join("");
  if (venuesRes.error && appsRes.error) {
    list.innerHTML = "<div class='empty'>Only an admin account can read this queue.</div>";
  }
}

/* navigation */
/* account */
function renderMe() {
  const p = state.profile || {};
  const name = p.name || "Your account";
  $("me-name").textContent = name;
  $("me-email").textContent = p.email || (state.session && state.session.user.email) || "";
  $("me-role").textContent = p.role || "player";
  $("me-since").textContent = p.created_at
    ? "With SportBase since " + prettyDate(String(p.created_at).slice(0, 10))
    : "";
  const av = $("me-avatar");
  if (p.avatar_url) {
    av.outerHTML = '<img class="avatar" id="me-avatar" src="' + escapeHtml(p.avatar_url) + '" alt="">';
  } else {
    av.textContent = (name.trim()[0] || "?").toUpperCase();
  }
  renderAccountButton();
  renderFavourites();
  loadMeStats();
}

/* account stats */
async function loadMeStats() {
  $("stat-saved").textContent = String(Object.keys(state.favs).length);
  if (!state.session) return;
  const { data } = await withTimeout(
    sb.from("bookings")
      .select("start_time, end_time, status")
      .eq("player_id", state.session.user.id)
      .is("deleted_at", null),
    8000,
    { data: null }
  );
  if (!data) return;
  const live = data.filter((b) => b.status !== "cancelled");
  const hours = live.reduce((sum, b) => {
    const a = toMinutes(b.start_time), z = toMinutes(b.end_time);
    return sum + (a != null && z != null && z > a ? (z - a) / 60 : 0);
  }, 0);
  $("stat-bookings").textContent = String(live.length);
  $("stat-hours").textContent = hours ? String(Math.round(hours)) : "0";
}

/* avatar */
function renderAccountButton() {
  const p = state.profile || {};
  const name = p.name || (state.session && state.session.user.email) || "Your account";
  const btn = $("account-btn");
  if (p.avatar_url) btn.innerHTML = '<img src="' + escapeHtml(p.avatar_url) + '" alt="">';
  else btn.textContent = (String(name).trim()[0] || "?").toUpperCase();
  btn.setAttribute("aria-label", name + ", your account");
  $("menu-name").textContent = name;
  $("menu-email").textContent = p.email || (state.session && state.session.user.email) || "";
  $("menu-role").textContent = p.role || "player";
  $("menu-venue").hidden = (p.role || "player") !== "player";
}

function closeAccountMenu() {
  $("account-menu").hidden = true;
  $("account-btn").setAttribute("aria-expanded", "false");
}
function toggleAccountMenu() {
  const open = $("account-menu").hidden;
  $("account-menu").hidden = !open;
  $("account-btn").setAttribute("aria-expanded", open ? "true" : "false");
}
$("account-btn").addEventListener("click", (e) => { e.stopPropagation(); toggleAccountMenu(); });
document.addEventListener("click", (e) => {
  if ($("account-menu").hidden) return;
  if (!$("account-menu").contains(e.target)) closeAccountMenu();
});
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeAccountMenu(); });

$("menu-account").addEventListener("click", () => {
  closeAccountMenu();
  navTrail = [];
  show("me");
  renderMe();
});
$("menu-venue").addEventListener("click", () => {
  closeAccountMenu();
  if (!state.session) { wantsToApply = true; askForAccountFirst(); return; }
  openApply();
});
$("menu-signout").addEventListener("click", () => { closeAccountMenu(); signOut(); });

/* edit details */
/* save profile */
let photoFile = null;

function fillEditForm() {
  const p = state.profile || {};
  $("me-name-input").value = p.name || "";
  $("me-phone-input").value = p.phone || "";
  photoFile = null;
  $("me-photo-name").textContent = "JPG or PNG, up to 5 MB";
  const prev = $("me-photo-preview");
  if (p.avatar_url) prev.outerHTML = '<img class="avatar" id="me-photo-preview" src="' + escapeHtml(p.avatar_url) + '" alt="">';
  else prev.textContent = ((p.name || "?").trim()[0] || "?").toUpperCase();
  $("me-msg").hidden = true;
}

$("me-edit-open").addEventListener("click", () => {
  const open = $("me-edit").hidden;
  $("me-edit").hidden = !open;
  $("me-edit-open").textContent = open ? "Close" : "Edit your details";
  if (open) fillEditForm();
});
$("me-cancel").addEventListener("click", () => {
  $("me-edit").hidden = true;
  $("me-edit-open").textContent = "Edit your details";
});

$("me-photo").addEventListener("change", (e) => {
  const f = e.target.files && e.target.files[0];
  if (!f) return;
  if (f.size > 5 * 1024 * 1024) {
    $("me-msg").hidden = false;
    $("me-msg").innerHTML = "<b>That photo is over 5 MB.</b> Pick a smaller one.";
    e.target.value = "";
    return;
  }
  photoFile = f;
  $("me-photo-name").textContent = f.name;
  const reader = new FileReader();
  reader.onload = () => {
    const prev = $("me-photo-preview");
    prev.outerHTML = '<img class="avatar" id="me-photo-preview" src="' + reader.result + '" alt="">';
  };
  reader.readAsDataURL(f);
});

$("me-save").addEventListener("click", async () => {
  if (!state.session) return;
  const btn = $("me-save");
  const msg = $("me-msg");
  const uid = state.session.user.id;
  const name = $("me-name-input").value.trim();
  if (!name) { msg.hidden = false; msg.innerHTML = "<b>A name, please.</b>"; return; }

  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span>';
  msg.hidden = true;
  const patch = { name: name, phone: $("me-phone-input").value.trim() || null };

  if (photoFile) {
    /* avatar upload */
    const ext = (photoFile.type === "image/png") ? "png" : (photoFile.type === "image/webp" ? "webp" : "jpg");
    const path = uid + "/avatar." + ext;
    const up = await sb.storage.from("avatars").upload(path, photoFile, {
      contentType: photoFile.type || "image/jpeg",
      upsert: true,
    });
    if (up.error) {
      btn.disabled = false; btn.textContent = "Save";
      msg.hidden = false;
      msg.innerHTML = "<b>The photo did not upload.</b> " + escapeHtml(up.error.message);
      return;
    }
    const pub = sb.storage.from("avatars").getPublicUrl(path);
    patch.avatar_url = (pub.data && pub.data.publicUrl ? pub.data.publicUrl : "") + "?t=" + Date.now();
  }

  const { error } = await sb.from("users").update(patch).eq("id", uid);
  btn.disabled = false;
  btn.textContent = "Save";
  if (error) {
    msg.hidden = false;
    msg.innerHTML = "<b>That did not save.</b> " + escapeHtml(error.message);
    return;
  }
  await loadProfile();
  renderMe();
  $("me-edit").hidden = true;
  $("me-edit-open").textContent = "Edit your details";
});

/* messages */
/* threads */
function whenShort(iso) {
  const d = new Date(iso);
  const today = new Date();
  const sameDay = d.toDateString() === today.toDateString();
  return sameDay
    ? d.toLocaleTimeString("en-PH", { hour: "numeric", minute: "2-digit" })
    : d.toLocaleDateString("en-PH", { month: "short", day: "numeric" });
}

async function loadChats() {
  const list = $("chat-list");
  list.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  if (!state.session) return;
  const me = state.session.user.id;

  const { data: mine } = await withTimeout(
    sb.from("conversation_participants").select("conversation_id").eq("user_id", me),
    8000, { data: null });
  const ids = (mine || []).map((r) => r.conversation_id);
  if (!ids.length) {
    list.innerHTML = "";
    $("chat-empty").hidden = false;
    return;
  }

  const [convRes, msgRes, partRes] = await Promise.all([
    sb.from("conversations").select("id, type, name, created_by, created_at").in("id", ids),
    sb.from("messages").select("conversation_id, content, created_at, sender_id, deleted_at")
      .in("conversation_id", ids).order("created_at", { ascending: false }).limit(400),
    sb.from("conversation_participants").select("conversation_id, user_id").in("conversation_id", ids),
  ]);
  const convs = convRes.data || [];

  /* thread name */
  const others = {};
  (partRes.data || []).forEach((p) => {
    if (p.user_id === me) return;
    (others[p.conversation_id] = others[p.conversation_id] || []).push(p.user_id);
  });
  const need = [...new Set(Object.values(others).flat())];
  if (need.length) {
    const { data: people } = await withTimeout(
      sb.from("users").select("id, name, email").in("id", need), 8000, { data: null });
    const byId = {};
    (people || []).forEach((u) => { byId[u.id] = u.name || (u.email || "").split("@")[0]; });
    state.chatNames = {};
    Object.keys(others).forEach((cid) => {
      const names = others[cid].map((id) => byId[id]).filter(Boolean);
      if (names.length) state.chatNames[cid] = names.slice(0, 3).join(", ");
    });
  } else {
    state.chatNames = {};
  }
  const last = {};
  (msgRes.data || []).forEach((m) => { if (!last[m.conversation_id]) last[m.conversation_id] = m; });

  convs.sort((a, b) => {
    const la = last[a.id] ? last[a.id].created_at : a.created_at;
    const lb = last[b.id] ? last[b.id].created_at : b.created_at;
    return String(lb).localeCompare(String(la));
  });
  state.chats = convs;

  $("chat-empty").hidden = convs.length > 0;
  list.innerHTML = convs.map((c) => {
    const m = last[c.id];
    const preview = m
      ? (m.deleted_at ? "Message unsent" : String(m.content || "").slice(0, 70))
      : "No message yet";
    return '<button class="row" type="button" data-chat="' + c.id + '"><span><b>' +
      escapeHtml(chatTitle(c)) + "</b><small>" + escapeHtml(preview) + "</small></span>" +
      '<span class="pill' + (c.type === "support" ? " go" : "") + '">' +
      (m ? escapeHtml(whenShort(m.created_at)) : escapeHtml(c.type)) + "</span></button>";
  }).join("");
  list.querySelectorAll("[data-chat]").forEach((b) => {
    b.addEventListener("click", () => openChat(b.getAttribute("data-chat")));
  });
}

function chatTitle(c) {
  if (c.name) return c.name;
  if (c.type === "support") return "SportBase Support";
  const named = (state.chatNames || {})[c.id];
  if (named) return named;
  return "Chat";
}

$("chats-refresh").addEventListener("click", loadChats);
$("chat-back").addEventListener("click", () => goBack("chats"));

$("support-open").addEventListener("click", async () => {
  if (!state.session) { setAuthMode("in"); say("Sign in to message support."); show("auth"); return; }
  const btn = $("support-open");
  btn.disabled = true;
  const { data, error } = await withTimeout(sb.rpc("open_support_conversation"), 9000, { data: null, error: null });
  btn.disabled = false;
  if (error || !data) {
    $("chat-empty").hidden = false;
    $("chat-empty").textContent = "Support could not be opened right now. Try again in a moment.";
    return;
  }
  openChat(data);
});

async function openChat(id) {
  show("chat");
  const box = $("thread");
  box.innerHTML = '<div class="empty"><span class="spinner"></span></div>';
  $("thread-empty").hidden = true;

  const { data: conv } = await sb.from("conversations").select("id, type, name, created_by").eq("id", id).maybeSingle();
  state.chat = conv || { id: id, type: "direct", name: null };
  $("chat-title").textContent = chatTitle(state.chat);
  $("chat-kind").hidden = state.chat.type !== "support";
  $("chat-kind").textContent = "support";
  $("chat-note").textContent = state.chat.type === "support"
    ? "An admin reads this. Replies land as a notification in the phone app."
    : "Replies land as a notification in the phone app; here you have to come back and look.";
  rememberWhere("chat");
  await loadThread();
}

async function loadThread() {
  const box = $("thread");
  if (!state.chat) return;
  const { data, error } = await sb
    .from("messages")
    .select("id, sender_id, content, created_at, deleted_at")
    .eq("conversation_id", state.chat.id)
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) { box.innerHTML = '<div class="empty">' + escapeHtml(error.message) + "</div>"; return; }
  const rows = data || [];
  $("thread-empty").hidden = rows.length > 0;
  if (!rows.length) { box.innerHTML = ""; return; }

  const senders = Array.from(new Set(rows.map((m) => m.sender_id).filter(Boolean)));
  const names = {};
  if (senders.length) {
    const { data: people } = await sb.from("users").select("id, name").in("id", senders);
    (people || []).forEach((u) => { names[u.id] = u.name; });
  }
  const me = state.session ? state.session.user.id : null;
  box.innerHTML = rows.map((m) => {
    const mine = m.sender_id === me;
    const who = mine ? "You" : (names[m.sender_id] || "SportBase");
    return '<div class="bubble' + (mine ? " mine" : "") + (m.deleted_at ? " gone" : "") + '">' +
      '<span class="who2">' + escapeHtml(who) + "</span><p>" +
      (m.deleted_at ? "Message unsent" : escapeHtml(m.content || "")) + "</p><time>" +
      escapeHtml(whenShort(m.created_at)) + "</time></div>";
  }).join("");
  box.scrollIntoView({ block: "end" });
}

async function sendMessage() {
  if (!state.chat || !state.session) return;
  const input = $("chat-input");
  const text = input.value.trim();
  if (!text) return;
  const btn = $("chat-send");
  btn.disabled = true;
  const { error } = await sb.from("messages").insert({
    conversation_id: state.chat.id,
    sender_id: state.session.user.id,
    content: text,
  });
  btn.disabled = false;
  if (error) {
    $("chat-note").textContent = "That did not send: " + error.message;
    return;
  }
  input.value = "";
  await loadThread();
}
$("chat-send").addEventListener("click", sendMessage);
$("chat-input").addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); }
});

/* home view */
function openHome() {
  const home = homeView();
  show(home);
  if (home === "owner") loadOwner();
  else if (home === "admin") loadAdmin();
}

/* stat tiles */
document.querySelectorAll("[data-goto]").forEach((tile) => {
  tile.addEventListener("click", () => {
    const where = tile.getAttribute("data-goto");
    if (where === "saved") {
      const head = $("fav-head");
      if (head) head.scrollIntoView({ behavior: "smooth", block: "start" });
      return;
    }
    /* reuse the tab */
    const tab = document.querySelector('#navbar [data-nav="' + where + '"]');
    if (tab) tab.click();
  });
});

document.querySelectorAll("[data-nav]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const nav = btn.getAttribute("data-nav");
    /* tab reset */
    goingBack = true;
    show(nav);
    goingBack = false;
    navTrail = [];
    updateBackLabels();
    if (nav === "browse") renderVenues();
    if (nav === "bookings") {
      if (!state.session) { setAuthMode("in"); say("Sign in to see your bookings."); show("auth"); return; }
      loadBookings();
    }
    if (nav === "owner") loadOwner();
    if (nav === "admin") loadAdmin();
    if (nav === "chats") {
      if (!state.session) { setAuthMode("in"); say("Sign in to see your messages."); show("auth"); return; }
      loadChats();
    }
    if (nav === "me") {
      if (!state.session) { setAuthMode("in"); say("Sign in to see your account."); show("auth"); return; }
      renderMe();
    }
  });
});
