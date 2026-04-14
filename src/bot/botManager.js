'use strict';
const path = require('path');
const fs = require('fs');
const { getDb } = require('../config/firebase');

// Map of sessionId -> { sock, wsClient, reconnectAttempts }
const activeBots = new Map();

/**
 * Generate unique Session ID: SAHIL-XXXXXXXX
 */
function generateSessionId() {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let id = 'SAHIL-';
  for (let i = 0; i < 8; i++) id += chars[Math.floor(Math.random() * chars.length)];
  return id;
}

/**
 * Stop a single bot session gracefully
 */
async function stopBot(sessionId) {
  const entry = activeBots.get(sessionId);
  if (!entry) return;
  try {
    if (entry.sock) {
      entry.sock.ev.removeAllListeners();
      await entry.sock.logout().catch(() => {});
      entry.sock.end();
    }
  } catch (_) {}
  activeBots.delete(sessionId);
  console.log(`🔴 Bot stopped: ${sessionId}`);
}

/**
 * Stop all bots (graceful shutdown)
 */
async function stopAllBots() {
  const promises = [];
  for (const [sid] of activeBots) promises.push(stopBot(sid));
  await Promise.allSettled(promises);
}

/**
 * Get active bot count
 */
function getActiveCount() {
  return activeBots.size;
}

/**
 * Register a socket into the manager
 */
function registerBot(sessionId, sock, wsClient) {
  activeBots.set(sessionId, { sock, wsClient, reconnectAttempts: 0 });
}

/**
 * Get entry for a session
 */
function getBotEntry(sessionId) {
  return activeBots.get(sessionId) || null;
}

/**
 * Update reconnect attempt count
 */
function incrementReconnect(sessionId) {
  const entry = activeBots.get(sessionId);
  if (entry) entry.reconnectAttempts = (entry.reconnectAttempts || 0) + 1;
}

function getReconnectAttempts(sessionId) {
  const entry = activeBots.get(sessionId);
  return entry ? entry.reconnectAttempts || 0 : 0;
}

function resetReconnect(sessionId) {
  const entry = activeBots.get(sessionId);
  if (entry) entry.reconnectAttempts = 0;
}

module.exports = {
  botManager: {
    activeBots,
    stopBot,
    stopAllBots,
    getActiveCount,
    registerBot,
    getBotEntry,
    incrementReconnect,
    getReconnectAttempts,
    resetReconnect,
  },
  generateSessionId,
};
