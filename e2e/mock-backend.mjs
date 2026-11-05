// Minimal in-memory stand-in for the 5dot FastAPI backend (shapes from faikNew/src/services/*.ts).
// Dev/e2e only. Run: node e2e/mock-backend.mjs  (PORT=4010)
import { createServer } from 'node:http';

const PORT = Number(process.env.PORT ?? 4010);
const user = {
  id: 'u_1',
  email: 'demo@5dot.test',
  name: 'Demo User',
  firstName: 'Demo',
  lastName: 'User',
  phoneNumber: null,
  avatarInitials: 'DU',
  avatarColor: '#C0376B',
  plan: 'free',
  modelVersion: 'mock-1',
  scansUsedThisMonth: 3,
  scansLimitThisMonth: 20,
  planResetDate: '2026-12-01T00:00:00Z',
  createdAt: '2026-01-01T00:00:00Z',
};
let n = 0;
const tokens = () => ({ accessToken: `at_${++n}`, refreshToken: `rt_${n}` });
const validAT = new Set();
const validRT = new Set();

function issue() {
  const t = tokens();
  validAT.add(t.accessToken);
  validRT.add(t.refreshToken);
  return t;
}

// ── scans: progress is derived from elapsed time so polling is deterministic ──
const SCAN_MS = Number(process.env.SCAN_MS ?? 4000);
const scans = new Map();
let sn = 0;
function viewScan(sc) {
  const t = Date.now() - sc.t0;
  const pct = Math.min(100, Math.round((t / SCAN_MS) * 100));
  const done = pct >= 100;
  const detections = {};
  const resultData = {};
  const kinds = sc.kinds;
  kinds.forEach((k, i) => {
    const kDone = pct >= Math.min(100, 50 + (i + 1) * (50 / kinds.length));
    detections[k] = {
      requested: true,
      status: kDone || done ? 'complete' : pct > 10 ? 'processing' : 'pending',
    };
    if (done || kDone) resultData[k] = { score: sc.scores[k] ?? 0.82, threshold: 0.5 };
  });
  return {
    requestId: sc.id,
    filename: sc.filename,
    status: done ? 'complete' : 'processing',
    progress: pct,
    detections,
    resultData: Object.keys(resultData).length ? resultData : null,
    errorMessage: null,
    createdAt: new Date(sc.t0).toISOString(),
    completedAt: done ? new Date(sc.t0 + SCAN_MS).toISOString() : null,
    chunks: done
      ? [0, 1, 2].map((i) => ({
          chunkIndex: i,
          segmentStart: i * 5,
          segmentEnd: i * 5 + 5,
          aiAudioScore: 0.3 + i * 0.2,
          aiVideoScore: 0.6 + i * 0.1,
          lipsyncScore: 0.2,
          changesPoints: null,
        }))
      : [],
  };
}
const KIND_FIELDS = {
  detectAiAudio: 'ai_audio',
  detectAiVideo: 'ai_video',
  detectLipsync: 'lipsync',
};

const server = createServer(async (req, res) => {
  // CORS: the browser uploads files straight to the backend (see docs), so mirror the real API's behaviour.
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('access-control-allow-origin', origin);
    res.setHeader('access-control-allow-credentials', 'true');
    res.setHeader('access-control-allow-headers', 'authorization,content-type');
    res.setHeader('access-control-allow-methods', 'DELETE, GET, HEAD, OPTIONS, PATCH, POST, PUT');
  }
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    return res.end();
  }
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString();
  let body = {};
  try {
    body = raw ? JSON.parse(raw) : {};
  } catch {}
  const send = (status, data) => {
    res.writeHead(status, { 'content-type': 'application/json' });
    res.end(data === undefined ? '' : JSON.stringify(data));
  };
  const path = req.url.replace(/^\/v1/, '').split('?')[0];
  const authed = () => validAT.has((req.headers.authorization ?? '').replace('Bearer ', ''));

  if (req.method === 'POST' && path === '/auth/signin') {
    if (body.password === 'wrong')
      return send(401, {
        error: {
          code: 'INVALID_CREDENTIALS',
          message: 'Incorrect email or password.',
          statusCode: 401,
        },
      });
    return send(200, { ...issue(), user });
  }
  if (req.method === 'POST' && path === '/auth/signup')
    return send(200, { message: 'Verification code sent.' });
  if (req.method === 'POST' && path === '/auth/signup/verify') {
    if (body.otp !== '123456') return send(400, { detail: 'Invalid or expired code.' });
    return send(200, { ...issue(), user });
  }
  if (req.method === 'POST' && path === '/auth/forgot-password')
    return send(200, { message: 'Code sent.' });
  if (req.method === 'POST' && path === '/auth/reset-password') {
    if (body.otp !== '123456') return send(400, { detail: 'Invalid or expired code.' });
    return send(200, { message: 'Password updated.' });
  }
  if (req.method === 'POST' && path === '/auth/refresh') {
    if (!validRT.delete(body.refreshToken)) return send(401, { detail: 'Invalid refresh token' });
    return send(200, issue());
  }
  if (req.method === 'POST' && path === '/auth/signout') return send(200, { message: 'ok' });
  if (path === '/users/me' && req.method === 'GET')
    return authed() ? send(200, user) : send(401, { detail: 'Not authenticated' });
  if (path === '/plans')
    return send(200, {
      plans: [
        {
          id: 'free',
          name: 'Free',
          price: 0,
          currency: 'USD',
          billingPeriod: 'forever',
          scansPerMonth: 20,
          features: ['Audio + video AI detection'],
          priorityQueue: false,
          apiAccess: false,
        },
        {
          id: 'pro',
          name: 'Pro',
          price: 9,
          currency: 'USD',
          billingPeriod: 'month',
          scansPerMonth: 500,
          features: ['Lip-sync detection'],
          priorityQueue: true,
          apiAccess: false,
          trialDays: 7,
        },
        {
          id: 'team',
          name: 'Team',
          price: 24,
          currency: 'USD',
          billingPeriod: 'month',
          scansPerMonth: null,
          features: ['Seats'],
          priorityQueue: true,
          apiAccess: true,
          seats: 5,
        },
      ],
    });
  if (path === '/users/me' && req.method === 'PATCH') {
    if (!authed()) return send(401, { detail: 'Not authenticated' });
    Object.assign(user, body);
    return send(200, user);
  }
  if (path === '/users/me' && req.method === 'DELETE')
    return authed() ? send(204) : send(401, { detail: 'Not authenticated' });
  if (path === '/users/me/deactivate' && req.method === 'POST')
    return authed() ? send(204) : send(401, { detail: 'Not authenticated' });
  if (path === '/feedback' && req.method === 'POST')
    return authed()
      ? send(200, { feedbackId: 'f_1', message: 'Thanks' })
      : send(401, { detail: 'Not authenticated' });
  if (path === '/notifications' && req.method === 'GET')
    return send(200, {
      items: [
        {
          id: 'n1',
          template: 'scan_complete_ai',
          title: 'Scan finished',
          body: 'clip.mp4 looks AI-made',
          data: {},
          read: false,
          createdAt: new Date().toISOString(),
        },
      ],
      total: 1,
      unread: 1,
      page: 1,
      limit: 50,
      hasMore: false,
    });
  if (/^\/notifications\/[^/]+\/read$/.test(path) && req.method === 'PATCH')
    return send(200, {
      id: 'n1',
      template: 'scan_complete_ai',
      title: 'Scan finished',
      body: 'x',
      data: {},
      read: true,
      createdAt: new Date().toISOString(),
    });
  if (req.method === 'POST' && path === '/scans') {
    if (!authed()) return send(401, { detail: 'Not authenticated' });
    if (user.scansUsedThisMonth >= (user.scansLimitThisMonth ?? Infinity))
      return send(429, {
        error: {
          code: 'SCAN_LIMIT_REACHED',
          message: 'Monthly scan limit reached.',
          statusCode: 429,
        },
      });
    const kinds = Object.entries(KIND_FIELDS)
      .filter(([f]) => new RegExp(`name="${f}"\\r\\n\\r\\ntrue`).test(raw))
      .map(([, k]) => k);
    const fname = /filename="([^"]+)"/.exec(raw)?.[1];
    const urlv = /name="url"\r\n\r\n([^\r]+)/.exec(raw)?.[1];
    const sc = {
      id: `s_${++sn}`,
      t0: Date.now(),
      kinds: kinds.length ? kinds : ['ai_video'],
      scores: {},
      filename: encodeURIComponent(fname ?? urlv ?? 'upload'),
    };
    scans.set(sc.id, sc);
    user.scansUsedThisMonth++;
    return send(200, viewScan(sc));
  }
  if (path === '/scans/history') {
    const items = [...scans.values()].reverse().map(viewScan);
    return authed()
      ? send(200, { items, total: items.length, limit: 20, offset: 0, hasMore: false })
      : send(401, { detail: 'Not authenticated' });
  }
  if (path === '/scans/trending') return send(200, { items: [] });
  if (path === '/stats/weekly')
    return send(200, {
      totalScans: scans.size,
      flaggedScans: scans.size,
      dailyBreakdown: [0, 1, 0, 2, 0, 0, scans.size].map((n, i) => ({ day: String(i), scans: n })),
    });
  const rep = /^\/scans\/([^/]+)\/report\.pdf$/.exec(path);
  if (rep && scans.has(rep[1])) {
    res.writeHead(200, {
      'content-type': 'application/pdf',
      'content-disposition': 'attachment; filename="report.pdf"',
    });
    return res.end('%PDF-1.4 mock');
  }
  const one = /^\/scans\/([^/]+)$/.exec(path);
  if (one && req.method === 'GET')
    return !authed()
      ? send(401, { detail: 'Not authenticated' })
      : scans.has(one[1])
        ? send(200, viewScan(scans.get(one[1])))
        : send(404, { detail: 'Scan not found' });
  send(404, { detail: 'Not Found' });
});
server.listen(PORT, () => console.log(`mock backend on :${PORT}`));
