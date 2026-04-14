'use strict';
const admin = require('firebase-admin');

let db;
let initialized = false;

function initFirebase() {
  if (initialized) return db;

  const privateKey = (process.env.FIREBASE_PRIVATE_KEY || '')
    .replace(/\\n/g, '\n');

  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey,
    }),
    databaseURL: process.env.FIREBASE_DATABASE_URL,
  });

  db = admin.firestore();
  db.settings({ ignoreUndefinedProperties: true });
  initialized = true;
  console.log('✅ Firebase initialized');
  return db;
}

function getDb() {
  if (!initialized) return initFirebase();
  return db;
}

module.exports = { initFirebase, getDb, admin };
