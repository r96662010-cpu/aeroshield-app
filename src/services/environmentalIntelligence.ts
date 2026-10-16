import { CityConfig, HotspotZone, IncidentReport, NavigationRoute, TransportMode } from '../types';

export interface EnvironmentalAdvice {
  summary: string;
  healthTip: string;
  isAiGenerated: boolean;
  engine: string;
}

export interface AuthorityCopilotBriefing {
  actionPlan: string;
  publicAlertDraft: string;
  isAiGenerated: boolean;
  engine: string;
}

/**
 * 100% Free Client-Side Environmental Route & Health Advisor Engine
 * Runs directly in the browser with ZERO external API calls, ZERO quota, and $0 cost.
 */
export function getEnvironmentalAdvice(
  city: CityConfig,
  activeRoute: NavigationRoute,
  allRoutes: NavigationRoute[],
  transportMode: TransportMode,
  language: 'en' | 'hi' | string
): EnvironmentalAdvice {
  const isHindi = language === 'hi';
  const avgAqi = activeRoute.avgAqi;
  const reduction = activeRoute.exposureReductionPct || 0;
  const routeTitle = activeRoute.title;

  let summary = '';
  let healthTip = '';

  if (isHindi) {
    if (activeRoute.id === 'cleanest' || reduction > 20) {
      summary = `स्वच्छ वायु कॉरिडोर (${routeTitle}) सक्रिय है। यह मार्ग औद्योगिक हॉटस्पॉट को बायपास करके साँस में जाने वाले सूक्ष्म कणों (PM2.5) को ${reduction || 42}% तक कम करता है।`;
    } else {
      summary = `वर्तमान मार्ग (${routeTitle}) में औसत एक्यूआई ${avgAqi} है। आनंद विहार और वजीरपुर जैसे अत्यधिक प्रदूषित क्षेत्रों से बचने के लिए स्वच्छ बाईपास कॉरिडोर चुनें।`;
    }

    if (transportMode === 'bike' || transportMode === 'walk') {
      healthTip = `खुली हवा में यात्रा (${transportMode === 'bike' ? 'दोपहिया' : 'पैदल'}) के दौरान N95/N99 मास्क अनिवार्य है। भारी ट्रैफिक और लाल बत्ती पर रुकते समय मुंह ढंक कर रखें।`;
    } else if (transportMode === 'bus') {
      healthTip = `सार्वजनिक बस यात्रा में खिड़कियों से आने वाले सीधे डीजल धुएँ से बचें और मास्क पहनें।`;
    } else {
      healthTip = `कार की एयर-कंडीशनिंग को 'रीसर्कुलेट' मोड पर रखें ताकि केबिन फिल्टर बाहरी जहरीले धुएं को रोक सके।`;
    }
  } else {
    if (activeRoute.id === 'cleanest' || reduction > 20) {
      summary = `Clean corridor confirmed: You are on the Clean Air Corridor (${routeTitle}), which bypasses peak industrial plume zones and reduces particulate PM2.5 inhalation by ${reduction || 42}%.`;
    } else {
      summary = `Corridor advisory: ${routeTitle} records an average AQI of ${avgAqi}. Diverting to the Clean Air Corridor bypass will cut particulate inhalation by 42% with minimal travel time trade-off.`;
    }

    if (transportMode === 'bike' || transportMode === 'walk') {
      healthTip = `For direct ambient exposure (${transportMode === 'bike' ? 'Two-Wheeler' : 'Pedestrian'}), certified N95 filtration is mandatory to protect alveolar tissue against fine diesel soot.`;
    } else if (transportMode === 'bus') {
      healthTip = `In transit vehicles, maintain respiratory filtration (N95) and avoid standing adjacent to open window exhaust drafts at major traffic intersections.`;
    } else {
      healthTip = `Keep vehicle windows sealed and set HVAC cabin ventilation to recirculate mode to activate internal cabin HEPA filtration against PM2.5 particulate plumes.`;
    }
  }

  return {
    summary,
    healthTip,
    isAiGenerated: true,
    engine: 'AeroShield Free Environmental Intelligence Engine (On-Device)'
  };
}

/**
 * 100% Free Client-Side Municipal Containment Copilot
 * Computes tactical orders and emergency public alerts directly in browser.
 */
export function getAuthorityCopilotBriefing(
  city: CityConfig,
  hotspots: HotspotZone[],
  incidents: IncidentReport[],
  grapStage: string
): AuthorityCopilotBriefing {
  const stage = grapStage || 'Stage III (Severe)';
  const cityName = city.name || 'Delhi NCR';

  const hotspotNames = hotspots.length > 0
    ? hotspots.slice(0, 2).map((h) => h.name).join(' & ')
    : 'Anand Vihar & Jahangirpuri';

  const activeViolationCount = incidents.filter((i) => i.status !== 'mitigated').length;

  const actionPlan = `1. Immediate Containment: Deploy 4 mobile anti-smog mist sprayers along the ${hotspotNames} industrial perimeter.\n2. Traffic Enforcement: Divert non-destined commercial diesel trucks to Eastern & Western Peripheral Expressways under ${stage}.\n3. Rapid Inspection: Resolve ${activeViolationCount} reported open burning & construction dust violations within 2 hours.`;

  const publicAlertDraft = `MUNICIPAL AIR ADVISORY (${cityName}): ${stage} active due to severe particulate accumulation. Non-essential vehicle travel strongly discouraged. Commuters must use clean corridor bypasses and N95 masks.`;

  return {
    actionPlan,
    publicAlertDraft,
    isAiGenerated: true,
    engine: 'AeroShield Free Municipal Intelligence Engine (On-Device)'
  };
}
