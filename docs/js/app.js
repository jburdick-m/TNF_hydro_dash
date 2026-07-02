/* Dashboard orchestration. */

import * as data from "./data.js";
import * as charts from "./charts.js";
import { initMap, addBoundary, addStations, markerSVG, TYPE_LABELS, TYPE_LABELS_PLURAL } from "./map.js";

const $ = (id) => document.getElementById(id);

const state = {
  stations: [],
  forecastPoints: [],
  local: { flow: null, snow: null, soil: null, reservoirs: null, meta: null },
  usgsLatest: {},
  dvCache: new Map(),    // usgs site -> Promise<recent daily series>
  bandsCache: new Map(), // usgs site -> Promise<bands|null>
  mapApi: null,
};

function getUsgsDaily(id) {
  if (!state.dvCache.has(id)) state.dvCache.set(id, data.usgsDaily(id));
  return state.dvCache.get(id);
}

function getUsgsBands(id) {
  if (!state.bandsCache.has(id)) state.bandsCache.set(id, data.usgsBands(id).catch(() => null));
  return state.bandsCache.get(id);
}

init().catch((e) => {
  console.error(e);
  $("updated").textContent = "Failed to initialize — see console.";
});

async function init() {
  const [cfg, flow, snow, soil, reservoirs, dreamflows, meta] = await Promise.all([
    fetch("data/stations.json").then((r) => r.json()),
    data.loadLocal("flow"),
    data.loadLocal("snow"),
    data.loadLocal("soil"),
    data.loadLocal("reservoirs"),
    data.loadLocal("dreamflows"),
    data.loadLocal("meta"),
  ]);
  state.stations = cfg.stations;
  state.forecastPoints = cfg.forecast_points || [];
  state.local = { flow, snow, soil, reservoirs, dreamflows, meta };

  if (meta?.generated) {
    const dt = new Date(meta.generated);
    $("updated").textContent = `CDEC data updated ${dt.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}`;
  }

  // Live USGS latest values (batched), then annotate stations for popups/tiles.
  const usgsSites = state.stations.filter((s) => s.type === "flow" && s.source === "usgs").map((s) => s.id);
  state.usgsLatest = await data.usgsLatest(usgsSites).catch(() => ({}));
  annotateLatest();

  buildMap();
  buildLegend();
  buildTiles();
  buildSelectors();
  buildReservoirs();
  buildForecast();
  buildWebcams();

  // Default charts
  renderFlow($("flow-select").value);
  renderSnow($("snow-select").value);
  renderSoil($("soil-select").value);
}

/* ---------- latest-value annotations ---------- */

function annotateLatest() {
  for (const st of state.stations) {
    if (st.type === "flow" && st.source === "usgs") {
      const lv = state.usgsLatest[st.id];
      if (lv) {
        st._latest = `${charts.fmt(lv.v)} cfs`;
        st._asof = asOf(lv.t);
        st._latestNum = lv.v;
      }
    } else if (st.type === "flow") {
      const src = st.source === "dreamflows" ? state.local.dreamflows : state.local.flow;
      const lv = src?.[st.id]?.latest;
      if (lv) { st._latest = `${charts.fmt(lv.v)} cfs`; st._asof = asOf(lv.t); st._latestNum = lv.v; }
    } else if (st.type === "snow") {
      const e = state.local.snow?.[st.id];
      if (e?.latest) {
        st._latest = `${e.latest.v.toFixed(1)} in SWE`;
        st._asof = asOf(e.latest.t);
        if (e.pct_median != null) st._latest += ` (${e.pct_median}% of median)`;
      }
    } else if (st.type === "soil" || st.type === "soil_mesh") {
      const e = state.local.soil?.[st.id];
      if (e?.latest && Object.keys(e.latest).length) {
        const [d0, lv] = Object.entries(e.latest)[0];
        st._latest = `${lv.v.toFixed(1)}% at ${d0}`;
        st._asof = asOf(lv.t);
      }
    } else if (st.type === "reservoir") {
      const e = state.local.reservoirs?.[st.id];
      if (e?.latest) {
        st._latest = `${charts.fmt(e.latest.v)} af${e.pct_capacity != null ? ` (${e.pct_capacity}% full)` : ""}`;
        st._asof = asOf(e.latest.t);
      }
    }
  }
}

function asOf(t) {
  const d = new Date(t.includes("T") ? t : t.replace(" ", "T"));
  if (Number.isNaN(+d)) return t;
  return "as of " + d.toLocaleString(undefined, { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
}

/* ---------- map ---------- */

function buildMap() {
  const map = initMap($("map"));
  addBoundary(map);
  state.mapApi = addStations(map, state.stations, onStationSelect);
}

function onStationSelect(st) {
  showStationInfo(st);
  if (st.type === "flow") {
    $("flow-select").value = st.id;
    renderFlow(st.id);
    scrollTo("streamflow");
  } else if (st.type === "snow") {
    $("snow-select").value = st.id;
    renderSnow(st.id);
    scrollTo("snowpack");
  } else if (st.type === "soil" || st.type === "soil_mesh") {
    $("soil-select").value = st.id;
    renderSoil(st.id);
    scrollTo("soil");
  } else if (st.type === "reservoir") {
    selectReservoir(st.id);
    scrollTo("reservoirs");
  } else if (st.type === "cam") {
    scrollTo("webcams");
  }
}

function scrollTo(id) {
  $(id).scrollIntoView({ behavior: "smooth", block: "start" });
}

function showStationInfo(st) {
  const el = $("station-info");
  const link = st.source === "usgs"
    ? `https://waterdata.usgs.gov/monitoring-location/${st.id}/`
    : st.source === "dreamflows"
      ? `https://www.dreamflows.com/graphs/day.${st.df_id}.php`
      : `https://cdec.water.ca.gov/dynamicapp/staMeta?station_id=${st.id}`;
  el.innerHTML = `
    <h3>${st.name}</h3>
    <div class="meta">${TYPE_LABELS[st.type] || st.type}
      ${st.basin ? ` · ${st.basin} basin` : ""}${st.elev_ft ? ` · ${st.elev_ft.toLocaleString()} ft` : ""}
      ${st.operator ? ` · ${st.operator}` : ""}</div>
    ${st._latest ? `<div class="now">${st._latest.replace(/ (cfs|in SWE|af.*|%.*)$/, ' <small>$1</small>')}</div>
    <div class="asof">${st._asof || ""}</div>` : `<div class="meta" style="margin-top:8px">No recent data.</div>`}
    <div style="margin-top:10px"><a href="${link}" target="_blank" rel="noopener">Station page ↗</a></div>`;
}

function buildLegend() {
  const wrap = $("legend-chips");
  const types = [...new Set(state.stations.map((s) => s.type))];
  const order = ["flow", "snow", "soil", "soil_mesh", "reservoir", "cam"];
  types.sort((a, b) => order.indexOf(a) - order.indexOf(b));
  const merged = types.filter((t) => t !== "soil_mesh"); // mesh shares the soil chip
  for (const t of merged) {
    const chip = document.createElement("button");
    chip.className = "chip";
    chip.setAttribute("aria-pressed", "true");
    chip.innerHTML = `${markerSVG(t, 13)}${TYPE_LABELS_PLURAL[t]}`;
    chip.addEventListener("click", () => {
      const off = chip.classList.toggle("off");
      chip.setAttribute("aria-pressed", String(!off));
      state.mapApi.setTypeVisible(t, !off);
      if (t === "soil") state.mapApi.setTypeVisible("soil_mesh", !off);
    });
    wrap.appendChild(chip);
  }
}

/* ---------- tiles ---------- */

// Wetness classes for "how does now compare to the record" context. Colors are
// the diverging dry/wet poles + palette ambers/blues; never shown without the
// text label beside them.
const WETNESS = {
  muchBelow: { color: "#e66767", label: "much below normal" },
  below: { color: "#c98500", label: "below normal" },
  normal: { color: "#898781", label: "near normal" },
  above: { color: "#6da7ec", label: "above normal" },
  muchAbove: { color: "#3987e5", label: "much above normal" },
};

function todayDoyIdx() {
  const now = new Date();
  return data.dayOfYear(now.getMonth() + 1, now.getDate()) - 1;
}

// Classify a current value against that day-of-year's percentile bands.
function wetness(v, bands) {
  if (v == null || !bands) return null;
  const i = todayDoyIdx();
  const b = (k) => bands[k]?.[i];
  const p50 = b("p50");
  const pct = p50 > 0 ? Math.round((100 * v) / p50) : null;
  let cls = "normal";
  if (b("p10") != null && b("p90") != null) {
    if (v < b("p10")) cls = "muchBelow";
    else if (v < b("p25")) cls = "below";
    else if (v <= b("p75")) cls = "normal";
    else if (v <= b("p90")) cls = "above";
    else cls = "muchAbove";
  } else if (pct != null) {
    cls = pctClass(pct);
  } else {
    return null;
  }
  return { pct, cls };
}

function pctClass(pct) {
  if (pct < 50) return "muchBelow";
  if (pct < 90) return "below";
  if (pct <= 110) return "normal";
  if (pct <= 150) return "above";
  return "muchAbove";
}

async function buildTiles() {
  const tiles = [];

  // Snowpack: average % of median across pillows (winter), else avg SWE.
  const snowEntries = Object.entries(state.local.snow || {});
  const pcts = snowEntries.map(([, e]) => e.pct_median).filter((v) => v != null);
  if (pcts.length >= 3) {
    const pct = Math.round(avg(pcts));
    tiles.push(tile("snow", "Snowpack", `${pct}<small>% of median</small>`,
      `avg of ${pcts.length} snow pillows`, { section: "snowpack", wet: { pct, cls: pctClass(pct) } }));
  } else if (snowEntries.length) {
    const swes = snowEntries.map(([, e]) => e.latest?.v).filter((v) => v != null);
    tiles.push(tile("snow", "Snowpack", `${avg(swes).toFixed(1)}<small> in SWE</small>`,
      `avg of ${swes.length} pillows`, { section: "snowpack" }));
  }

  // Headline gages, with percent-of-median context from their percentile bands.
  const usgsHeadline = ["11413000", "10346000"];
  const bandsList = await Promise.all(usgsHeadline.map(getUsgsBands));
  usgsHeadline.forEach((id, i) => {
    const st = state.stations.find((s) => s.id === id);
    const lv = state.usgsLatest[id];
    if (st && lv) {
      tiles.push(tile("flow", st.short || st.name, `${charts.fmt(lv.v)}<small> cfs</small>`,
        "live · USGS", { section: "streamflow", flow: id, wet: wetness(lv.v, bandsList[i]) }));
    }
  });
  const jbrE = state.local.flow?.JBR;
  if (jbrE?.latest) {
    tiles.push(tile("flow", "S Yuba at Jones Bar", `${charts.fmt(jbrE.latest.v)}<small> cfs</small>`,
      "CDEC", { section: "streamflow", flow: "JBR", wet: wetness(jbrE.latest.v, jbrE.bands) }));
  }

  // Reservoir storage.
  const resSt = state.stations.filter((s) => s.type === "reservoir" && s.capacity_af);
  let cap = 0, cur = 0, n = 0;
  for (const st of resSt) {
    const e = state.local.reservoirs?.[st.id];
    if (e?.latest) { cap += st.capacity_af; cur += e.latest.v; n++; }
  }
  if (n) {
    tiles.push(tile("reservoir", "Reservoir storage", `${Math.round((100 * cur) / cap)}<small>% of capacity</small>`,
      `${n} reservoirs · ${charts.fmt(cur)} af`, { section: "reservoirs" }));
  }

  // Soil moisture: average of latest readings across stations/depths.
  const soilVals = [];
  for (const e of Object.values(state.local.soil || {})) {
    const vs = Object.values(e.latest || {}).map((x) => x.v);
    if (vs.length) soilVals.push(avg(vs));
  }
  if (soilVals.length) {
    tiles.push(tile("soil", "Soil moisture", `${avg(soilVals).toFixed(0)}<small>% vol</small>`,
      `avg of ${soilVals.length} stations`, { section: "soil" }));
  }

  // Forecast precip (filled async once NWS loads).
  tiles.push(tile("flow", "Precip next 72 h", `–`, "loading forecast…", { id: "tile-fc", section: "forecast" }));

  $("tiles").innerHTML = tiles.join("");
  for (const el of $("tiles").querySelectorAll(".tile[data-section]")) {
    el.classList.add("clickable");
    el.setAttribute("role", "button");
    el.setAttribute("tabindex", "0");
    const go = () => {
      const flowId = el.dataset.flow;
      if (flowId) {
        $("flow-select").value = flowId;
        renderFlow(flowId);
      }
      scrollTo(el.dataset.section);
    };
    el.addEventListener("click", go);
    el.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); go(); } });
  }
}

function tile(type, label, valueHTML, context, opts = {}) {
  const wet = opts.wet ? WETNESS[opts.wet.cls] : null;
  return `<div class="tile" ${opts.id ? `id="${opts.id}"` : ""}
      ${opts.section ? `data-section="${opts.section}"` : ""}
      ${opts.flow ? `data-flow="${opts.flow}"` : ""}>
    <div class="label"><span class="dot" style="background:${charts.TYPE_COLORS[type]}"></span>${label}</div>
    <div class="value">${valueHTML}</div>
    <div class="context">${context}</div>
    ${wet ? `<div class="wetness"><span class="dot" style="background:${wet.color}"></span>${
      opts.wet.pct != null && opts.section === "streamflow" ? `${opts.wet.pct}% of median · ` : ""}${wet.label}</div>` : ""}
  </div>`;
}

const avg = (a) => a.reduce((x, y) => x + y, 0) / a.length;

/* ---------- selectors ---------- */

function buildSelectors() {
  const flowSel = $("flow-select");
  const flows = state.stations.filter((s) => s.type === "flow");
  const basins = [...new Set(flows.map((s) => s.basin))];
  for (const b of basins) {
    const og = document.createElement("optgroup");
    og.label = `${b} basin`;
    for (const st of flows.filter((s) => s.basin === b)) {
      const tag = st.source === "usgs" ? " (live)" : st.source === "dreamflows" ? " (Dreamflows)" : "";
      og.appendChild(new Option(`${st.name}${tag}`, st.id));
    }
    flowSel.appendChild(og);
  }
  flowSel.value = flows.find((s) => s.default)?.id || flows[0].id;
  flowSel.addEventListener("change", () => renderFlow(flowSel.value));

  const snowSel = $("snow-select");
  const snows = state.stations.filter((s) => s.type === "snow")
    .sort((a, b) => (b.elev_ft || 0) - (a.elev_ft || 0));
  for (const st of snows) snowSel.appendChild(new Option(`${st.name} (${(st.elev_ft || 0).toLocaleString()} ft)`, st.id));
  snowSel.value = snows.find((s) => s.default)?.id || snows[0].id;
  snowSel.addEventListener("change", () => renderSnow(snowSel.value));

  const soilSel = $("soil-select");
  for (const st of state.stations.filter((s) => s.type === "soil" || s.type === "soil_mesh")) {
    soilSel.appendChild(new Option(`${st.name} (${(st.elev_ft || 0).toLocaleString()} ft)`, st.id));
  }
  soilSel.addEventListener("change", () => renderSoil(soilSel.value));
}

/* ---------- streamflow ---------- */

async function renderFlow(id) {
  const st = state.stations.find((s) => s.id === id);
  const el = $("flow-chart");
  charts.setLoading(el);
  $("flow-note").textContent = "";
  try {
    let recent, bands, latest;
    const forecastP = st.nwps
      ? data.nwpsForecast(st.nwps).catch(() => null)
      : Promise.resolve(null);
    if (st.source === "usgs") {
      [recent, bands] = await Promise.all([getUsgsDaily(id), getUsgsBands(id)]);
      latest = state.usgsLatest[id];
      $("flow-note").textContent = bands ? "percentiles from USGS daily statistics" : "no long-term statistics for this gage";
    } else if (st.source === "dreamflows") {
      const e = state.local.dreamflows?.[id];
      if (!e) throw new Error("no Dreamflows data yet");
      recent = e.recent;
      bands = null;
      latest = e.latest;
      $("flow-note").textContent = `operator gage via Dreamflows.com${e.confidence && e.confidence !== "Gage" ? ` · reading may be estimated (confidence: ${e.confidence})` : ""} — record builds as the dashboard collects it; no historical statistics`;
    } else {
      const e = state.local.flow?.[id];
      if (!e) throw new Error("no CDEC data yet");
      recent = e.recent;
      bands = e.bands || null;
      latest = e.latest;
      $("flow-note").textContent = bands ? "percentiles from CDEC period of record" : "record too short for percentiles";
    }
    if (!recent.dates.length) throw new Error("empty series");
    // Extend the observed line to "now" with the latest instantaneous reading,
    // so it meets the forecast trace instead of ending at the last full day.
    if (latest && new Date(latest.t.replace(" ", "T")) > new Date(recent.dates.at(-1))) {
      recent = { dates: [...recent.dates, latest.t], values: [...recent.values, latest.v] };
    }
    const forecast = await forecastP;
    if (forecast) $("flow-note").textContent += " · dashed line: CNRFC 5-day forecast";
    charts.ribbonChart(el, {
      recent, bands, unit: "cfs", forecast,
      seriesName: st.source === "dreamflows" ? "observed flow" : "daily mean flow",
    });
    ribbonTable($("flow-table"), recent, bands, "flow (cfs)");
  } catch (e) {
    console.warn(e);
    charts.showMessage(el, `No data available for ${st?.name || id}.`);
  }
}

/* ---------- snow ---------- */

function renderSnow(id) {
  const st = state.stations.find((s) => s.id === id);
  const el = $("snow-chart");
  charts.setLoading(el);
  const e = state.local.snow?.[id];
  if (!e || !e.recent?.dates?.length) {
    charts.showMessage(el, `No data available for ${st?.name || id}.`);
    return;
  }
  $("snow-note").textContent = e.pct_median != null ? `currently ${e.pct_median}% of median for today` : "";
  charts.ribbonChart(el, { recent: e.recent, bands: e.bands || null, unit: "SWE (in)", seriesName: "snow water equivalent" });
  ribbonTable($("snow-table"), e.recent, e.bands, "SWE (in)");
}

/* ---------- soil ---------- */

function renderSoil(id) {
  const st = state.stations.find((s) => s.id === id);
  const el = $("soil-chart");
  charts.setLoading(el);
  const e = state.local.soil?.[id];
  if (!e || !Object.keys(e.depths || {}).length) {
    charts.showMessage(el, `No data available for ${st?.name || id}.`);
    return;
  }
  $("soil-note").textContent = e.nodes_reporting != null
    ? `median of ${e.nodes_reporting}/${e.nodes_total} mesh nodes`
    : "";
  charts.soilChart(el, e.depths);
  soilTable($("soil-table"), e.depths);
}

/* ---------- reservoirs ---------- */

function buildReservoirs() {
  const grid = $("res-grid");
  const rs = state.stations.filter((s) => s.type === "reservoir");
  grid.innerHTML = "";
  for (const st of rs) {
    const e = state.local.reservoirs?.[st.id];
    const pct = e?.pct_capacity;
    const row = document.createElement("div");
    row.className = "res-row";
    row.dataset.id = st.id;
    row.setAttribute("role", "button");
    row.setAttribute("tabindex", "0");
    row.innerHTML = `
      <div class="name">${st.name}</div>
      <div class="nums">${e?.latest ? `${charts.fmt(e.latest.v)} af` : "no data"}
        ${st.capacity_af ? ` / ${charts.fmt(st.capacity_af)} af${pct != null ? ` · <b style="color:#fff">${pct}%</b>` : ""}` : ""}</div>
      <div class="meter"><div class="fill" style="width:${Math.min(pct || 0, 100)}%"></div></div>`;
    const sel = () => selectReservoir(st.id);
    row.addEventListener("click", sel);
    row.addEventListener("keydown", (ev) => { if (ev.key === "Enter" || ev.key === " ") { ev.preventDefault(); sel(); } });
    grid.appendChild(row);
  }
  const first = rs.find((s) => state.local.reservoirs?.[s.id]);
  if (first) selectReservoir(first.id);
}

function selectReservoir(id) {
  document.querySelectorAll(".res-row").forEach((r) => r.classList.toggle("sel", r.dataset.id === id));
  const st = state.stations.find((s) => s.id === id);
  const e = state.local.reservoirs?.[id];
  const el = $("res-chart");
  if (!e?.recent?.dates?.length) {
    charts.showMessage(el, `No storage data for ${st?.name || id}.`);
    return;
  }
  $("res-note").textContent = `${st.name} — storage, last 12 months`;
  charts.reservoirChart(el, { recent: e.recent, capacity: st.capacity_af, name: st.name });
}

/* ---------- forecast ---------- */

function buildForecast() {
  const sel = $("fc-select");
  for (const [i, p] of state.forecastPoints.entries()) sel.appendChild(new Option(p.name, i));
  sel.addEventListener("change", () => renderForecast(+sel.value, false));
  if (state.forecastPoints.length) renderForecast(0, true);
}

async function renderForecast(i, updateTile) {
  const p = state.forecastPoints[i];
  const el = $("fc-chart");
  charts.setLoading(el);
  $("fc-note").textContent = "";
  try {
    const fc = await data.nwsForecast(p.lat, p.lon);
    charts.precipChart(el, fc.qpf, fc.snow);
    const periods = $("fc-periods");
    periods.innerHTML = fc.periods.slice(0, 8).map((per) => `
      <div class="fc-period">
        <span class="when">${per.name}</span>
        <span class="temp">${per.temperature}°${per.temperatureUnit}</span>
        <span class="short">${per.shortForecast}</span>
      </div>`).join("");
    if (updateTile) {
      const days = Object.keys(fc.qpf).sort().slice(0, 3);
      const total = days.reduce((s, d) => s + fc.qpf[d], 0);
      const t = $("tile-fc");
      if (t) {
        t.querySelector(".value").innerHTML = `${total.toFixed(total < 1 ? 2 : 1)}<small> in</small>`;
        t.querySelector(".context").textContent = `NWS · ${p.name}`;
      }
    }
  } catch (e) {
    console.warn(e);
    charts.showMessage(el, "NWS forecast unavailable right now.");
  }
}

/* ---------- webcams ---------- */

function buildWebcams() {
  const grid = $("cam-grid");
  const cams = state.stations.filter((s) => s.type === "cam");
  grid.innerHTML = cams.map((c) => `
    <figure class="cam" style="margin:0">
      <img loading="lazy" src="${c.img}" alt="Webcam: ${c.name}" data-src="${c.img}">
      <figcaption class="cap">${c.name}${c.credit ? `<span class="credit">${c.credit}</span>` : ""}</figcaption>
    </figure>`).join("");
  // refresh every 2 minutes with a cache-busting param
  setInterval(() => {
    grid.querySelectorAll("img").forEach((img) => {
      img.src = `${img.dataset.src}?t=${Date.now()}`;
    });
  }, 120000);
}

/* ---------- table twins ---------- */

function ribbonTable(container, recent, bands, label) {
  const rows = [];
  const n = recent.dates.length;
  for (let i = n - 1; i >= 0 && rows.length < 366; i--) {
    const d = recent.dates[i].slice(0, 10);
    const [, m, day] = d.split("-").map(Number);
    const doy = data.dayOfYear(m, day) - 1;
    rows.push([d, round1(recent.values[i]), round1(bands?.p50?.[doy]), round1(bands?.p10?.[doy]), round1(bands?.p90?.[doy])]);
  }
  charts.fillTable(container, ["date", label, "median", "p10", "p90"], rows);
}

function soilTable(container, depths) {
  const labels = Object.keys(depths);
  const byDay = new Map();
  for (const lab of labels) {
    const { t, v } = depths[lab];
    for (let i = 0; i < t.length; i++) {
      const day = t[i].slice(0, 10);
      if (!byDay.has(day)) byDay.set(day, {});
      byDay.get(day)[lab] = v[i]; // last sample of the day wins
    }
  }
  const rows = [...byDay.keys()].sort().reverse()
    .map((day) => [day, ...labels.map((l) => round1(byDay.get(day)[l]))]);
  charts.fillTable(container, ["date", ...labels], rows);
}

const round1 = (v) => (v == null || Number.isNaN(v) ? null : Math.round(v * 10) / 10);
