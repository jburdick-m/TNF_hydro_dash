// AA2735 route + schedule. Times are Unix seconds (UTC) from FlightAware, retrieved 2026-10-05.
// ORD-SMF waypoints are the filed track points; SMF-ORD between BAM and ONL is great-circle
// interpolated (waypointsApprox) because the intermediate fixes weren't published with coordinates.
window.FLIGHT_DATA = {
 "flight": {
  "ident": "AA2735",
  "icao": "AAL2735",
  "airline": "American Airlines",
  "aircraft": "Boeing 737-800",
  "aircraftCode": "B738",
  "seat": {
   "side": "right",
   "zone": "rear"
  },
  "source": "FlightAware filed flight plans, retrieved 2026-10-05"
 },
 "airports": {
  "ORD": {
   "iata": "ORD",
   "icao": "KORD",
   "name": "Chicago O'Hare Intl",
   "city": "Chicago, IL",
   "lat": 41.9769,
   "lon": -87.9081,
   "elevFt": 672,
   "tz": "America/Chicago"
  },
  "SMF": {
   "iata": "SMF",
   "icao": "KSMF",
   "name": "Sacramento Intl",
   "city": "Sacramento, CA",
   "lat": 38.6954,
   "lon": -121.5908,
   "elevFt": 27,
   "tz": "America/Los_Angeles"
  }
 },
 "legs": {
  "ORD-SMF": {
   "id": "ORD-SMF",
   "from": "ORD",
   "to": "SMF",
   "direction": "westbound",
   "cruiseFL": 340,
   "filedSpeedKt": 447,
   "route": "NOONY NIGHT NITWT KP69C YANKI LAR TCH STACO BVL J154 BAM MCORD BETBE WEBGO SLMMR5",
   "fixes": [
    {
     "id": "LAR",
     "lon": -105.72,
     "lat": 41.34
    },
    {
     "id": "TCH",
     "lon": -111.98,
     "lat": 40.85
    },
    {
     "id": "BVL",
     "lon": -113.76,
     "lat": 40.73
    },
    {
     "id": "BAM",
     "lon": -116.92,
     "lat": 40.57
    },
    {
     "id": "MCORD",
     "lon": -117.94,
     "lat": 40.23
    }
   ],
   "waypointsApprox": false,
   "waypoints": [
    [
     -87.91,
     41.98
    ],
    [
     -87.99,
     41.98
    ],
    [
     -88.02,
     41.99
    ],
    [
     -88.11,
     41.99
    ],
    [
     -88.12,
     41.99
    ],
    [
     -88.22,
     42.0
    ],
    [
     -88.24,
     42.0
    ],
    [
     -88.44,
     42.02
    ],
    [
     -88.67,
     42.04
    ],
    [
     -88.71,
     42.04
    ],
    [
     -88.75,
     42.04
    ],
    [
     -88.81,
     42.05
    ],
    [
     -88.82,
     42.05
    ],
    [
     -88.84,
     42.04
    ],
    [
     -89.11,
     42.03
    ],
    [
     -89.24,
     42.02
    ],
    [
     -89.36,
     42.01
    ],
    [
     -89.64,
     42.0
    ],
    [
     -89.74,
     41.99
    ],
    [
     -89.9,
     41.98
    ],
    [
     -89.95,
     41.98
    ],
    [
     -90.12,
     41.96
    ],
    [
     -90.29,
     41.95
    ],
    [
     -91.77,
     41.84
    ],
    [
     -93.41,
     41.73
    ],
    [
     -93.44,
     41.73
    ],
    [
     -96.03,
     41.62
    ],
    [
     -96.07,
     41.62
    ],
    [
     -96.63,
     41.59
    ],
    [
     -98.0,
     41.5
    ],
    [
     -99.03,
     41.52
    ],
    [
     -100.73,
     41.53
    ],
    [
     -101.3,
     41.52
    ],
    [
     -102.14,
     41.5
    ],
    [
     -103.66,
     41.44
    ],
    [
     -104.57,
     41.4
    ],
    [
     -105.72,
     41.34
    ],
    [
     -105.99,
     41.32
    ],
    [
     -106.26,
     41.31
    ],
    [
     -106.79,
     41.28
    ],
    [
     -108.61,
     41.16
    ],
    [
     -109.81,
     41.06
    ],
    [
     -111.98,
     40.85
    ],
    [
     -112.1,
     40.84
    ],
    [
     -112.42,
     40.82
    ],
    [
     -113.76,
     40.73
    ],
    [
     -114.45,
     40.7
    ],
    [
     -114.92,
     40.68
    ],
    [
     -116.92,
     40.57
    ],
    [
     -117.94,
     40.23
    ],
    [
     -118.02,
     40.2
    ],
    [
     -119.1,
     39.89
    ],
    [
     -119.12,
     39.88
    ],
    [
     -119.55,
     39.74
    ],
    [
     -119.64,
     39.71
    ],
    [
     -119.82,
     39.65
    ],
    [
     -120.0,
     39.59
    ],
    [
     -120.06,
     39.57
    ],
    [
     -120.33,
     39.47
    ],
    [
     -120.35,
     39.47
    ],
    [
     -120.37,
     39.44
    ],
    [
     -120.69,
     39.07
    ],
    [
     -120.72,
     39.07
    ],
    [
     -120.8,
     39.04
    ],
    [
     -120.92,
     39.01
    ],
    [
     -121.08,
     38.97
    ],
    [
     -121.19,
     38.94
    ],
    [
     -121.23,
     38.93
    ],
    [
     -121.39,
     38.89
    ],
    [
     -121.43,
     38.85
    ],
    [
     -121.46,
     38.82
    ],
    [
     -121.52,
     38.76
    ],
    [
     -121.59,
     38.7
    ]
   ]
  },
  "SMF-ORD": {
   "id": "SMF-ORD",
   "from": "SMF",
   "to": "ORD",
   "direction": "eastbound",
   "cruiseFL": 370,
   "filedSpeedKt": 450,
   "route": "RVRCT4 MACUS Q122 MCORD BAM KOHEN BEARR KU72Q BOJOL KD75W ONL FOD MYRRS FYTTE7",
   "fixes": [
    {
     "id": "MCORD",
     "lon": -117.94,
     "lat": 40.23
    },
    {
     "id": "BAM",
     "lon": -116.922,
     "lat": 40.569
    },
    {
     "id": "ONL",
     "lon": -98.687,
     "lat": 42.47
    },
    {
     "id": "FOD",
     "lon": -94.295,
     "lat": 42.611
    }
   ],
   "waypointsApprox": true,
   "waypoints": [
    [
     -121.5908,
     38.6954
    ],
    [
     -121.45,
     38.8
    ],
    [
     -121.2,
     39.0
    ],
    [
     -120.4,
     39.45
    ],
    [
     -117.94,
     40.23
    ],
    [
     -116.922,
     40.569
    ],
    [
     -115.451,
     40.836
    ],
    [
     -113.969,
     41.084
    ],
    [
     -112.476,
     41.312
    ],
    [
     -110.973,
     41.522
    ],
    [
     -109.46,
     41.712
    ],
    [
     -107.94,
     41.881
    ],
    [
     -106.411,
     42.031
    ],
    [
     -104.876,
     42.16
    ],
    [
     -103.335,
     42.269
    ],
    [
     -101.789,
     42.357
    ],
    [
     -100.239,
     42.424
    ],
    [
     -98.687,
     42.47
    ],
    [
     -97.225,
     42.536
    ],
    [
     -95.761,
     42.583
    ],
    [
     -94.295,
     42.611
    ],
    [
     -92.864,
     42.522
    ],
    [
     -91.437,
     42.416
    ],
    [
     -90.016,
     42.292
    ],
    [
     -88.6,
     42.15
    ],
    [
     -88.25,
     42.05
    ],
    [
     -87.9081,
     41.9769
    ]
   ]
  }
 },
 "schedule": [
  {
   "legId": "ORD-SMF",
   "date": "2026-10-05",
   "gateDep": 1791213300,
   "takeoff": 1791213900,
   "landing": 1791228540,
   "gateArr": 1791230520
  },
  {
   "legId": "SMF-ORD",
   "date": "2026-10-05",
   "gateDep": 1791233820,
   "takeoff": 1791234420,
   "landing": 1791247920,
   "gateArr": 1791248520
  },
  {
   "legId": "ORD-SMF",
   "date": "2026-10-06",
   "gateDep": 1791299700,
   "takeoff": 1791300300,
   "landing": 1791316320,
   "gateArr": 1791316920
  },
  {
   "legId": "SMF-ORD",
   "date": "2026-10-06",
   "gateDep": 1791320220,
   "takeoff": 1791320820,
   "landing": 1791335400,
   "gateArr": 1791336000
  }
 ]
};
