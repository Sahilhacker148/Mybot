'use strict';
const session = require('express-session');

/**
 * Firestore-based session store — NO MemoryStore
 * Compatible with express-session Store API
 */
class FirestoreStore extends session.Store {
  constructor(options = {}) {
    super();
    this.db = options.db;
    this.collection = options.collection || 'sessions';
    this.ttl = options.ttl || 86400; // 24 hours default
  }

  async get(sid, callback) {
    try {
      const doc = await this.db.collection(this.collection).doc(sid).get();
      if (!doc.exists) return callback(null, null);
      const data = doc.data();
      if (data.expires && data.expires < Date.now()) {
        await this.destroy(sid, () => {});
        return callback(null, null);
      }
      callback(null, data.session);
    } catch (err) {
      callback(err);
    }
  }

  async set(sid, session, callback) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + this.ttl * 1000;
      await this.db.collection(this.collection).doc(sid).set({
        session,
        expires,
        updatedAt: Date.now(),
      });
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async destroy(sid, callback) {
    try {
      await this.db.collection(this.collection).doc(sid).delete();
      callback(null);
    } catch (err) {
      callback(err);
    }
  }

  async touch(sid, session, callback) {
    try {
      const expires = session.cookie?.expires
        ? new Date(session.cookie.expires).getTime()
        : Date.now() + this.ttl * 1000;
      await this.db
        .collection(this.collection)
        .doc(sid)
        .update({ expires, updatedAt: Date.now() });
      callback(null);
    } catch (err) {
      callback(null); // non-fatal
    }
  }
}

module.exports = FirestoreStore;
