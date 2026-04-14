'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { botManager } = require('../bot/botManager');
const { createBotSession } = require('../bot/session');

// Auth middleware
function authOnly(req, res, next) {
  if (!req.session?.userId) return res.status(401).json({ error: 'Not authenticated.' });
  next();
}
router.use(authOnly);

// ─── GET /api/user/subscription ──────────────────────────────────────────
// Dashboard calls this to decide: show "Create Bot" button OR upgrade banner
router.get('/subscription', async (req, res) => {
  try {
    if (req.session.isAdmin) return res.json({ active: true, plan: 'admin', botsAllowed: 999 });

    const db = getDb();
    const doc = await db.collection('users').doc(req.session.userId).get();
    if (!doc.exists) return res.status(404).json({ active: false, error: 'User not found.' });

    const u = doc.data();

    if (u.plan === 'free' || !u.plan) {
      return res.json({ active: false, plan: 'free', botsAllowed: 0 });
    }

    // Check expiry
    if (u.planExpiry) {
      const expiry = u.planExpiry.toDate ? u.planExpiry.toDate() : new Date(u.planExpiry._seconds * 1000);
      if (expiry < new Date()) {
        return res.json({ active: false, plan: u.plan, expired: true, botsAllowed: 0 });
      }
    }

    return res.json({
      active: true,
      plan: u.plan,
      botsAllowed: u.botsAllowed || 0,
      botsCreated: u.botsCreated || 0,
      planExpiry: u.planExpiry || null,
    });
  } catch (err) {
    console.error('subscription check error:', err);
    res.status(500).json({ active: false, error: 'Server error.' });
  }
});

// ─── GET /api/user/bots ───────────────────────────────────────────────────
// Dashboard calls this to render the "My Bots" list
router.get('/bots', async (req, res) => {
  try {
    const db = getDb();
    const userId = req.session.userId;

    let query;
    if (req.session.isAdmin) {
      query = db.collection('sessions_bot').orderBy('createdAt', 'desc');
    } else {
      query = db.collection('sessions_bot')
        .where('userId', '==', userId)
        .orderBy('createdAt', 'desc');
    }

    const snap = await query.get();
    const bots = snap.docs.map(d => {
      const data = d.data();
      // Check if this bot is actually live in memory
      const entry = botManager.getBotEntry(data.sessionId);
      return {
        id: d.id,
        ...data,
        isLive: !!entry,
      };
    });

    res.json({ bots });
  } catch (err) {
    console.error('list user bots error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/bot/mode ───────────────────────────────────────────────────
// Toggle bot between public / private mode
router.post('/mode', async (req, res) => {
  try {
    const { sessionId, mode } = req.body;
    if (!sessionId || !['public', 'private'].includes(mode))
      return res.status(400).json({ error: 'Invalid request.' });

    const db = getDb();
    const userId = req.session.userId;

    // Ownership check
    if (!req.session.isAdmin) {
      const doc = await db.collection('sessions_bot').doc(sessionId).get();
      if (!doc.exists || doc.data().userId !== userId)
        return res.status(403).json({ error: 'Not authorized.' });
    }

    await db.collection('sessions_bot').doc(sessionId).update({ mode });
    res.json({ message: `Mode set to ${mode}.` });
  } catch (err) {
    console.error('mode toggle error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── POST /api/bot/restart ────────────────────────────────────────────────
// Restart a bot session (stop + re-create from saved auth)
router.post('/restart', async (req, res) => {
  try {
    const { sessionId } = req.body;
    if (!sessionId) return res.status(400).json({ error: 'sessionId required.' });

    const db = getDb();
    const userId = req.session.userId;

    const doc = await db.collection('sessions_bot').doc(sessionId).get();
    if (!doc.exists) return res.status(404).json({ error: 'Bot not found.' });

    const botData = doc.data();

    if (!req.session.isAdmin && botData.userId !== userId)
      return res.status(403).json({ error: 'Not authorized.' });

    // Stop existing instance
    await botManager.stopBot(sessionId);

    // Re-create from saved auth files (no WS needed — it auto-reconnects)
    setTimeout(async () => {
      try {
        await createBotSession({
          sessionId,
          userId: botData.userId,
          wsClient: null,        // no WS for restart
          mode: 'qr',            // mode is irrelevant — auth already saved
          phoneNumber: null,
        });
        await db.collection('sessions_bot').doc(sessionId).update({
          status: 'active',
          lastConnected: new Date(),
        });
      } catch (err) {
        console.error(`Restart failed for ${sessionId}:`, err.message);
        await db.collection('sessions_bot').doc(sessionId).update({ status: 'error' });
      }
    }, 2000);

    res.json({ message: 'Bot is restarting. It will be back online in ~10 seconds.' });
  } catch (err) {
    console.error('restart error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── DELETE /api/bot/:sessionId ───────────────────────────────────────────
// Delete a bot permanently
router.delete('/:sessionId', async (req, res) => {
  try {
    const { sessionId } = req.params;
    const db = getDb();
    const userId = req.session.userId;

    if (!req.session.isAdmin) {
      const doc = await db.collection('sessions_bot').doc(sessionId).get();
      if (!doc.exists || doc.data().userId !== userId)
        return res.status(403).json({ error: 'Not authorized.' });
    }

    // Stop bot
    await botManager.stopBot(sessionId);

    // Delete from Firestore
    await db.collection('sessions_bot').doc(sessionId).delete();

    // Decrement user bot count
    if (!req.session.isAdmin) {
      const userRef = db.collection('users').doc(userId);
      const userDoc = await userRef.get();
      if (userDoc.exists) {
        const count = Math.max(0, (userDoc.data().botsCreated || 1) - 1);
        await userRef.update({ botsCreated: count });
      }
    }

    res.json({ message: 'Bot deleted successfully.' });
  } catch (err) {
    console.error('delete bot error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
