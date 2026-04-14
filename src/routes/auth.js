'use strict';
const express = require('express');
const bcrypt = require('bcrypt');
const router = express.Router();
const { getDb } = require('../config/firebase');

const SALT_ROUNDS = 12;

// ─── Register ──────────────────────────────────────────────────────────────
router.post('/register', async (req, res) => {
  try {
    const { name, email, whatsapp, password } = req.body;

    // Validation
    if (!name || !email || !whatsapp || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email))
      return res.status(400).json({ error: 'Invalid email address.' });

    const cleanPhone = whatsapp.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 10 || cleanPhone.length > 15)
      return res.status(400).json({ error: 'Invalid WhatsApp number.' });

    if (password.length < 6)
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });

    const db = getDb();

    // Check duplicate email
    const existing = await db.collection('users')
      .where('email', '==', email.toLowerCase())
      .limit(1).get();

    if (!existing.empty)
      return res.status(400).json({ error: 'Email already registered.' });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, SALT_ROUNDS);

    // Create user
    const userRef = db.collection('users').doc();
    await userRef.set({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      whatsapp: cleanPhone,
      password: hashedPassword,
      status: 'pending', // needs admin approval
      plan: 'free',
      botsAllowed: 0,
      botsCreated: 0,
      planExpiry: null,
      createdAt: new Date(),
    });

    return res.json({ message: 'Account created! Awaiting admin approval before you can login.' });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── User Login ────────────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    const db = getDb();
    const snap = await db.collection('users')
      .where('email', '==', email.toLowerCase().trim())
      .limit(1).get();

    if (snap.empty)
      return res.status(401).json({ error: 'Invalid email or password.' });

    const userDoc = snap.docs[0];
    const user = userDoc.data();

    const match = await bcrypt.compare(password, user.password);
    if (!match)
      return res.status(401).json({ error: 'Invalid email or password.' });

    if (user.status === 'pending')
      return res.status(403).json({ error: '⏳ Your account is pending admin approval. Please wait.' });

    if (user.status === 'rejected')
      return res.status(403).json({ error: '❌ Your account has been rejected. Contact admin.' });

    // Set session
    req.session.userId = userDoc.id;
    req.session.isAdmin = false;
    req.session.userName = user.name;

    return res.json({ message: 'Login successful!', redirect: '/dashboard.html' });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ error: 'Server error. Please try again.' });
  }
});

// ─── Admin Login ───────────────────────────────────────────────────────────
router.post('/admin-login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ error: 'All fields are required.' });

    const adminEmail = process.env.ADMIN_EMAIL;
    const adminPass = process.env.ADMIN_PASSWORD;

    if (email.toLowerCase().trim() !== adminEmail.toLowerCase())
      return res.status(401).json({ error: 'Invalid credentials.' });

    if (password !== adminPass)
      return res.status(401).json({ error: 'Invalid credentials.' });

    req.session.isAdmin = true;
    req.session.userId = 'admin';
    req.session.userName = 'Admin';

    return res.json({ message: 'Admin login successful!', redirect: '/admin.html' });
  } catch (err) {
    console.error('Admin login error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

// ─── Logout ────────────────────────────────────────────────────────────────
router.post('/logout', (req, res) => {
  req.session.destroy(() => {
    res.clearCookie('connect.sid');
    res.json({ message: 'Logged out.' });
  });
});

// ─── Me (current user info) ───────────────────────────────────────────────
router.get('/me', async (req, res) => {
  try {
    if (!req.session.userId)
      return res.status(401).json({ error: 'Not authenticated.' });

    if (req.session.isAdmin)
      return res.json({ isAdmin: true, name: 'Admin', email: process.env.ADMIN_EMAIL });

    const db = getDb();
    const doc = await db.collection('users').doc(req.session.userId).get();
    if (!doc.exists)
      return res.status(404).json({ error: 'User not found.' });

    const u = doc.data();
    return res.json({
      id: doc.id,
      name: u.name,
      email: u.email,
      whatsapp: u.whatsapp,
      plan: u.plan,
      status: u.status,
      botsAllowed: u.botsAllowed || 0,
      botsCreated: u.botsCreated || 0,
      planExpiry: u.planExpiry,
      isAdmin: false,
    });
  } catch (err) {
    console.error('Me error:', err);
    return res.status(500).json({ error: 'Server error.' });
  }
});

module.exports = router;
