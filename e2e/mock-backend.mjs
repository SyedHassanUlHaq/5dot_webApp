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
  scansLimitThisMonth: 50,
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

const server = createServer(async (req, res) => {
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
  if (path === '/plans') return send(200, { plans: [] });
  send(404, { detail: 'Not Found' });
});
server.listen(PORT, () => console.log(`mock backend on :${PORT}`));
