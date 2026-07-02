/* Chart builders (Plotly). One shared dark style; percentile ribbons use a
 * diverging dry(warm) <-> wet(cool) encoding around a neutral normal band. */

const INK = "#c3c2b7";
const INK_MUTED = "#898781";
const GRID = "#2c2c2a";
const BASELINE = "#383835";

const DRY = "230, 103, 103";   // red pole
const WET = "57, 135, 229";    // blue pole
const NEUTRAL = "195, 194, 183";

/* Categorical type palette — validated (dark surface, all pairs): worst CVD pair
 * sits in the 8–12 floor band, so map markers ALSO differ by shape (circle /
 * triangle / square / diamond) as the required secondary encoding. */
export const TYPE_COLORS = {
  flow: "#3987e5",      // blue circle
  reservoir: "#199e70", // aqua diamond
  soil: "#d95926",      // orange square
  soil_mesh: "#d95926",
  snow: "#c98500",      // amber triangle
  cam: "#898781",       // gray (chrome, not data)
};

// ordinal one-hue ramp for soil depths, shallow -> deep (validated --ordinal, dark)
const DEPTH_RAMP = ["#cde2fb", "#9ec5f4", "#6da7ec", "#3987e5", "#256abf", "#184f95"];

const BASE_LAYOUT = {
  paper_bgcolor: "rgba(0,0,0,0)",
  plot_bgcolor: "rgba(0,0,0,0)",
  font: { family: 'system-ui, -apple-system, "Segoe UI", sans-serif', color: INK, size: 12 },
  margin: { l: 52, r: 12, t: 8, b: 34 },
  hovermode: "x unified",
  hoverlabel: { bgcolor: "#222221", bordercolor: BASELINE, font: { color: "#ffffff", size: 12 } },
  dragmode: false,
  xaxis: { gridcolor: GRID, linecolor: BASELINE, zeroline: false, tickfont: { color: INK_MUTED } },
  yaxis: { gridcolor: GRID, linecolor: BASELINE, zeroline: false, tickfont: { color: INK_MUTED }, rangemode: "tozero" },
  legend: {
    orientation: "h", y: -0.16, yanchor: "top", x: 0,
    font: { size: 11, color: INK },
  },
  showlegend: true,
};

const CONFIG = { displayModeBar: false, responsive: true, scrollZoom: false };

function deepMerge(a, b) {
  const out = { ...a };
  for (const k of Object.keys(b || {})) {
    out[k] = b[k] && typeof b[k] === "object" && !Array.isArray(b[k]) && a[k]
      ? deepMerge(a[k], b[k]) : b[k];
  }
  return out;
}

function draw(el, traces, layoutOverrides) {
  Plotly.react(el, traces, deepMerge(BASE_LAYOUT, layoutOverrides), CONFIG);
  el.classList.remove("loading");
}

export function setLoading(el) { el.classList.add("loading"); }

export function showMessage(el, msg) {
  el.classList.remove("loading");
  el.innerHTML = `<div class="status-msg">${msg}</div>`;
}

/* ---------- percentile ribbon (streamflow / SWE) ---------- */

// bands: {min,p10,p25,p50,p75,p90,max} arrays indexed by doy-1 (366 long)
// recent: {dates: [YYYY-MM-DD], values: []}
// showBands=false plots only the median reference line from `bands` (used for
// streamflow, where stacked fills drown out the observed trace at summer lows).
export function ribbonChart(el, { recent, bands, unit, seriesName, forecast, showBands = true }) {
  const dates = recent.dates;
  const doyIdx = dates.map((d) => {
    const [, m, day] = d.split("-").map(Number);
    return doyLeap(m, day) - 1;
  });
  const band = (key) => doyIdx.map((i) => bands?.[key]?.[i] ?? null);

  const traces = [];
  if (bands && showBands) {
    const fill = (name, key, rgb, alpha, opts = {}) => traces.push({
      x: dates, y: band(key), name,
      mode: "lines", line: { width: 0 },
      fill: opts.base ? "none" : "tonexty",
      fillcolor: `rgba(${rgb}, ${alpha})`,
      hoverinfo: "skip",
      showlegend: !opts.base,
      legendgroup: name,
      visible: opts.hidden ? "legendonly" : true,
    });
    fill("", "min", DRY, 0, { base: true });    // invisible base for tonexty
    fill("min–10th (dry)", "p10", DRY, 0.34);
    fill("10–25th", "p25", DRY, 0.16);
    fill("25–75th (normal)", "p75", NEUTRAL, 0.10);
    fill("75–90th", "p90", WET, 0.16);
    // hidden by default: record maxima dwarf everything else and crush the y-scale
    fill("90th–max (wet)", "max", WET, 0.34, { hidden: true });
  }
  if (bands) {
    traces.push({
      x: dates, y: band("p50"), name: "median (day of year)",
      mode: "lines", line: { width: 1.5, color: INK_MUTED },
      hovertemplate: "median: %{y:,.0f}<extra></extra>",
    });
  }
  traces.push({
    x: dates, y: recent.values, name: seriesName || "last 12 months",
    mode: "lines", line: { width: 2, color: "#ffffff" },
    hovertemplate: `%{y:,.1f} ${unit}<extra>${seriesName || "observed"}</extra>`,
  });
  if (forecast) {
    // dashed = projection, deliberately distinct from the observed solid line
    traces.push({
      x: forecast.t, y: forecast.v, name: "CNRFC forecast",
      mode: "lines", line: { width: 2, color: "#3987e5", dash: "dash" },
      hovertemplate: `%{y:,.0f} ${unit}<extra>forecast</extra>`,
    });
  }

  draw(el, traces, { yaxis: { title: { text: unit, font: { size: 12, color: INK_MUTED } } } });
}

function doyLeap(m, d) {
  const cum = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335];
  return cum[m - 1] + d;
}

/* ---------- soil moisture (multi-depth ordinal ramp) ---------- */

// depths: { "5 cm": {t:[], v:[]}, ... } ordered shallow -> deep
export function soilChart(el, depths) {
  const labels = Object.keys(depths);
  const n = labels.length;
  const traces = labels.map((label, i) => ({
    x: depths[label].t,
    y: depths[label].v,
    name: label,
    mode: "lines",
    line: { width: 2, color: rampColor(i, n) },
    hovertemplate: `%{y:.1f}%<extra>${label}</extra>`,
  }));
  draw(el, traces, {
    yaxis: { title: { text: "volumetric soil moisture (%)", font: { size: 12, color: INK_MUTED } }, rangemode: "tozero" },
  });
}

function rampColor(i, n) {
  if (n <= 1) return DEPTH_RAMP[2];
  const t = i / (n - 1);
  return DEPTH_RAMP[Math.round(t * (DEPTH_RAMP.length - 1))];
}

/* ---------- water-year overlay (soil moisture context) ----------
 * Records are only a few years old — too short for percentile bands — so each
 * water year (Oct 1 – Sep 30) is drawn as its own trace: prior years in the
 * ordinal blue ramp (oldest lightest), the current year in primary ink. */

export function waterYearChart(el, { dates, values }) {
  const byWY = new Map();
  for (let i = 0; i < dates.length; i++) {
    if (values[i] == null) continue;
    const [y, m, d] = dates[i].split("-").map(Number);
    const wy = m >= 10 ? y + 1 : y;
    // shared x-axis: remap every point into reference WY2024 (has a Feb 29)
    const x = `${m >= 10 ? 2023 : 2024}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
    if (!byWY.has(wy)) byWY.set(wy, { x: [], y: [] });
    byWY.get(wy).x.push(x);
    byWY.get(wy).y.push(values[i]);
  }
  const years = [...byWY.keys()].sort();
  const current = years.at(-1);
  const prior = years.slice(0, -1);
  const traces = years.map((wy) => ({
    x: byWY.get(wy).x,
    y: byWY.get(wy).y,
    name: `WY ${wy}`,
    mode: "lines",
    line: wy === current
      ? { width: 2.5, color: "#ffffff" }
      : { width: 1.75, color: rampColor(prior.indexOf(wy), Math.max(prior.length, 2)) },
    hovertemplate: `%{y:.1f}%<extra>WY ${wy}</extra>`,
  }));
  draw(el, traces, {
    yaxis: { title: { text: "volumetric soil moisture (%)", font: { size: 12, color: INK_MUTED } }, rangemode: "tozero" },
    xaxis: { tickformat: "%b", dtick: "M1", gridcolor: GRID },
    hovermode: "x unified",
  });
}

/* ---------- reservoir storage ---------- */

export function reservoirChart(el, { recent, capacity, name }) {
  const traces = [{
    x: recent.dates, y: recent.values, name: name || "storage",
    mode: "lines", line: { width: 2, color: TYPE_COLORS.reservoir },
    fill: "tozeroy", fillcolor: "rgba(25, 158, 112, 0.10)",
    hovertemplate: "%{y:,.0f} af<extra>storage</extra>",
  }];
  const layout = {
    yaxis: { title: { text: "storage (acre-feet)", font: { size: 12, color: INK_MUTED } } },
    showlegend: false,
  };
  if (capacity) {
    layout.shapes = [{
      type: "line", xref: "paper", x0: 0, x1: 1, y0: capacity, y1: capacity,
      line: { color: INK_MUTED, width: 1 },
    }];
    layout.annotations = [{
      xref: "paper", x: 0.995, y: capacity, xanchor: "right", yanchor: "bottom",
      text: `capacity ${fmt(capacity)} af`, showarrow: false,
      font: { size: 11, color: INK_MUTED },
    }];
    layout.yaxis.range = [0, capacity * 1.08];
  }
  draw(el, traces, layout);
}

/* ---------- forecast precip bars ---------- */

// byDay: {dayISO: inches}; show next 7 days
export function precipChart(el, byDay, snowByDay) {
  const days = Object.keys(byDay).sort().slice(0, 7);
  const x = days;
  const liquid = days.map((d) => +(byDay[d] || 0).toFixed(2));
  const snow = days.map((d) => +((snowByDay?.[d] || 0)).toFixed(1));
  const hasSnow = snow.some((v) => v > 0);

  const traces = [{
    x, y: liquid, name: "precip (in)",
    type: "bar",
    marker: { color: TYPE_COLORS.flow, cornerradius: 4 },
    hovertemplate: "%{y:.2f} in<extra>precip</extra>",
  }];
  if (hasSnow) {
    traces.push({
      x, y: snow, name: "snow (in)",
      type: "bar",
      marker: { color: "#9085e9", cornerradius: 4 },
      hovertemplate: "%{y:.1f} in<extra>snow</extra>",
    });
  }
  draw(el, traces, {
    barmode: "group",
    bargap: 0.35,
    yaxis: { title: { text: "inches", font: { size: 12, color: INK_MUTED } }, rangemode: "tozero" },
    showlegend: hasSnow,
    xaxis: { gridcolor: "rgba(0,0,0,0)", type: "date", tickformat: "%a %m/%d", dtick: 86400000 },
  });
}

/* ---------- table view twin ---------- */

export function fillTable(container, headers, rows) {
  const thead = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c ?? "–"}</td>`).join("")}</tr>`).join("");
  container.innerHTML = `<div class="tbl-scroll"><table>${thead}${body}</table></div>`;
}

export function fmt(n) {
  if (n == null || Number.isNaN(n)) return "–";
  return Math.round(n).toLocaleString();
}
