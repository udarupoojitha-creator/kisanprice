// ---------- Data ----------
// Sample prices (Rs per quintal) for the last 7 days. Replace with a live API later.
const CROPS = [
  { id: "paddy",   en: "Paddy",       te: "వరి",          hist: [2150, 2170, 2160, 2190, 2200, 2185, 2210] },
  { id: "cotton",  en: "Cotton",      te: "పత్తి",         hist: [7200, 7150, 7300, 7280, 7350, 7400, 7380] },
  { id: "chilli",  en: "Red Chilli",  te: "మిరప",         hist: [14500, 14200, 14000, 14300, 14100, 13900, 14000] },
  { id: "groundnut", en: "Groundnut", te: "వేరుశనగ",      hist: [6100, 6150, 6200, 6180, 6250, 6300, 6320] },
  { id: "maize",   en: "Maize",       te: "మొక్కజొన్న",    hist: [2050, 2060, 2040, 2070, 2090, 2100, 2085] },
  { id: "tobacco", en: "Tobacco",     te: "పొగాకు",       hist: [9800, 9900, 9850, 9950, 10000, 10100, 10050] }
];

const DISTRICTS = [
  { en: "Prakasam", te: "ప్రకాశం", lat: 15.35, lon: 79.55 },
  { en: "Guntur",   te: "గుంటూరు", lat: 16.31, lon: 80.44 },
  { en: "Krishna",  te: "కృష్ణా",   lat: 16.17, lon: 81.13 },
  { en: "Kurnool",  te: "కర్నూలు", lat: 15.83, lon: 78.04 }
];

const TEXT = {
  en: {
    appName: "KisanPrice", lang: "తెలుగు", district: "District",
    prices: "Today's mandi prices (per quintal)", favOnly: "Favourites only",
    note: "Prices shown are sample data for demo. Connect the Agmarknet API for live rates.",
    target: "Alert me when price reaches", setAlert: "Set alert",
    loading: "Loading weather...", weatherFail: "Weather not available. Check your internet.",
    temp: "Temperature", rain: "Rain chance", rainAlert: "Heavy rain expected. Protect harvested crops.",
    heatAlert: "Very hot day. Water crops early morning or evening.",
    priceAlert: "Price alert: ", reached: " reached Rs ", empty: "No favourites yet. Tap the star on a crop.",
    saved: "Alert saved"
  },
  te: {
    appName: "కిసాన్ ప్రైస్", lang: "English", district: "జిల్లా",
    prices: "నేటి మార్కెట్ ధరలు (క్వింటాల్‌కు)", favOnly: "ఇష్టమైనవి మాత్రమే",
    note: "చూపిన ధరలు డెమో కోసం నమూనా డేటా. లైవ్ ధరల కోసం Agmarknet API కలపండి.",
    target: "ధర ఇంత చేరినప్పుడు తెలియజేయి", setAlert: "అలర్ట్ పెట్టు",
    loading: "వాతావరణం లోడ్ అవుతోంది...", weatherFail: "వాతావరణ సమాచారం అందలేదు. ఇంటర్నెట్ చూడండి.",
    temp: "ఉష్ణోగ్రత", rain: "వర్షం అవకాశం", rainAlert: "భారీ వర్షం రావచ్చు. కోసిన పంటను కాపాడుకోండి.",
    heatAlert: "చాలా వేడిగా ఉంది. ఉదయం లేదా సాయంత్రం నీరు పెట్టండి.",
    priceAlert: "ధర అలర్ట్: ", reached: " ధర చేరింది రూ. ", empty: "ఇష్టమైనవి ఇంకా లేవు. పంటపై నక్షత్రం నొక్కండి.",
    saved: "అలర్ట్ సేవ్ అయింది"
  }
};

// ---------- State (saved in the browser) ----------
const load = (k, d) => { try { return JSON.parse(localStorage.getItem(k)) ?? d; } catch { return d; } };
const save = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch {} };

let lang = load("lang", "en");
let favs = load("favs", []);
let targets = load("targets", {});
let districtIdx = load("district", 0);
let selected = null;

const $ = id => document.getElementById(id);
const t = () => TEXT[lang];
const today = c => c.hist[c.hist.length - 1];

// ---------- Rendering ----------
function renderStatic() {
  document.documentElement.lang = lang;
  $("appName").textContent = t().appName;
  $("langBtn").textContent = t().lang;
  $("lblDistrict").textContent = t().district;
  $("lblPrices").textContent = t().prices;
  $("lblFavOnly").textContent = t().favOnly;
  $("lblNote").textContent = t().note;
  $("lblTarget").textContent = t().target;
  $("saveTarget").textContent = t().setAlert;
  $("district").innerHTML = DISTRICTS
    .map((d, i) => `<option value="${i}" ${i === districtIdx ? "selected" : ""}>${d[lang]}</option>`).join("");
}

function renderCrops() {
  const list = $("cropList");
  const onlyFav = $("favOnly").checked;
  const shown = CROPS.filter(c => !onlyFav || favs.includes(c.id));
  list.innerHTML = "";
  if (!shown.length) {
    list.innerHTML = `<li>${t().empty}</li>`;
    return;
  }
  shown.forEach(c => {
    const now = today(c), prev = c.hist[c.hist.length - 2];
    const diff = now - prev;
    const li = document.createElement("li");
    li.tabIndex = 0;
    li.innerHTML = `
      <button class="star" aria-label="favourite">${favs.includes(c.id) ? "★" : "☆"}</button>
      <span class="name">${c[lang]}</span>
      <span class="price">Rs ${now}</span>
      <span class="${diff >= 0 ? "up" : "down"}">${diff >= 0 ? "▲" : "▼"} ${Math.abs(diff)}</span>`;
    li.querySelector(".star").addEventListener("click", e => {
      e.stopPropagation();
      favs = favs.includes(c.id) ? favs.filter(x => x !== c.id) : [...favs, c.id];
      save("favs", favs);
      renderCrops();
    });
    li.addEventListener("click", () => showDetail(c));
    li.addEventListener("keydown", e => { if (e.key === "Enter") showDetail(c); });
    list.appendChild(li);
  });
  checkPriceAlerts();
}

function showDetail(c) {
  selected = c;
  $("detail").hidden = false;
  $("detailName").textContent = c[lang];
  $("detailPrice").textContent = "Rs " + today(c);
  $("target").value = targets[c.id] || "";
  drawChart(c.hist);
  $("detail").scrollIntoView({ behavior: "smooth" });
}

function drawChart(data) {
  const cv = $("chart"), ctx = cv.getContext("2d");
  const w = cv.width, h = cv.height, pad = 30;
  const min = Math.min(...data) * 0.98, max = Math.max(...data) * 1.02;
  const x = i => pad + (i * (w - 2 * pad)) / (data.length - 1);
  const y = v => h - pad - ((v - min) / (max - min)) * (h - 2 * pad);
  ctx.clearRect(0, 0, w, h);
  ctx.strokeStyle = "#2f6b3a";
  ctx.lineWidth = 3;
  ctx.beginPath();
  data.forEach((v, i) => (i ? ctx.lineTo(x(i), y(v)) : ctx.moveTo(x(i), y(v))));
  ctx.stroke();
  ctx.fillStyle = "#d9a014";
  ctx.font = "14px sans-serif";
  data.forEach((v, i) => {
    ctx.beginPath();
    ctx.arc(x(i), y(v), 4, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.fillStyle = getComputedStyle(document.body).color;
  ctx.fillText(Math.round(max), 2, 16);
  ctx.fillText(Math.round(min), 2, h - 8);
}

function checkPriceAlerts() {
  const hits = CROPS.filter(c => targets[c.id] && today(c) >= targets[c.id]);
  const box = $("alertBox");
  if (hits.length) {
    box.hidden = false;
    box.textContent = hits.map(c => t().priceAlert + c[lang] + t().reached + today(c)).join(" | ");
  } else {
    box.hidden = true;
  }
}

// ---------- Weather (Open-Meteo, free, no key) ----------
async function loadWeather() {
  const d = DISTRICTS[districtIdx];
  $("weatherText").textContent = t().loading;
  $("weatherAlert").hidden = true;
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${d.lat}&longitude=${d.lon}` +
      `&current=temperature_2m&daily=precipitation_probability_max,temperature_2m_max&timezone=auto&forecast_days=1`;
    const res = await fetch(url);
    if (!res.ok) throw new Error("bad response");
    const j = await res.json();
    const temp = j.current.temperature_2m;
    const rain = j.daily.precipitation_probability_max[0];
    const maxT = j.daily.temperature_2m_max[0];
    $("weatherText").textContent = `${t().temp}: ${temp}°C | ${t().rain}: ${rain}%`;
    const a = $("weatherAlert");
    if (rain >= 60) { a.textContent = t().rainAlert; a.hidden = false; }
    else if (maxT >= 38) { a.textContent = t().heatAlert; a.hidden = false; }
  } catch (err) {
    $("weatherText").textContent = t().weatherFail;
  }
}

// ---------- Events ----------
$("langBtn").addEventListener("click", () => {
  lang = lang === "en" ? "te" : "en";
  save("lang", lang);
  renderStatic();
  renderCrops();
  loadWeather();
  if (selected) showDetail(selected);
});
$("district").addEventListener("change", e => {
  districtIdx = Number(e.target.value);
  save("district", districtIdx);
  loadWeather();
});
$("favOnly").addEventListener("change", renderCrops);
$("saveTarget").addEventListener("click", () => {
  if (!selected) return;
  const v = Number($("target").value);
  if (v > 0) targets[selected.id] = v; else delete targets[selected.id];
  save("targets", targets);
  checkPriceAlerts();
  $("saveTarget").textContent = t().saved;
  setTimeout(() => ($("saveTarget").textContent = t().setAlert), 1500);
});

// ---------- Start ----------
renderStatic();
renderCrops();
loadWeather();
