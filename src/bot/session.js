'use strict';
const path = require('path');
const fs   = require('fs');
const QRCode = require('qrcode');
const pino   = require('pino');
const { getDb }               = require('../config/firebase');
const { botManager, generateSessionId } = require('./botManager');
const { handleCommand }       = require('./commandHandler');
const { toFancy, F }          = require('./utils/fonts');

const AUTH_DIR       = path.join(process.cwd(), 'auth_info_baileys');
const OWNER_NUMBER   = process.env.OWNER_NUMBER  || '923711158307';
const OWNER_NUMBER2  = process.env.OWNER_NUMBER2 || '923496049312';
const CHANNEL_LINK   = process.env.CHANNEL_LINK  || 'https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l';

if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

let _baileysCache = null;

async function _getBaileys() {
  if (_baileysCache) return _baileysCache;
  const baileys = await import('@whiskeysockets/baileys');
  _baileysCache = {
    makeWASocket:                baileys.default,
    useMultiFileAuthState:       baileys.useMultiFileAuthState,
    DisconnectReason:            baileys.DisconnectReason,
    fetchLatestBaileysVersion:   baileys.fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore: baileys.makeCacheableSignalKeyStore,
    Browsers:                    baileys.Browsers,
    proto:                       baileys.proto,
  };
  return _baileysCache;
}

const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function createBotSession({ sessionId, userId, wsClient, mode = 'pair', phoneNumber = null }) {
  const {
    makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers,
  } = await _getBaileys();

  const sessionDir = path.join(AUTH_DIR, sessionId);
  if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });

  const { state, saveCreds } = await useMultiFileAuthState(sessionDir);
  const { version }          = await fetchLatestBaileysVersion();

  const logger = pino({ level: 'silent' });

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal:              false,
    // FIX 1: ubuntu browser required for pair code — macOS causes "Couldn't link device"
    browser:                        Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    syncFullHistory:                false,
    shouldIgnoreJid:                jid => jid.endsWith('@broadcast'),
    connectTimeoutMs:               60_000,
    keepAliveIntervalMs:            25_000,
    retryRequestDelayMs:            500,
    maxMsgRetryCount:               5,
    // FIX 2: fireInitQueries:false breaks pair code auth — must be true
    fireInitQueries:                true,
    getMessage:                     async () => ({ conversation: '' }),
  });

  botManager.registerBot(sessionId, sock, wsClient);

  let pairRequested  = false;
  let reconnectTimer = null;
  let pairCodeTimer  = null;

  async function onConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    if (qr && mode === 'qr') {
      const qrImage = await QRCode.toDataURL(qr);
      _sendWS(wsClient, { type: 'qr', qr: qrImage });
    }

    // FIX 3: Request pair code only once, after proper delay for noise handshake
    if (
      mode === 'pair' &&
      phoneNumber &&
      !pairRequested &&
      !sock.authState.creds.registered &&
      !pairCodeTimer
    ) {
      pairCodeTimer = setTimeout(async () => {
        if (pairRequested) return;
        pairRequested = true;
        try {
          const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
          console.log('Requesting pair code for', cleanPhone, '[' + sessionId + ']');
          const code = await sock.requestPairingCode(cleanPhone);
          const formattedCode = code?.match(/.{1,4}/g)?.join('-') || code;
          _sendWS(wsClient, { type: 'pairCode', code: formattedCode });
          console.log('Pair code sent for', sessionId + ':', formattedCode);
        } catch (err) {
          console.error('Pair code error for', sessionId + ':', err.message);
          pairRequested = false;
          pairCodeTimer = null;
          _sendWS(wsClient, {
            type: 'error',
            message: 'Failed to generate pair code. Please try again.',
          });
        }
      // FIX 4: 5000ms delay — enough time for WhatsApp noise protocol handshake
      }, 5000);
    }

    if (connection === 'open') {
      clearTimeout(pairCodeTimer);
      await _onConnected(sock, sessionId, userId, wsClient);
      botManager.resetReconnect(sessionId);
      clearTimeout(reconnectTimer);
    }

    if (connection === 'close') {
      clearTimeout(pairCodeTimer);
      const statusCode      = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        const attempts = botManager.getReconnectAttempts(sessionId);
        if (attempts < 10) {
          botManager.incrementReconnect(sessionId);
          const delay = Math.min(1000 * Math.pow(2, attempts), 30_000);
          console.log('Reconnecting', sessionId, 'in', delay + 'ms (attempt ' + (attempts + 1) + ')');
          reconnectTimer = setTimeout(() => {
            createBotSession({ sessionId, userId, wsClient: null, mode, phoneNumber });
          }, delay);
        } else {
          console.log('Max reconnect attempts for', sessionId);
          _sendWS(wsClient, { type: 'error', message: 'Max reconnect attempts reached. Please redeploy.' });
          botManager.stopBot(sessionId);
        }
      } else {
        console.log('Session logged out:', sessionId);
        _sendWS(wsClient, { type: 'disconnected', sessionId });
        botManager.stopBot(sessionId);
      }
    }
  }

  sock.ev.on('connection.update', onConnectionUpdate);
  sock.ev.on('creds.update', saveCreds);

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

async function _onConnected(sock, sessionId, userId, wsClient) {
  try {
    const botNumber = sock.user?.id?.replace(/:.*@s.whatsapp.net/, '') || '';
    console.log('Bot connected:', sessionId, '—', botNumber);

    _sendWS(wsClient, { type: 'connected', number: botNumber, sessionId });

    const db = getDb();
    await db.collection('sessions_bot').doc(sessionId).set({
      sessionId,
      userId,
      whatsappNumber: botNumber,
      status:         'active',
      mode:           'public',
      createdAt:      new Date(),
      lastConnected:  new Date(),
    }, { merge: true });

    if (userId && userId !== 'admin') {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const existingBot = await db.collection('sessions_bot').doc(sessionId).get();
        if (!existingBot.exists) {
          const current = userDoc.data().botsCreated || 0;
          await userRef.update({ botsCreated: current + 1 });
        }
      }
    }

    await sleep(2000);

    const welcomeMsg =
      `╔═══════════════════════════════╗\n` +
      `║  🤖 ${F.BOT} 𝑹𝑬𝑨𝑫𝒀!   ║\n` +
      `╠═══════════════════════════════╣\n` +
      `║ ✅ Bot deployed successfully! ║\n` +
      `║                               ║\n` +
      `║ 📋 Type .𝒎𝒆𝒏𝒖 to start       ║\n` +
      `║                               ║\n` +
      `║ 🌐 Mode: PUBLIC               ║\n` +
      `║                               ║\n` +
      `║ 🔑 Session ID:                ║\n` +
      `║ ${sessionId}              ║\n` +
      `║                               ║\n` +
      `║ 👑 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚:               ║\n` +
      `║ ${F.SAHIL}            ║\n` +
      `╚═══════════════════════════════╝`;

    await sock.sendMessage(sock.user.id, { text: welcomeMsg });
  } catch (err) {
    console.error('onConnected error:', err.message);
  }
}

function _sendWS(wsClient, data) {
  if (!wsClient) return;
  try {
    if (wsClient.readyState === 1) {
      wsClient.send(JSON.stringify(data));
    }
  } catch (_) {}
}

module.exports = { createBotSession, generateSessionId };
