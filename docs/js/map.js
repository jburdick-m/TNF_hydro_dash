/* Leaflet map: basemaps, Tahoe NF boundary, typed station markers. */

import { TYPE_COLORS } from "./charts.js";

export const TYPE_LABELS = {
  flow: "Stream gage",
  snow: "Snow pillow",
  soil: "Soil moisture",
  soil_mesh: "Soil moisture (mesh)",
  reservoir: "Reservoir",
  cam: "Webcam",
};

export const TYPE_LABELS_PLURAL = {
  flow: "Stream gages",
  snow: "Snow pillows",
  soil: "Soil moisture",
  soil_mesh: "Soil moisture",
  reservoir: "Reservoirs",
  cam: "Webcams",
};

export function initMap(el) {
  const map = L.map(el, {
    center: [39.4, -120.6],
    zoom: 9,
    zoomControl: true,
    attributionControl: true,
  });

  const dark = L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OSM</a> &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 18,
  }).addTo(map);

  const topo = L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSTopo/MapServer/tile/{z}/{y}/{x}", {
    attribution: "USGS The National Map",
    maxZoom: 16,
  });

  const imagery = L.tileLayer("https://basemap.nationalmap.gov/arcgis/rest/services/USGSImageryOnly/MapServer/tile/{z}/{y}/{x}", {
    attribution: "USGS The National Map",
    maxZoom: 16,
  });

  L.control.layers(
    { "Dark": dark, "USGS Topo": topo, "USGS Imagery": imagery },
    {},
    { position: "topright" }
  ).addTo(map);

  return map;
}

export async function addBoundary(map) {
  try {
    const r = await fetch("geo/tnf_boundary.geojson");
    const gj = await r.json();
    const layer = L.geoJSON(gj, {
      style: {
        color: "rgba(255,255,255,0.55)",
        weight: 1.5,
        fillColor: "#ffffff",
        fillOpacity: 0.04,
        interactive: false,
      },
    }).addTo(map);
    return layer;
  } catch (e) {
    console.warn("boundary failed to load", e);
    return null;
  }
}

/* Marker glyphs: shape + color carry station type together (shape is the
 * secondary encoding required because the 4-hue palette's worst CVD pair sits
 * in the floor band). Stroke is a surface-colored ring. */
export function markerSVG(type, size = 18) {
  const color = TYPE_COLORS[type] || "#898781";
  const ring = "#111110";
  const shapes = {
    flow: `<circle cx="9" cy="9" r="6" fill="${color}" stroke="${ring}" stroke-width="2"/>`,
    snow: `<path d="M9 1.5 L16.5 15.5 H1.5 Z" fill="${color}" stroke="${ring}" stroke-width="2" stroke-linejoin="round"/>`,
    soil: `<rect x="3" y="3" width="12" height="12" rx="1.5" fill="${color}" stroke="${ring}" stroke-width="2"/>`,
    soil_mesh: `<rect x="3" y="3" width="12" height="12" rx="1.5" fill="${color}" stroke="${ring}" stroke-width="2"/>`,
    reservoir: `<path d="M9 1.5 L16.5 9 L9 16.5 L1.5 9 Z" fill="${color}" stroke="${ring}" stroke-width="2" stroke-linejoin="round"/>`,
    cam: `<circle cx="9" cy="9" r="4.5" fill="${color}" stroke="${ring}" stroke-width="2"/>`,
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 18 18" aria-hidden="true">${shapes[type] || shapes.cam}</svg>`;
}

/* Adds one shaped marker per station. onSelect(station) fires from popup links.
 * Returns {markers: Map<id, marker>, setTypeVisible(type, visible)} */
export function addStations(map, stations, onSelect) {
  const markers = new Map();
  const groups = {};

  for (const st of stations) {
    const icon = L.divIcon({
      className: "station-marker",
      html: markerSVG(st.type, 20),
      iconSize: [20, 20],
      iconAnchor: [10, 10],
    });
    const m = L.marker([st.lat, st.lon], { icon, keyboard: true, title: st.name });
    m.bindPopup(popupHTML(st), { closeButton: true, maxWidth: 260 });
    m.on("popupopen", (e) => {
      const link = e.popup.getElement().querySelector(".plink");
      if (link) link.addEventListener("click", () => onSelect(st));
    });
    if (!groups[st.type]) groups[st.type] = L.layerGroup().addTo(map);
    groups[st.type].addLayer(m);
    markers.set(st.id, m);
  }

  return {
    markers,
    setTypeVisible(type, visible) {
      const g = groups[type];
      if (!g) return;
      if (visible) g.addTo(map);
      else map.removeLayer(g);
    },
    updatePopup(st) {
      const m = markers.get(st.id);
      if (m) m.setPopupContent(popupHTML(st));
    },
  };
}

function popupHTML(st) {
  const latest = st._latest
    ? `<div style="font-size:17px;color:#fff;font-weight:600;margin:4px 0 0">${st._latest}</div>
       <div style="color:#898781;font-size:11px">${st._asof || ""}</div>`
    : `<div style="color:#898781;margin-top:4px">no recent data</div>`;
  const action = st.type === "cam"
    ? `<a href="#webcams" class="plink" style="text-decoration:none">View webcams ↓</a>`
    : `<span class="plink">View chart ↓</span>`;
  return `
    <b>${st.name}</b>
    <div style="color:#898781;font-size:11.5px">${TYPE_LABELS[st.type] || st.type}${st.elev_ft ? ` · ${st.elev_ft.toLocaleString()} ft` : ""}</div>
    ${latest}
    <div style="margin-top:7px">${action}</div>`;
}
