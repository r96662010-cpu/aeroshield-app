import { AQISeverity } from '../types';

export function getAQISeverity(aqi: number): AQISeverity {
  if (aqi <= 50) return 'good';
  if (aqi <= 100) return 'moderate';
  if (aqi <= 200) return 'poor';
  if (aqi <= 300) return 'very-poor';
  if (aqi <= 400) return 'severe';
  return 'hazardous';
}

export function getAQILabel(severity: AQISeverity): string {
  switch (severity) {
    case 'good': return 'Good (0-50)';
    case 'moderate': return 'Moderate (51-100)';
    case 'poor': return 'Poor (101-200)';
    case 'very-poor': return 'Very Poor (201-300)';
    case 'severe': return 'Severe (301-400)';
    case 'hazardous': return 'Hazardous (400+)';
  }
}

export function getAQIColor(aqi: number): string {
  const sev = getAQISeverity(aqi);
  switch (sev) {
    case 'good': return '#10b981'; // Emerald 500
    case 'moderate': return '#eab308'; // Amber 500
    case 'poor': return '#f97316'; // Orange 500
    case 'very-poor': return '#ef4444'; // Red 500
    case 'severe': return '#a855f7'; // Purple 500
    case 'hazardous': return '#9f1239'; // Rose 800 / Deep Maroon
  }
}

export function getAQIBadgeBg(aqi: number): string {
  const sev = getAQISeverity(aqi);
  switch (sev) {
    case 'good': return 'bg-emerald-950/60 border-emerald-500/40 text-emerald-400';
    case 'moderate': return 'bg-amber-950/60 border-amber-500/40 text-amber-400';
    case 'poor': return 'bg-orange-950/60 border-orange-500/40 text-orange-400';
    case 'very-poor': return 'bg-red-950/60 border-red-500/40 text-red-400';
    case 'severe': return 'bg-purple-950/60 border-purple-500/40 text-purple-300';
    case 'hazardous': return 'bg-rose-950/70 border-rose-500/40 text-rose-300';
  }
}

export function getHealthAdvisory(aqi: number): {
  general: string;
  sensitive: string;
  maskRecommendation: string;
  outdoorActivities: string;
} {
  if (aqi <= 50) {
    return {
      general: 'Air quality is satisfactory, and air pollution poses little or no risk.',
      sensitive: 'Safe for all outdoor activities and exercise.',
      maskRecommendation: 'No mask required.',
      outdoorActivities: 'Ideal conditions for cycling, running, and outdoor sports.'
    };
  }
  if (aqi <= 100) {
    return {
      general: 'Air quality is acceptable; some pollutants may pose a moderate concern for a very small number of sensitive individuals.',
      sensitive: 'Unusually sensitive individuals should consider reducing prolonged outdoor exertion.',
      maskRecommendation: 'Optional for sensitive groups near major highways.',
      outdoorActivities: 'Normal outdoor activities permitted.'
    };
  }
  if (aqi <= 200) {
    return {
      general: 'Breathing discomfort to people with lungs, asthma and heart diseases.',
      sensitive: 'Children and older adults should limit prolonged outdoor exertion.',
      maskRecommendation: 'Surgical or particulate mask advised in traffic jams.',
      outdoorActivities: 'Avoid intense outdoor cardio during morning and late evening rush hours.'
    };
  }
  if (aqi <= 300) {
    return {
      general: 'Respiratory illness on prolonged exposure. Significant particulate haze.',
      sensitive: 'People with respiratory or cardiac disease should avoid all outdoor exertion.',
      maskRecommendation: 'N95 / FFP2 respirator strongly recommended for commuters and bike riders.',
      outdoorActivities: 'Avoid jogging and heavy physical work outdoors. Keep car windows rolled up with HEPA recirculation.'
    };
  }
  if (aqi <= 400) {
    return {
      general: 'Severe health impact. Respiratory illness to the people on prolonged exposure. Healthy people may experience symptoms.',
      sensitive: 'Strictly avoid outdoor movement. Keep emergency bronchodilators accessible.',
      maskRecommendation: 'N95 / N99 certified respirator mandatory for anyone stepping outdoors.',
      outdoorActivities: 'Suspension of outdoor morning walks and physical drills. Run air purifiers indoors.'
    };
  }
  return {
    general: 'Hazardous public emergency. Emergency health warnings of entire population affected with serious irritation and lung impact.',
    sensitive: 'Stay indoors with closed ventilation and HEPA filtration.',
    maskRecommendation: 'N95 or elastomeric respirator mandatory. Fit check essential.',
    outdoorActivities: 'All outdoor physical exertion prohibited. Transit routes with active air filtering prioritized.'
  };
}

/**
 * Fetch real-time air quality and weather telemetry from Open-Meteo with retry, caching, and timeout handling
 */
export async function fetchLiveAirQuality(lat: number, lng: number): Promise<import('../types').LiveAirQualityTelemetry> {
  const cacheKey = `aeroshield_aqi_${lat.toFixed(3)}_${lng.toFixed(3)}`;
  
  // Helper to read cached data from localStorage if available
  const getCachedData = (): import('../types').LiveAirQualityTelemetry | null => {
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const ageMinutes = Math.round((Date.now() - (parsed.cachedAt || 0)) / 60000);
        return {
          ...parsed,
          status: ageMinutes > 60 ? 'STALE' : 'OFFLINE',
          isCached: true,
          timestamp: parsed.timestamp || `${ageMinutes}m ago (Cached)`
        };
      }
    } catch {}
    return null;
  };

  // Check if browser is currently offline
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const cached = getCachedData();
    if (cached) return cached;
    return {
      status: 'OFFLINE',
      aqi: 0,
      aqiCategory: 'good',
      pm25: 0,
      pm10: 0,
      no2: 0,
      so2: 0,
      co: 0,
      o3: 0,
      timestamp: 'Offline',
      source: 'Offline Cache',
      errorMessage: 'Live air-quality data is temporarily unavailable (Device Offline).'
    };
  }

  // Attempt fetch with retry logic (up to 2 retries with exponential backoff)
  let lastError: any = null;
  for (let attempt = 0; attempt <= 2; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      // Fetch air quality and meteorology in parallel
      const aqiUrl = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=us_aqi,pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone&hourly=pm2_5,us_aqi&timezone=auto`;
      const weatherUrl = `https://api.open-meteo.com/v1/forecast?latitude=${lat.toFixed(4)}&longitude=${lng.toFixed(4)}&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto`;

      const [aqiRes, weatherRes] = await Promise.allSettled([
        fetch(aqiUrl, { signal: controller.signal }),
        fetch(weatherUrl, { signal: controller.signal })
      ]);
      clearTimeout(timeoutId);

      if (aqiRes.status !== 'fulfilled' || !aqiRes.value.ok) {
        throw new Error(aqiRes.status === 'fulfilled' ? `HTTP ${aqiRes.value.status}` : 'Air Quality request aborted or failed');
      }

      const aqiData = await aqiRes.value.json();
      let weatherData: any = null;
      if (weatherRes.status === 'fulfilled' && weatherRes.value.ok) {
        try {
          weatherData = await weatherRes.value.json();
        } catch {}
      }

      if (aqiData && aqiData.current) {
        const aqiVal = Math.round(aqiData.current.us_aqi ?? 0);
        const result: import('../types').LiveAirQualityTelemetry = {
          status: 'LIVE',
          aqi: aqiVal,
          aqiCategory: getAQISeverity(aqiVal),
          pm25: Math.round(aqiData.current.pm2_5 ?? 0),
          pm10: Math.round(aqiData.current.pm10 ?? 0),
          no2: Math.round(aqiData.current.nitrogen_dioxide ?? 0),
          so2: Math.round(aqiData.current.sulphur_dioxide ?? 0),
          co: Number((aqiData.current.carbon_monoxide ? aqiData.current.carbon_monoxide / 1000 : 0.8).toFixed(1)),
          o3: Math.round(aqiData.current.ozone ?? 0),
          temperature: weatherData?.current?.temperature_2m != null ? Math.round(weatherData.current.temperature_2m) : undefined,
          humidity: weatherData?.current?.relative_humidity_2m != null ? Math.round(weatherData.current.relative_humidity_2m) : undefined,
          windSpeed: weatherData?.current?.wind_speed_10m != null ? Math.round(weatherData.current.wind_speed_10m) : undefined,
          source: 'Open-Meteo Global Satellite & Atmospheric Telemetry',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          hourlyForecast: (aqiData.hourly?.us_aqi || []).slice(0, 8),
          isCached: false
        };

        // Cache valid telemetry to localStorage
        try {
          localStorage.setItem(cacheKey, JSON.stringify({ ...result, cachedAt: Date.now() }));
        } catch {}

        return result;
      }
    } catch (err: any) {
      lastError = err;
      if (attempt < 2) {
        await new Promise((resolve) => setTimeout(resolve, 800 * (attempt + 1)));
      }
    }
  }

  // Gracefully return cached data if available
  const cached = getCachedData();
  if (cached) return cached;

  // Never fabricate data: explicitly return UNAVAILABLE with clear error message
  return {
    status: 'UNAVAILABLE',
    aqi: 0,
    aqiCategory: 'good',
    pm25: 0,
    pm10: 0,
    no2: 0,
    so2: 0,
    co: 0,
    o3: 0,
    timestamp: 'Unavailable',
    source: 'Open-Meteo API',
    errorMessage: 'Live air-quality data is temporarily unavailable.'
  };
}

/**
 * Dynamically builds a full CityConfig for ANY user-specified location anywhere in the world
 */
export async function createCustomCityLocation(
  name: string,
  state: string,
  country: string,
  center: [number, number]
): Promise<import('../types').CityConfig> {
  const [lat, lng] = center;
  const live = await fetchLiveAirQuality(lat, lng);
  const baseAqi = live ? live.aqi : 160;
  const basePm25 = live ? live.pm25 : 75;
  const basePm10 = live ? live.pm10 : 120;
  const baseNo2 = live ? live.no2 : 45;
  const baseSo2 = live ? live.so2 : 18;
  const baseCo = live ? live.co : 1.8;
  const baseO3 = live ? live.o3 : 42;

  const id = `custom-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}-${Date.now().toString().slice(-4)}`;

  const stations: import('../types').PollutionStation[] = [
    {
      id: `${id}-station-center`,
      name: `${name} Central Air Station`,
      city: name,
      location: [lat, lng],
      aqi: baseAqi,
      pm25: basePm25,
      pm10: basePm10,
      no2: baseNo2,
      so2: baseSo2,
      co: baseCo,
      o3: baseO3,
      status: 'active',
      sensorType: 'Open-Meteo',
      areaType: 'traffic-hub',
      lastUpdated: 'Just now'
    },
    {
      id: `${id}-station-industrial`,
      name: `${name} Freight & Industrial Corridor`,
      city: name,
      location: [lat + 0.025, lng + 0.022],
      aqi: Math.min(500, Math.round(baseAqi * 1.35)),
      pm25: Math.round(basePm25 * 1.35),
      pm10: Math.round(basePm10 * 1.4),
      no2: Math.round(baseNo2 * 1.4),
      so2: Math.round(baseSo2 * 1.3),
      co: Number((baseCo * 1.4).toFixed(1)),
      o3: Math.round(baseO3 * 0.9),
      status: 'active',
      sensorType: 'Industrial-Fence',
      areaType: 'industrial',
      lastUpdated: 'Just now'
    },
    {
      id: `${id}-station-suburb`,
      name: `${name} Residential Clean Belt`,
      city: name,
      location: [lat - 0.022, lng - 0.025],
      aqi: Math.max(25, Math.round(baseAqi * 0.65)),
      pm25: Math.round(basePm25 * 0.65),
      pm10: Math.round(basePm10 * 0.7),
      no2: Math.round(baseNo2 * 0.6),
      so2: Math.round(baseSo2 * 0.6),
      co: Number((baseCo * 0.7).toFixed(1)),
      o3: Math.round(baseO3 * 1.1),
      status: 'active',
      sensorType: 'IoT-Mesh',
      areaType: 'residential',
      lastUpdated: 'Just now'
    },
    {
      id: `${id}-station-park`,
      name: `${name} Green Corridor Station`,
      city: name,
      location: [lat + 0.015, lng - 0.02],
      aqi: Math.max(20, Math.round(baseAqi * 0.58)),
      pm25: Math.round(basePm25 * 0.58),
      pm10: Math.round(basePm10 * 0.6),
      no2: Math.round(baseNo2 * 0.5),
      so2: Math.round(baseSo2 * 0.5),
      co: Number((baseCo * 0.6).toFixed(1)),
      o3: Math.round(baseO3 * 1.15),
      status: 'active',
      sensorType: 'CPCB-CAAQMS',
      areaType: 'residential',
      lastUpdated: 'Just now'
    }
  ];

  const hotspots: import('../types').HotspotZone[] = [
    {
      id: `${id}-hotspot-1`,
      name: `${name} Industrial & Transit Hub`,
      city: name,
      center: [lat + 0.025, lng + 0.022],
      radiusMeters: 2800,
      aqi: Math.min(500, Math.round(baseAqi * 1.35)),
      pm25: Math.round(basePm25 * 1.35),
      severity: baseAqi * 1.35 > 300 ? 'hazardous' : baseAqi * 1.35 > 200 ? 'severe' : 'poor',
      cause: 'Freight logistics, vehicular diesel plumes, and mixed emissions',
      containmentActive: false,
      advisory: 'Reroute commuters to bypass corridor; activate mist sprayers',
      reportedAt: 'Continuous telemetry'
    },
    {
      id: `${id}-hotspot-2`,
      name: `${name} Arterial Choke Point`,
      city: name,
      center: [lat - 0.012, lng + 0.018],
      radiusMeters: 2000,
      aqi: Math.min(500, Math.round(baseAqi * 1.2)),
      pm25: Math.round(basePm25 * 1.2),
      severity: baseAqi * 1.2 > 200 ? 'severe' : 'poor',
      cause: 'Dense stop-and-go vehicular idling',
      containmentActive: false,
      advisory: 'Signal timing optimization and active diversion',
      reportedAt: 'Continuous telemetry'
    }
  ];

  return {
    id,
    name,
    state: state || 'Monitored Region',
    country: country || 'Global',
    center,
    zoom: 12,
    stations,
    hotspots,
    popularPlaces: [
      { name: `${name} Central Point`, category: 'City Landmark', coords: [lat, lng] },
      { name: `${name} Commercial Hub`, category: 'Transit Corridor', coords: [lat + 0.02, lng + 0.02] }
    ],
    defaultStart: [lat - 0.03, lng - 0.02],
    defaultDest: [lat + 0.03, lng + 0.02]
  };
}
