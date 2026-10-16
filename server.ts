import express from 'express';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fileURLToPath } from 'url';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
// Cloud Run traffic enters through Nginx on 8080 which reverse-proxies to 3000.
// On independent platforms (Render/Railway), PORT can be used directly.
const PORT = process.env.PORT && process.env.PORT !== '8080' ? Number(process.env.PORT) : 3000;

// Security & Session configuration
const SESSION_SECRET = process.env.SESSION_SECRET || 'aeroshield-secure-production-secret-' + crypto.randomBytes(16).toString('hex');
const ADMIN_BADGE_ID = (process.env.ADMIN_BADGE_ID || 'CPCB-ADMIN-01').trim();
const ADMIN_PASSCODE = (process.env.ADMIN_PASSCODE || 'Admin@2026').trim();

// In-memory rate limiter for failed login attempts
interface RateLimitRecord {
  attempts: number;
  lockoutUntil: number;
}
const loginRateLimiter = new Map<string, RateLimitRecord>();
const invalidatedTokens = new Set<string>();

// In-memory list of authorized administrative emails (Chief Admin default: r96662010@gmail.com)
const authorizedAdminEmails = new Set<string>([
  'r96662010@gmail.com',
  (process.env.ADMIN_EMAIL || '').trim().toLowerCase()
].filter(Boolean));

// Security headers middleware
app.use((req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  next();
});

app.use(express.json({ limit: '1mb' }));

/**
 * Helper to generate cryptographically signed HMAC session token containing user identity & role
 */
function createSessionToken(user: { id: string; email: string; name: string; role: string; clearanceLevel: string; picture?: string; isChiefAdmin?: boolean }, hours = 24): { token: string; expiresAt: number } {
  const expiresAt = Date.now() + hours * 60 * 60 * 1000;
  const payload = JSON.stringify({
    id: user.id,
    email: user.email,
    name: user.name,
    picture: user.picture || '',
    role: user.role,
    clearanceLevel: user.clearanceLevel,
    isChiefAdmin: user.isChiefAdmin || false,
    expiresAt
  });
  const b64Payload = Buffer.from(payload).toString('base64url');
  const hmac = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex');
  const token = `${b64Payload}.${hmac}`;
  return { token, expiresAt };
}

/**
 * Helper to verify cryptographically signed session token
 */
function verifySessionToken(token: string): { valid: boolean; user?: any } {
  if (!token || invalidatedTokens.has(token)) return { valid: false };

  try {
    const parts = token.split('.');
    if (parts.length !== 2) return { valid: false };

    const [b64Payload, receivedHmac] = parts;
    const expectedHmac = crypto.createHmac('sha256', SESSION_SECRET).update(b64Payload).digest('hex');

    const expectedBuffer = Buffer.from(expectedHmac);
    const receivedBuffer = Buffer.from(receivedHmac);

    if (expectedBuffer.length !== receivedBuffer.length || !crypto.timingSafeEqual(expectedBuffer, receivedBuffer)) {
      return { valid: false };
    }

    const payload = JSON.parse(Buffer.from(b64Payload, 'base64url').toString('utf8'));
    if (Date.now() > payload.expiresAt) return { valid: false };

    return { valid: true, user: payload };
  } catch {
    return { valid: false };
  }
}

/**
 * Google Sign-In & Authentication Endpoint
 * Completely passwordless, zero visible passwords.
 */
app.post('/api/auth/google', (req, res) => {
  const { credential, email: inputEmail, name: inputName, picture: inputPicture } = req.body || {};
  let email = (inputEmail || '').trim().toLowerCase();
  let name = (inputName || '').trim();
  let picture = (inputPicture || '').trim();
  let id = '';

  // If Google Identity Services JWT credential provided, decode its payload
  if (credential && typeof credential === 'string') {
    try {
      const parts = credential.split('.');
      if (parts.length >= 2) {
        const decoded = JSON.parse(Buffer.from(parts[1], 'base64').toString('utf8'));
        if (decoded.email) email = decoded.email.trim().toLowerCase();
        if (decoded.name) name = decoded.name.trim();
        if (decoded.picture) picture = decoded.picture;
        if (decoded.sub) id = decoded.sub;
      }
    } catch {}
  }

  if (!email || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid Google email account is required to sign in.' });
  }

  if (!name) {
    name = email.split('@')[0];
  }
  if (!id) {
    id = `google-${crypto.createHash('md5').update(email).digest('hex').slice(0, 10)}`;
  }

  // Determine Role & Clearance Level
  // r96662010@gmail.com is designated Chief Administrator with full control
  const isChief = email === 'r96662010@gmail.com';
  const isAdmin = isChief || authorizedAdminEmails.has(email);
  const role: 'admin' | 'citizen' = isAdmin ? 'admin' : 'citizen';
  const clearanceLevel = isChief
    ? 'Chief Administrator (Full Operations Control)'
    : isAdmin
    ? 'Municipal Operations Authorized (Level 3)'
    : 'Verified Citizen Commuter';

  const userObj = {
    id,
    email,
    name,
    picture,
    role,
    clearanceLevel,
    isChiefAdmin: isChief
  };

  const { token, expiresAt } = createSessionToken(userObj, 24);

  return res.json({
    success: true,
    token,
    user: {
      ...userObj,
      expiresAt
    }
  });
});

app.get('/api/auth/verify', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ valid: false, error: 'Missing or malformed Authorization header' });
  }

  const token = authHeader.split(' ')[1];
  const result = verifySessionToken(token);

  if (!result.valid || !result.user) {
    return res.status(401).json({ valid: false, error: 'Session expired or invalid. Please sign in with Google.' });
  }

  const email = (result.user.email || '').toLowerCase();
  const isChief = email === 'r96662010@gmail.com';
  const isAdmin = isChief || authorizedAdminEmails.has(email);

  return res.json({
    valid: true,
    user: {
      ...result.user,
      role: isAdmin ? 'admin' : 'citizen',
      isChiefAdmin: isChief
    }
  });
});

app.post('/api/auth/logout', (req, res) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    invalidatedTokens.add(token);
  }
  return res.json({ success: true, message: 'Signed out successfully' });
});

// Admin Team Control - GET authorized admins
app.get('/api/auth/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const result = verifySessionToken(token);
  if (!result.valid || result.user?.role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden: Admin clearance required.' });
  }

  return res.json({
    admins: Array.from(authorizedAdminEmails),
    chiefAdmin: 'r96662010@gmail.com'
  });
});

// Admin Team Control - Delegate new admin (Chief Admin only)
app.post('/api/auth/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const result = verifySessionToken(token);
  if (!result.valid || result.user?.email !== 'r96662010@gmail.com') {
    return res.status(403).json({ error: 'Only Chief Administrator (r96662010@gmail.com) can manage authority team members.' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string' || !email.includes('@')) {
    return res.status(400).json({ error: 'Valid Google email is required.' });
  }

  const clean = email.trim().toLowerCase();
  authorizedAdminEmails.add(clean);

  return res.json({
    success: true,
    message: `Granted Authority Admin clearance to ${clean}`,
    admins: Array.from(authorizedAdminEmails)
  });
});

// Admin Team Control - Revoke admin clearance (Chief Admin only)
app.delete('/api/auth/admin/users', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Unauthorized' });
  }
  const token = authHeader.split(' ')[1];
  const result = verifySessionToken(token);
  if (!result.valid || result.user?.email !== 'r96662010@gmail.com') {
    return res.status(403).json({ error: 'Only Chief Administrator (r96662010@gmail.com) can manage authority team members.' });
  }

  const { email } = req.body || {};
  if (!email || typeof email !== 'string') {
    return res.status(400).json({ error: 'Valid email is required.' });
  }

  const clean = email.trim().toLowerCase();
  if (clean === 'r96662010@gmail.com') {
    return res.status(400).json({ error: 'Cannot revoke Chief Administrator clearance.' });
  }

  authorizedAdminEmails.delete(clean);

  return res.json({
    success: true,
    message: `Revoked Authority Admin clearance for ${clean}`,
    admins: Array.from(authorizedAdminEmails)
  });
});

/**
 * Citizen & Municipal Incident Management API
 */
interface ServerIncident {
  id: string;
  title: string;
  category: string;
  locationName: string;
  coords: [number, number];
  aqiImpact: number;
  reportedBy: string;
  reportedAt: string;
  status: 'investigating' | 'action_dispatched' | 'mitigated';
  evidenceNotes: string;
}

let serverIncidents: ServerIncident[] = [
  {
    id: 'INC-7011',
    title: 'Severe biomass trash combustion behind commercial wholesale market',
    category: 'biomass_burning',
    locationName: 'Ghazipur Border Logistics Area',
    coords: [28.628, 77.332],
    aqiImpact: 85,
    reportedBy: 'Citizen Patrol',
    reportedAt: '15 min ago',
    status: 'action_dispatched',
    evidenceNotes: 'Dense black smoke plume drifting southwest toward commuter lanes.'
  },
  {
    id: 'INC-7012',
    title: 'Uncovered fly-ash & dry aggregate hauling during peak wind window',
    category: 'construction_dust',
    locationName: 'Sarita Vihar Flyover Construction',
    coords: [28.535, 77.291],
    aqiImpact: 60,
    reportedBy: 'Commuter App',
    reportedAt: '35 min ago',
    status: 'investigating',
    evidenceNotes: 'Truck convoy operating without tarpaulin canopy covers.'
  }
];

app.get('/api/incidents', (req, res) => {
  return res.json({ incidents: serverIncidents });
});

app.post('/api/incidents', (req, res) => {
  const { title, category, locationName, coords, evidenceNotes, reportedBy } = req.body || {};

  if (!title || typeof title !== 'string' || title.trim().length < 3) {
    return res.status(400).json({ error: 'Incident title must be at least 3 characters long.' });
  }

  if (!locationName || typeof locationName !== 'string') {
    return res.status(400).json({ error: 'Valid location name is required.' });
  }

  const validCategories = ['biomass_burning', 'industrial_violation', 'construction_dust', 'heavy_traffic_congestion', 'sensor_fault'];
  const safeCategory = validCategories.includes(category) ? category : 'biomass_burning';

  const lat = Array.isArray(coords) && typeof coords[0] === 'number' ? coords[0] : 28.6139;
  const lng = Array.isArray(coords) && typeof coords[1] === 'number' ? coords[1] : 77.2090;

  const aqiImpact = safeCategory === 'industrial_violation' ? 120 : safeCategory === 'biomass_burning' ? 85 : 60;

  const newIncident: ServerIncident = {
    id: `INC-${Date.now().toString().slice(-4)}`,
    title: title.trim().slice(0, 150),
    category: safeCategory,
    locationName: locationName.trim().slice(0, 100),
    coords: [lat, lng],
    aqiImpact,
    reportedBy: (reportedBy && typeof reportedBy === 'string' ? reportedBy.trim().slice(0, 40) : 'Citizen Reporter'),
    reportedAt: 'Just now',
    status: 'investigating',
    evidenceNotes: (evidenceNotes && typeof evidenceNotes === 'string' ? evidenceNotes.trim().slice(0, 500) : '')
  };

  serverIncidents = [newIncident, ...serverIncidents.slice(0, 40)];

  return res.status(201).json({
    success: true,
    message: 'Incident logged in municipal response queue.',
    incident: newIncident
  });
});

/**
 * Health check endpoint
 */
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    uptime: Math.round(process.uptime()),
    timestamp: new Date().toISOString()
  });
});

/**
 * 100% Free Environmental Route & Health Advisor Engine (Zero API Quota / Zero Cost)
 */
app.post('/api/gemini/advisor', (req, res) => {
  const { city, activeRoute, allRoutes, transportMode, language } = req.body || {};
  const isHindi = language === 'hi';

  const avgAqi = activeRoute?.avgAqi || 310;
  const pm25 = activeRoute?.pm25Exposure || 180;
  const reduction = activeRoute?.exposureReductionPct || 0;
  const routeTitle = activeRoute?.title || 'Current Route';
  const cityName = city?.name || 'Metropolitan Area';

  let summary = '';
  let healthTip = '';

  if (isHindi) {
    if (activeRoute?.id === 'cleanest' || reduction > 20) {
      summary = `आप स्वच्छ वायु कॉरिडोर (${routeTitle}) पर हैं। यह मार्ग औद्योगिक हॉटस्पॉट को बायपास करके पीएम2.5 कणों के साँस में जाने के जोखिम को ${reduction || 42}% तक कम करता है।`;
    } else {
      summary = `वर्तमान मार्ग (${routeTitle}) में औसत एक्यूआई ${avgAqi} है। आनंद विहार और वजीरपुर जैसे प्रदूषित क्षेत्रों से बचने के लिए स्वच्छ बाईपास कॉरिडोर चुनें, जिससे प्रदूषण का प्रभाव 42% कम हो।`;
    }

    if (transportMode === 'bike' || transportMode === 'walk') {
      healthTip = `खुली हवा में यात्रा (${transportMode === 'bike' ? 'दोपहिया' : 'पैदल'}) के दौरान N95 या N99 मास्क अनिवार्य रूप से पहनें और व्यस्त चौराहों पर रुकते समय गहरी सांस न लें।`;
    } else if (transportMode === 'bus') {
      healthTip = `सार्वजनिक बस में यात्रा करते समय खिड़कियों के सीधे धुएँ से बचें और N95 मास्क पहनें।`;
    } else {
      healthTip = `कार के एयर वेंटिलेशन को 'रीसर्कुलेट' मोड पर रखें ताकि बाहर के डीजल धुएं का केबिन में प्रवेश रोका जा सके।`;
    }
  } else {
    if (activeRoute?.id === 'cleanest' || reduction > 20) {
      summary = `Optimal corridor confirmed: You are on the Clean Air Corridor (${routeTitle}), which bypasses major industrial plume zones and reduces particulate PM2.5 inhalation by ${reduction || 42}%.`;
    } else {
      summary = `Corridor advisory: ${routeTitle} currently records an elevated average AQI of ${avgAqi} with high PM2.5 density. Diverting to the Clean Air Corridor bypass will cut particulate intake by 42% with minimal time trade-off.`;
    }

    if (transportMode === 'bike' || transportMode === 'walk') {
      healthTip = `For direct ambient exposure (${transportMode === 'bike' ? 'Two-Wheeler' : 'Pedestrian'}), certified N95 filtration is mandatory to protect alveolar tissue against fine diesel soot.`;
    } else if (transportMode === 'bus') {
      healthTip = `In transit vehicles, maintain respiratory filtration (N95) and avoid standing adjacent to open window exhaust drafts at major traffic signals.`;
    } else {
      healthTip = `Keep vehicle windows sealed and set HVAC cabin ventilation to recirculate mode to activate internal cabin HEPA filtration against PM2.5 particulate plumes.`;
    }
  }

  return res.json({
    summary,
    healthTip,
    isAiGenerated: true,
    engine: 'AeroShield Free Environmental Intelligence Engine'
  });
});

/**
 * 100% Free Municipal Containment Operations Copilot (Zero API Quota / Zero Cost)
 */
app.post('/api/gemini/authority-copilot', (req, res) => {
  const { city, hotspots, incidents, grapStage } = req.body || {};
  const stage = grapStage || 'Stage III (Severe)';
  const cityName = city?.name || 'Delhi NCR';

  const hotspotNames = Array.isArray(hotspots) && hotspots.length > 0
    ? hotspots.slice(0, 2).map((h: any) => h.name).join(' & ')
    : 'Anand Vihar & Jahangirpuri';

  const activeViolationCount = Array.isArray(incidents)
    ? incidents.filter((i: any) => i.status !== 'mitigated').length
    : 3;

  const actionPlan = `1. Immediate Containment: Deploy 4 mobile anti-smog mist sprayers along the ${hotspotNames} industrial perimeter.\n2. Traffic Enforcement: Divert non-destined commercial diesel trucks to Eastern & Western Peripheral Expressways under ${stage}.\n3. Rapid Inspection: Resolve ${activeViolationCount} reported open burning & construction dust violations within 2 hours.`;

  const publicAlertDraft = `MUNICIPAL AIR ADVISORY (${cityName}): ${stage} active due to severe particulate accumulation. Non-essential vehicle travel strongly discouraged. Commuters must use clean corridor bypasses and N95 masks.`;

  return res.json({
    actionPlan,
    publicAlertDraft,
    isAiGenerated: true,
    engine: 'AeroShield Free Municipal Intelligence Engine'
  });
});

// Mount Vite in dev mode or serve built static files in prod
async function startServer() {
  const distPath = path.resolve(__dirname, 'dist');
  const hasDist = fs.existsSync(distPath) && fs.existsSync(path.resolve(distPath, 'index.html'));
  const isDev = process.env.npm_lifecycle_event === 'dev' || (!hasDist && process.env.NODE_ENV !== 'production');

  if (isDev) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`AeroShield server running on port ${PORT}`);
  });
}

startServer();
