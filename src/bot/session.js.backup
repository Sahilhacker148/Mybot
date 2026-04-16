'use strict';
const path = require('path');
const fs = require('fs');
const {
  default: makeWASocket,
  useMultiFileAuthState,
  DisconnectReason,
  fetchLatestBaileysVersion,
  makeCacheableSignalKeyStore,
  makeInMemoryStore,
  Browsers,
  generateWAMessageFromContent,
  proto,
  WAMessageStubType,
} = require('@whiskeysockets/baileys');
const QRCode = require('qrcode');
const pino = require('pino');
const { getDb } = require('../config/firebase');
const { botManager, generateSessionId } = require('./botManager');
const { handleCommand } = require('./commandHandler');
const { toFancy, F } = require('./utils/fonts');

const AUTH_DIR = path.join(process.cwd(), 'auth_info_baileys');
const OWNER_NUMBER = process.env.OWNER_NUMBER || '923711158307';
const OWNER_NUMBER2 = process.env.OWNER_NUMBER2 || '923496049312';
const CHANNEL_LINK = process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l';

// Ensure auth directory exists
if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

/**
 * Delay utility
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Create a new WhatsApp session with Pair Code
 */
async function createBotSession({ sessionId, userId, wsClient, mode = 'pair', phoneNumber = null }) {
  const sessionDir = path.join(AUTH_DIR, sessionId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version } = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys: makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal: false,
    browser: Browsers.macOS('Chrome'), // Most stable for pair code in 2026
    generateHighQualityLinkPreview: false,
    syncFullHistory: false,
    shouldIgnoreJid: jid => jid.endsWith('@broadcast'),
    connectTimeoutMs: 60000,
    keepAliveIntervalMs: 25000,
    retryRequestDelayMs: 500,
    maxMsgRetryCount: 5,
    fireInitQueries: false,
    getMessage: async () => ({ conversation: '' }),
  });

  // Register in manager
  botManager.registerBot(sessionId, sock, wsClient);

  let pairRequested = false;
  let reconnectTimer = null;

  // ─── Pair Code flow ─────────────────────────────────────────────
  if (mode === 'pair' && phoneNumber) {
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr && mode === 'qr') {
        const qrImage = await QRCode.toDataURL(qr);
        _sendWS(wsClient, { type: 'qr', qr: qrImage });
      }

      if (connection === 'open') {
        await _onConnected(sock, sessionId, userId, wsClient);
        botManager.resetReconnect(sessionId);
        clearTimeout(reconnectTimer);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          const attempts = botManager.getReconnectAttempts(sessionId);
          if (attempts < 10) {
            botManager.incrementReconnect(sessionId);
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000); // exponential backoff
            console.log(`🔄 Reconnecting ${sessionId} in ${delay}ms (attempt ${attempts + 1})`);
            reconnectTimer = setTimeout(() => {
              createBotSession({ sessionId, userId, wsClient, mode, phoneNumber });
            }, delay);
          } else {
            console.log(`❌ Max reconnect attempts for ${sessionId}`);
            _sendWS(wsClient, { type: 'error', message: 'Max reconnect attempts reached. Please redeploy.' });
            botManager.stopBot(sessionId);
          }
        } else {
          console.log(`🔴 Session logged out: ${sessionId}`);
          _sendWS(wsClient, { type: 'disconnected', sessionId });
          botManager.stopBot(sessionId);
        }
      }
    });

    // Wait for WebSocket handshake to stabilize before requesting pair code
    await sleep(3500);

    if (!pairRequested && !sock.authState.creds.registered) {
      pairRequested = true;
      try {
        const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
        const code = await sock.requestPairingCode(cleanPhone);
        _sendWS(wsClient, { type: 'pairCode', code });
        console.log(`📱 Pair code sent for ${sessionId}: ${code}`);
      } catch (err) {
        console.error(`Pair code error for ${sessionId}:`, err.message);
        _sendWS(wsClient, { type: 'error', message: 'Failed to generate pair code. Please try again.' });
      }
    }
  }

  // ─── QR flow ────────────────────────────────────────────────────
  if (mode === 'qr') {
    sock.ev.on('connection.update', async (update) => {
      const { connection, lastDisconnect, qr } = update;

      if (qr) {
        const qrImage = await QRCode.toDataURL(qr);
        _sendWS(wsClient, { type: 'qr', qr: qrImage });
      }

      if (connection === 'open') {
        await _onConnected(sock, sessionId, userId, wsClient);
        botManager.resetReconnect(sessionId);
      }

      if (connection === 'close') {
        const statusCode = lastDisconnect?.error?.output?.statusCode;
        const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

        if (shouldReconnect) {
          const attempts = botManager.getReconnectAttempts(sessionId);
          if (attempts < 10) {
            botManager.incrementReconnect(sessionId);
            const delay = Math.min(1000 * Math.pow(2, attempts), 30000);
            setTimeout(() => {
              createBotSession({ sessionId, userId, wsClient, mode });
            }, delay);
          } else {
            _sendWS(wsClient, { type: 'error', message: 'Max reconnect attempts reached.' });
            botManager.stopBot(sessionId);
          }
        } else {
          _sendWS(wsClient, { type: 'disconnected', sessionId });
          botManager.stopBot(sessionId);
        }
      }
    });
  }

  // ─── Credentials update ─────────────────────────────────────────
  sock.ev.on('creds.update', saveCreds);

  // ─── Messages ───────────────────────────────────────────────────
  sock.ev.on('messages.upsert', async ({ messages, type }) => {
    if (type !== 'notify') return;
    for (const msg of messages) {
      if (!msg.message || msg.key.fromMe) continue;
      try {
        await handleCommand(sock, msg, sessionId);
      } catch (err) {
        console.error('Message handler error:', err.message);
      }
    }
  });

  return sock;
}

/**
 * Called when bot successfully connects
 */
async function _onConnected(sock, sessionId, userId, wsClient) {
  try {
    const botNumber = sock.user?.id?.replace(/:.*@s.whatsapp.net/, '') || '';
    console.log(`✅ Bot connected: ${sessionId} — ${botNumber}`);

    // Send WebSocket success event
    _sendWS(wsClient, { type: 'connected', number: botNumber, sessionId });

    // Save to Firestore
    const db = getDb();
    await db.collection('sessions_bot').doc(sessionId).set({
      sessionId,
      userId,
      whatsappNumber: botNumber,
      status: 'active',
      mode: 'public',
      createdAt: new Date(),
      lastConnected: new Date(),
    }, { merge: true });

    // Update user's bot count
    if (userId && userId !== 'admin') {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const current = userDoc.data().botsCreated || 0;
        await userRef.update({ botsCreated: current + 1 });
      }
    }

    // Send welcome message after 2 seconds
    await sleep(2000);
    const welcomeMsg = `╔═══════════════════════════════╗
║  🤖 ${F.BOT} 𝑹𝑬𝑨𝑫𝒀!   ║
╠═══════════════════════════════╣
║ ✅ Bot deployed on your       ║
║    number successfully!       ║
║                               ║
║ 📋 Type .𝒎𝒆𝒏𝒖 to start       ║
║                               ║
║ 🌐 Mode: PUBLIC               ║
║ Anyone can use your bot       ║
║                               ║
║ 📢 ${CHANNEL_LINK.slice(0,32)}  ║
║                               ║
║ 🔒 For private:               ║
║ Type .𝒑𝒓𝒊𝒗𝒂𝒕𝒆               ║
║                               ║
║ 🔑 Session ID:                ║
║ ${sessionId}              ║
║                               ║
║ 👑 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚:               ║
║ ${F.SAHIL}            ║
╚═══════════════════════════════╝`;

    await sock.sendMessage(sock.user.id, { text: welcomeMsg });

  } catch (err) {
    console.error('onConnected error:', err.message);
  }
}

/**
 * Send to WebSocket client safely
 */
function _sendWS(wsClient, data) {
  if (!wsClient) return; // null wsClient = restart case, skip
  try {
    if (wsClient && wsClient.readyState === 1) {
      wsClient.send(JSON.stringify(data));
    }
  } catch (err) {
    // WebSocket might be closed
  }
}

module.exports = { createBotSession, generateSessionId };
