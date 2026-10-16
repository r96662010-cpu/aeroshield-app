import { NavigationRoute, RouteStrategy, HotspotZone, RouteSegment, BypassAlert, TransportMode, HealthScore } from '../types';

/**
 * Calculates distance in kilometers between two geographic coordinates
 */
export function getDistanceKm(coord1: [number, number], coord2: [number, number]): number {
  const [lat1, lon1] = coord1;
  const [lat2, lon2] = coord2;
  const R = 6371; // Earth radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Compute local pollution AQI at a given coordinate based on distance to known hotspots
 */
export function estimateLocalAQI(coord: [number, number], hotspots: HotspotZone[], baseCityAqi: number = 180): number {
  let highestAqi = baseCityAqi;

  for (const spot of hotspots) {
    const distKm = getDistanceKm(coord, spot.center);
    const radiusKm = spot.radiusMeters / 1000;

    if (distKm <= radiusKm) {
      // Inside hotspot core
      const influence = 1 - (distKm / (radiusKm * 1.2));
      const local = spot.aqi * 0.7 + spot.aqi * 0.3 * Math.max(0.2, influence);
      if (local > highestAqi) highestAqi = local;
    } else if (distKm <= radiusKm * 2.5) {
      // Buffer dispersion zone
      const decay = 1 - (distKm - radiusKm) / (radiusKm * 1.5);
      const elevated = baseCityAqi + (spot.aqi - baseCityAqi) * decay * 0.6;
      if (elevated > highestAqi) highestAqi = elevated;
    }
  }

  return Math.min(500, Math.round(highestAqi));
}

/**
 * Generates intermediate polyline waypoints between start and end
 */
function generateWaypoints(
  start: [number, number],
  end: [number, number],
  strategy: RouteStrategy,
  hotspots: HotspotZone[]
): [number, number][] {
  const steps = 18;
  const points: [number, number][] = [];
  const [lat1, lng1] = start;
  const [lat2, lng2] = end;

  // Midpoint
  const midLat = (lat1 + lat2) / 2;
  const midLng = (lng1 + lng2) / 2;

  // Direction vector & perpendicular normal vector
  const dLat = lat2 - lat1;
  const dLng = lng2 - lng1;
  const len = Math.sqrt(dLat * dLat + dLng * dLng) || 0.001;
  const normLat = -dLng / len;
  const normLng = dLat / len;

  // Determine which side of the line has less hotspot pressure
  let northOffsetPressure = 0;
  let southOffsetPressure = 0;
  for (const h of hotspots) {
    const distN = getDistanceKm([midLat + normLat * 0.04, midLng + normLng * 0.04], h.center);
    const distS = getDistanceKm([midLat - normLat * 0.04, midLng - normLng * 0.04], h.center);
    northOffsetPressure += 1 / Math.max(0.5, distN);
    southOffsetPressure += 1 / Math.max(0.5, distS);
  }
  const cleanDirection = northOffsetPressure > southOffsetPressure ? -1 : 1;

  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    // Straight interpolation
    let lat = lat1 + t * (lat2 - lat1);
    let lng = lng1 + t * (lng2 - lng1);

    // Parabolic arc for alternate corridors
    const arc = Math.sin(t * Math.PI);

    if (strategy === 'fastest') {
      // Minor road wobble, follows most direct highway
      const wobble = Math.sin(t * Math.PI * 3) * 0.003;
      lat += normLat * wobble;
      lng += normLng * wobble;
    } else if (strategy === 'cleanest') {
      // Significant bypass around the center hotspot area
      const offsetMagnitude = 0.038 * cleanDirection;
      lat += normLat * arc * offsetMagnitude;
      lng += normLng * arc * offsetMagnitude;
    } else {
      // Balanced: modest detour
      const offsetMagnitude = 0.02 * cleanDirection;
      lat += normLat * arc * offsetMagnitude;
      lng += normLng * arc * offsetMagnitude;
    }

    points.push([lat, lng]);
  }

  return points;
}

/**
 * Calculates 3 multi-criteria navigation routes with pollution exposure quantification
 */
export function calculatePollutionAwareRoutes(
  start: [number, number],
  end: [number, number],
  hotspots: HotspotZone[],
  baseCityAqi: number = 190,
  mode: TransportMode = 'car'
): NavigationRoute[] {
  const directDist = getDistanceKm(start, end);
  const strategies: RouteStrategy[] = ['fastest', 'cleanest', 'balanced'];

  const results: NavigationRoute[] = strategies.map((strategy) => {
    const coordinates = generateWaypoints(start, end, strategy, hotspots);

    // Build segments and measure AQI along route
    const segments: RouteSegment[] = [];
    let totalAqi = 0;
    let maxAqi = 0;
    const intersectedHotspotNames = new Set<string>();

    for (let i = 0; i < coordinates.length - 1; i++) {
      const p1 = coordinates[i];
      const p2 = coordinates[i + 1];
      const midPoint: [number, number] = [(p1[0] + p2[0]) / 2, (p1[1] + p2[1]) / 2];
      const segmentDist = getDistanceKm(p1, p2);
      const segAqi = estimateLocalAQI(midPoint, hotspots, baseCityAqi);

      // Check which hotspots this segment is near
      for (const h of hotspots) {
        if (getDistanceKm(midPoint, h.center) <= (h.radiusMeters / 1000) * 1.3) {
          intersectedHotspotNames.add(h.name);
        }
      }

      totalAqi += segAqi;
      if (segAqi > maxAqi) maxAqi = segAqi;

      segments.push({
        coordinates: [p1, p2],
        aqi: segAqi,
        condition: segAqi > 300 ? 'Hazardous Air Pocket' : segAqi > 200 ? 'Congested Smog Zone' : 'Clear Air Corridor',
        distanceKm: Number(segmentDist.toFixed(2))
      });
    }

    const avgAqi = Math.round(totalAqi / Math.max(1, coordinates.length - 1));

    // Distance and timing calculation based on transport mode
    let distMultiplier = 1.05;
    let speedKmh = 32;
    let exposureMultiplier = 0.6; // car baseline

    if (mode === 'car') {
      if (strategy === 'fastest') {
        distMultiplier = 1.08;
        speedKmh = 34;
      } else if (strategy === 'cleanest') {
        distMultiplier = 1.28;
        speedKmh = 44;
      } else {
        distMultiplier = 1.15;
        speedKmh = 38;
      }
      exposureMultiplier = 0.55;
    } else if (mode === 'bike') {
      if (strategy === 'fastest') {
        distMultiplier = 1.06;
        speedKmh = 20;
      } else if (strategy === 'cleanest') {
        distMultiplier = 1.22;
        speedKmh = 24;
      } else {
        distMultiplier = 1.12;
        speedKmh = 22;
      }
      exposureMultiplier = 1.45; // open air + heavy breathing
    } else if (mode === 'bus') {
      if (strategy === 'fastest') {
        distMultiplier = 1.10;
        speedKmh = 22;
      } else if (strategy === 'cleanest') {
        distMultiplier = 1.26;
        speedKmh = 26;
      } else {
        distMultiplier = 1.16;
        speedKmh = 24;
      }
      exposureMultiplier = 0.85;
    } else {
      // walk
      if (strategy === 'fastest') {
        distMultiplier = 1.04;
        speedKmh = 4.8;
      } else if (strategy === 'cleanest') {
        distMultiplier = 1.18;
        speedKmh = 5.2;
      } else {
        distMultiplier = 1.10;
        speedKmh = 5.0;
      }
      exposureMultiplier = 1.75;
    }

    const distanceKm = Number((directDist * distMultiplier).toFixed(1));
    const durationMinutes = Math.max(3, Math.round((distanceKm / speedKmh) * 60));

    // Estimated total PM2.5 inhaled (micrograms):
    // Inhalation rate ~ 0.8 m3/hour * (durationMinutes / 60) * estimated PM2.5 ug/m3 * exposureMultiplier
    const pm25UgM3 = avgAqi * 0.65;
    const hours = durationMinutes / 60;
    const pm25Exposure = Math.max(4, Math.round(0.8 * hours * pm25UgM3 * exposureMultiplier));

    // Calculate Health Score
    let healthScore: HealthScore = 'Moderate';
    if (avgAqi < 150) {
      healthScore = 'Excellent';
    } else if (avgAqi > 260) {
      healthScore = 'Risky';
    }

    let title = 'Fastest Direct Route';
    let subtitle = 'Direct arterial corridor (passes heavy traffic choke points)';
    let isRecommended = false;
    let summary = 'Standard urban path with highest exposure to vehicle plumes.';
    let healthAdvisory = mode === 'bike' || mode === 'walk'
      ? 'High open-air exposure. N95 respirator strongly advised.'
      : 'Roll up windows; switch AC to internal recirculation. N95 mask advised.';

    if (strategy === 'cleanest') {
      title = 'Clean Air Corridor (Bypass)';
      subtitle = 'Outer perimeter bypass avoiding heavy industrial hotspots';
      isRecommended = true;
      summary = 'Bypasses severe emission hotspots along outer green belts and wide expressways.';
      healthAdvisory = 'Significantly lower particulate concentration. Recommended for all commuters.';
    } else if (strategy === 'balanced') {
      title = 'Balanced Smart Route';
      subtitle = 'Optimal trade-off between travel time and air quality';
      isRecommended = false;
      summary = 'Bypasses the worst hot pocket with only a marginal travel delay.';
      healthAdvisory = 'Moderate exposure. Good balance for daily commuting.';
    }

    return {
      id: strategy,
      title,
      subtitle,
      distanceKm,
      durationMinutes,
      avgAqi,
      maxAqi,
      pm25Exposure,
      intersectsHotspots: Array.from(intersectedHotspotNames),
      coordinates,
      segments,
      isRecommended,
      healthScore,
      healthAdvisory,
      summary
    };
  });

  // Calculate relative metrics compared to fastest route
  const fastest = results.find((r) => r.id === 'fastest') || results[0];

  return results.map((route) => {
    const timeDeltaMin = route.durationMinutes - fastest.durationMinutes;
    const exposureReductionPct =
      fastest.pm25Exposure > 0
        ? Math.round(((fastest.pm25Exposure - route.pm25Exposure) / fastest.pm25Exposure) * 100)
        : 0;

    return {
      ...route,
      timeDeltaMin,
      exposureReductionPct: exposureReductionPct > 0 ? exposureReductionPct : 0
    };
  });
}

/**
 * Checks if current GPS position is heading toward a high pollution hotspot
 */
export function checkUpcomingBypassAlert(
  currentPos: [number, number],
  activeRoute: NavigationRoute,
  hotspots: HotspotZone[]
): BypassAlert | null {
  for (const spot of hotspots) {
    if (spot.aqi < 300) continue; // Only alert for Severe or Hazardous zones

    const distKm = getDistanceKm(currentPos, spot.center);
    const distMeters = Math.round(distKm * 1000);

    // If within 3.2km and user is currently on fastest/direct route
    if (distMeters <= 3200 && distMeters > 300 && activeRoute.id === 'fastest') {
      return {
        id: `alert-${spot.id}-${Date.now()}`,
        hotspotName: spot.name,
        hotspotCoords: spot.center,
        distanceMeters: distMeters,
        hotspotAqi: spot.aqi,
        cause: spot.cause,
        timePenaltyMin: 7,
        exposureReductionPct: 42,
        alternateRouteId: 'cleanest',
        timestamp: 'Just now'
      };
    }
  }

  return null;
}
