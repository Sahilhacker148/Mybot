'use strict';
const express = require('express');
const router = express.Router();
const { getDb } = require('../config/firebase');
const { botManager } = require('../bot/botManager');

// Admin auth middleware
function adminOnly(req, res, next) {
  if (!req.session?.isAdmin) return res.status(401).json({ error: 'Unauthorized.' });
  next();
}

router.use(adminOnly);

// ─── Stats ─────────────────────────────────────────────────────────────────
router.get('/stats', async (req, res) => {
  try {
    const db = getDb();
    const usersSnap = await db.collection('users').get();
    const users = usersSnap.docs.map(d => ({ id: d.id, ...d.data() }));

    const sessions = await db.collection('sessions_bot').get();

    res.json({
      totalUsers: users.length,
      activeBots: botManager.getActiveCount(),
      pendingApprovals: users.filter(u => u.status === 'pending').length,
      monthlySubscribers: users.filter(u => u.plan === 'monthly').length,
      yearlySubscribers: users.filter(u => u.plan === 'yearly').length,
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Users ─────────────────────────────────────────────────────────────────
router.get('/users', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('users').orderBy('createdAt', 'desc').get();
    const users = snap.docs.map(d => {
      const data = d.data();
      delete data.password;
      return { id: d.id, ...data };
    });
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/users/:uid/approve', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({ status: 'approved' });
    res.json({ message: 'User approved.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/users/:uid/reject', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({ status: 'rejected' });
    res.json({ message: 'User rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/users/:uid', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).delete();
    res.json({ message: 'User deleted.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Sessions/Bots ────────────────────────────────────────────────────────
router.get('/sessions', async (req, res) => {
  try {
    const db = getDb();
    const snap = await db.collection('sessions_bot').orderBy('createdAt', 'desc').get();
    const sessions = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    res.json({ sessions });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/sessions/:sid', async (req, res) => {
  try {
    const { sid } = req.params;
    await botManager.stopBot(sid);
    const db = getDb();
    await db.collection('sessions_bot').doc(sid).delete();
    res.json({ message: 'Bot revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Subscriptions ────────────────────────────────────────────────────────
router.post('/subscriptions/:uid', async (req, res) => {
  try {
    const { plan } = req.body;
    const { uid } = req.params;

    if (!['monthly', 'yearly'].includes(plan))
      return res.status(400).json({ error: 'Invalid plan.' });

    const db = getDb();
    const doc = await db.collection('users').doc(uid).get();
    if (!doc.exists) return res.status(404).json({ error: 'User not found.' });

    const now = new Date();
    const expiry = new Date(now);
    if (plan === 'monthly') expiry.setDate(expiry.getDate() + 30);
    else expiry.setDate(expiry.getDate() + 365);

    await db.collection('users').doc(uid).update({
      plan,
      botsAllowed: plan === 'monthly' ? 10 : 999,
      planExpiry: expiry,
    });

    res.json({ message: `${plan} subscription assigned.` });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.delete('/subscriptions/:uid', async (req, res) => {
  try {
    const db = getDb();
    await db.collection('users').doc(req.params.uid).update({
      plan: 'free',
      botsAllowed: 0,
      planExpiry: null,
    });
    res.json({ message: 'Subscription revoked.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Payment Settings ─────────────────────────────────────────────────────
router.get('/payment-settings', async (req, res) => {
  try {
    const db = getDb();
    const doc = await db.collection('settings').doc('payment').get();
    if (!doc.exists) {
      return res.json({
        jazzcash: '03496049312',
        easypaisa: '03496049312',
        monthlyPrice: '500',
        yearlyPrice: '4000',
        instructions: 'Send payment screenshot to WhatsApp after paying.',
      });
    }
    res.json(doc.data());
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

router.post('/payment-settings', async (req, res) => {
  try {
    const { jazzcash, easypaisa, monthlyPrice, yearlyPrice, instructions } = req.body;
    const db = getDb();
    await db.collection('settings').doc('payment').set({
      jazzcash: jazzcash || '03496049312',
      easypaisa: easypaisa || '03496049312',
      monthlyPrice: monthlyPrice || '500',
      yearlyPrice: yearlyPrice || '4000',
      instructions: instructions || 'Send payment screenshot to WhatsApp after paying.',
      updatedAt: new Date(),
    });
    res.json({ message: 'Settings saved.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Announcement ─────────────────────────────────────────────────────────
router.post('/announcement', async (req, res) => {
  try {
    const { text } = req.body;
    const db = getDb();
    await db.collection('settings').doc('announcement').set({ text: text || '', updatedAt: new Date() });
    res.json({ message: 'Announcement saved.' });
  } catch (err) {
    res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
