'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { botManager, generateSessionId } = require('../bot/botManager');

function authOnly(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated.' });
  next();
}
router.use(authOnly);

// ── Helper: check subscription ────────────────────────────────────────────
async function checkSub(userId) {
  const db = getDb();
  const doc = await db.collection('users').doc(userId).get();
  if (!doc.exists) return { ok: false, error: 'User not found.' };
  const u = doc.data();
  if (u.plan === 'free' || !u.plan) return { ok: false, error: '⛔ Upgrade your plan to create bots.' };
  if (u.planExpiry) {
    const expiry = u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry._seconds * 1000);
    if (expiry < new Date()) return { ok: false, error: '⏰ Your plan has expired. Please renew.' };
  }
  if ((u.botsCreated || 0) >= (u.botsAllowed || 0))
    return { ok: false, error: `🤖 Bot limit reached (${u.botsCreated}/${u.botsAllowed}). Upgrade or delete an existing bot.` };
  return { ok: true };
}

// ── POST /api/bot/start-pair ──────────────────────────────────────────────
// Called FIRST by dashboard before WebSocket opens
router.post('/start-pair', async (req, res) => {
  try {
    const { phoneNumber } = req.body;
    if (!phoneNumber) return res.status(400).json({ error: 'Phone number is required.' });
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15)
      return res.status(400).json({ error: 'Invalid phone number. Include country code, no +.' });

    const userId = req.session.userId;
    if (!req.session.isAdmin) {
      const check = await checkSub(userId);
      if (!check.ok) return res.status(403).json({ error: check.error });
    }

    const sessionId = generateSessionId();
    // Store config — WebSocket handler will pick this up using the sessionId
    req.app.get('pendingPair').set(sessionId, { userId, mode: 'pair', phoneNumber: cleanPhone });

    // Auto-expire from map after 3 minutes if WS never connects
    setTimeout(() => req.app.get('pendingPair').delete(sessionId), 3 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    console.error('start-pair error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ── POST /api/bot/start-qr ────────────────────────────────────────────────
router.post('/start-qr', async (req, res) => {
  try {
    const userId = req.session.userId;
    if (!req.session.isAdmin) {
      const check = await checkSub(userId);
      if (!check.ok) return res.status(403).json({ error: check.error });
    }

    const sessionId = generateSessionId();
    req.app.get('pendingPair').set(sessionId, { userId, mode: 'qr', phoneNumber: null });

    setTimeout(() => req.app.get('pendingPair').delete(sessionId), 3 * 60 * 1000);

    res.json({ sessionId });
  } catch (err) {
    console.error('start-qr error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
