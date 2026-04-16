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

/**
 * Clean and validate phone number
 * Accepts: +923001234567  923001234567  03001234567
 * Returns: digits only, e.g. 923001234567
 */
function cleanPhoneNumber(raw) {
  if (!raw) return null;
  // Remove all non-digits
  let digits = String(raw).replace(/[^0-9]/g, '');
  // Pakistan local: 03XXXXXXXXX → 923XXXXXXXXX
  if (digits.startsWith('0') && digits.length === 11) {
    digits = '92' + digits.slice(1);
  }
  // Must be 10-15 digits after cleaning
  if (digits.length < 10 || digits.length > 15) return null;
  return digits;
}

/**
 * Core pairing code request with retry logic
 * WhatsApp noise protocol handshake must complete BEFORE requesting code.
 * We wait for the socket to be fully connected (connection.update fires with
 * connection === undefined or 'connecting'), then delay 6 seconds minimum.
 */
async function requestPairCodeWithRetry(sock, cleanPhone, sessionId, wsClient, maxRetries = 3) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[${sessionId}] Pair code attempt ${attempt}/${maxRetries} for +${cleanPhone}`);
      // sock.requestPairingCode is async and returns an 8-char code
      const code = await sock.requestPairingCode(cleanPhone);
      if (!code) throw new Error('Empty code returned from WhatsApp');
      // Format as XXXX-XXXX for display
      const formattedCode = String(code).match(/.{1,4}/g)?.join('-') || code;
      console.log(`[${sessionId}] Pair code success: ${formattedCode}`);
      _sendWS(wsClient, { type: 'pairCode', code: formattedCode });
      return true;
    } catch (err) {
      lastError = err;
      console.error(`[${sessionId}] Pair code attempt ${attempt} failed: ${err.message}`);
      if (attempt < maxRetries) {
        // Wait longer before each retry
        await sleep(attempt * 3000);
      }
    }
  }
  // All retries exhausted
  console.error(`[${sessionId}] All pair code attempts failed. Last error: ${lastError?.message}`);
  _sendWS(wsClient, {
    type: 'error',
    message: `Pairing code failed after ${maxRetries} attempts. Check your number and try again.`,
  });
  return false;
}

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

  // Clean phone number once, upfront
  const cleanPhone = cleanPhoneNumber(phoneNumber);
  if (mode === 'pair' && !cleanPhone) {
    console.error(`[${sessionId}] Invalid phone number: ${phoneNumber}`);
    _sendWS(wsClient, { type: 'error', message: 'Invalid phone number. Use country code e.g. +923001234567' });
    return null;
  }

  const sock = makeWASocket({
    version,
    auth: {
      creds: state.creds,
      keys:  makeCacheableSignalKeyStore(state.keys, logger),
    },
    logger,
    printQRInTerminal:              false,
    // CRITICAL: Ubuntu browser REQUIRED for pairing code — macOS/Windows causes "Couldn't link device" error
    browser:                        Browsers.ubuntu('Chrome'),
    generateHighQualityLinkPreview: false,
    syncFullHistory:                false,
    shouldIgnoreJid:                jid => jid.endsWith('@broadcast'),
    connectTimeoutMs:               60_000,
    keepAliveIntervalMs:            25_000,
    retryRequestDelayMs:            500,
    maxMsgRetryCount:               5,
    // CRITICAL: must be true for pairing code auth to work properly
    fireInitQueries:                true,
    getMessage:                     async () => ({ conversation: '' }),
  });

  botManager.registerBot(sessionId, sock, wsClient);

  let pairRequested  = false;
  let reconnectTimer = null;
  let pairCodeTimer  = null;

  // CRITICAL FIX: Schedule pairing code immediately after socket creation.
  // We do NOT wait for connection.update because on first connect,
  // WhatsApp sends NO event until after noise handshake completes.
  // Waiting 7 seconds gives the WS noise protocol time to finish.
  if (mode === 'pair' && cleanPhone && !sock.authState.creds.registered) {
    pairCodeTimer = setTimeout(async () => {
      if (pairRequested) return;
      // Double-check: if already registered/connected, skip
      if (sock.authState.creds.registered) {
        console.log(`[${sessionId}] Already registered, skipping pair code`);
        return;
      }
      pairRequested = true;
      await requestPairCodeWithRetry(sock, cleanPhone, sessionId, wsClient, 3);
    }, 7000); // 7s: handshake typically completes in 2-4s, 7s is safe margin
  }

  async function onConnectionUpdate(update) {
    const { connection, lastDisconnect, qr } = update;

    // QR code mode
    if (qr && mode === 'qr') {
      try {
        const qrImage = await QRCode.toDataURL(qr);
        _sendWS(wsClient, { type: 'qr', qr: qrImage });
      } catch (err) {
        console.error(`[${sessionId}] QR generation error:`, err.message);
      }
    }

    if (connection === 'open') {
      clearTimeout(pairCodeTimer);
      pairCodeTimer = null;
      await _onConnected(sock, sessionId, userId, wsClient);
      botManager.resetReconnect(sessionId);
      clearTimeout(reconnectTimer);
    }

    if (connection === 'close') {
      clearTimeout(pairCodeTimer);
      pairCodeTimer = null;
      const statusCode      = lastDisconnect?.error?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;

      if (shouldReconnect) {
        const attempts = botManager.getReconnectAttempts(sessionId);
        if (attempts < 10) {
          botManager.incrementReconnect(sessionId);
          const delay = Math.min(1000 * Math.pow(2, attempts), 30_000);
          console.log(`[${sessionId}] Reconnecting in ${delay}ms (attempt ${attempts + 1})`);
          reconnectTimer = setTimeout(() => {
            createBotSession({ sessionId, userId, wsClient: null, mode, phoneNumber });
          }, delay);
        } else {
          console.log(`[${sessionId}] Max reconnect attempts reached`);
          _sendWS(wsClient, { type: 'error', message: 'Max reconnect attempts reached. Please redeploy.' });
          botManager.stopBot(sessionId);
        }
      } else {
        console.log(`[${sessionId}] Session logged out`);
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
