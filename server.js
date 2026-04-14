'use strict';
require('dotenv').config();

const express = require('express');
const http = require('http');
const WebSocket = require('ws');
const session = require('express-session');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const path = require('path');
const { URL } = require('url');

const { initFirebase, getDb } = require('./src/config/firebase');
const FirestoreStore = require('./src/config/sessionStore');
const authRoutes = require('./src/routes/auth');
const adminRoutes = require('./src/routes/admin');
const botRoutes = require('./src/routes/bot');
const userRoutes = require('./src/routes/user');
const { createBotSession } = require('./src/bot/session');
const { botManager } = require('./src/bot/botManager');

const db = initFirebase();
const app = express();
const server = http.createServer(app);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));

const apiLimiter = rateLimit({ windowMs: 15*60*1000, max: 300, message: { error: 'Too many requests.' } });
const authLimiter = rateLimit({ windowMs: 15*60*1000, max: 30, message: { error: 'Too many auth attempts.' } });

app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: false, limit: '10kb' }));

const sessionMiddleware = session({
  store: new FirestoreStore({ db, collection: 'web_sessions', ttl: 86400 }),
  secret: process.env.SESSION_SECRET || 'Sahil804SecretKey2026!!',
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000,
  },
  name: 'sahil804.sid',
});
app.use(sessionMiddleware);
app.use(express.static(path.join(__dirname, 'public')));

const pendingPair = new Map();
app.set('pendingPair', pendingPair);

// ── Public APIs ────────────────────────────────────────────────────────────
app.get('/api/payment-info', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('payment').get();
    const defaults = { jazzcash:'03496049312', easypaisa:'03496049312', monthlyPrice:'500', yearlyPrice:'4000', instructions:'Send payment screenshot to WhatsApp after paying.' };
    res.json(doc.exists ? { ...defaults, ...doc.data() } : defaults);
  } catch { res.json({ jazzcash:'03496049312', easypaisa:'03496049312', monthlyPrice:'500', yearlyPrice:'4000' }); }
});

app.get('/api/announcement', async (req, res) => {
  try {
    const doc = await db.collection('settings').doc('announcement').get();
    res.json(doc.exists && doc.data().text ? { announcement: { title:'📢 Notice', message: doc.data().text } } : { announcement: null });
  } catch { res.json({ announcement: null }); }
});

// ── Routes ─────────────────────────────────────────────────────────────────
app.use('/api/auth',  authLimiter, authRoutes);
app.use('/api/bot',   apiLimiter,  botRoutes);
app.use('/api/user',  apiLimiter,  userRoutes);
app.use('/api/bot',   apiLimiter,  userRoutes);   // dashboard also uses /api/bot/mode, restart, delete
app.use('/api/admin', apiLimiter,  adminRoutes);

app.get('/health', (req, res) => res.json({
  status: 'ok',
  uptime: Math.round(process.uptime()),
  activeBots: botManager.getActiveCount(),
  memory: Math.round(process.memoryUsage().heapUsed/1024/1024) + 'MB',
}));

app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ error: 'Not found.' });
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.use((err, req, res, next) => {
  console.error('Express error:', err.message);
  res.status(500).json({ error: 'Internal server error.' });
});

// ══ WebSocket Server ═══════════════════════════════════════════════════════
const wss = new WebSocket.Server({ server });

wss.on('connection', async (ws, req) => {
  // Inject session
  await new Promise(resolve => {
    sessionMiddleware(req, { end:()=>{}, setHeader:()=>{}, getHeader:()=>{} }, resolve);
  });

  let sessionId;
  try {
    sessionId = new URL(req.url, 'http://localhost').searchParams.get('sessionId');
  } catch {
    ws.send(JSON.stringify({ type:'error', message:'Invalid URL.' }));
    return ws.close();
  }

  if (!sessionId) {
    ws.send(JSON.stringify({ type:'error', message:'No sessionId provided.' }));
    return ws.close();
  }

  console.log(`🔌 WS connected → ${sessionId}`);
  ws.isAlive = true;
  ws.on('pong', () => { ws.isAlive = true; });
  ws.on('message', data => {
    try { const m = JSON.parse(data.toString()); if (m.type==='ping') ws.send(JSON.stringify({ type:'pong' })); } catch {}
  });

  const config = pendingPair.get(sessionId);
  if (!config) {
    ws.send(JSON.stringify({ type:'error', message:'Session not found. Close and try again.' }));
    return ws.close();
  }
  pendingPair.delete(sessionId);

  try {
    await createBotSession({
      sessionId,
      userId: config.userId,
      wsClient: ws,
      mode: config.mode,
      phoneNumber: config.phoneNumber || null,
    });
  } catch (err) {
    console.error('WS bot start error:', err.message);
    ws.send(JSON.stringify({ type:'error', message:'Failed to start bot. Please try again.' }));
    ws.close();
  }

  ws.on('close', () => console.log(`🔌 WS closed → ${sessionId}`));
  ws.on('error', err => console.error(`WS error [${sessionId}]:`, err.message));
});

const heartbeat = setInterval(() => {
  wss.clients.forEach(ws => {
    if (!ws.isAlive) return ws.terminate();
    ws.isAlive = false;
    ws.ping();
  });
}, 30000);
wss.on('close', () => clearInterval(heartbeat));

// ── Start ───────────────────────────────────────────────────────────────────
const PORT = parseInt(process.env.PORT) || 3000;
server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n🤖 SAHIL 804 BOT running on port ${PORT}\n✅ Health: /health\n🔌 WebSocket: ws://0.0.0.0:${PORT}\n`);
});

// ── Graceful Shutdown ────────────────────────────────────────────────────────
async function shutdown(sig) {
  console.log(`\n🛑 ${sig} received — shutting down...`);
  clearInterval(heartbeat);
  await botManager.stopAllBots();
  server.close(() => { console.log('✅ Done.'); process.exit(0); });
  setTimeout(() => process.exit(1), 10000);
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT',  () => shutdown('SIGINT'));
process.on('uncaughtException',  err => console.error('💥 UncaughtException:', err.message));
process.on('unhandledRejection', err => console.error('💥 UnhandledRejection:', err));
