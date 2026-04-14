'use strict';

// Unicode bold-italic map
const boldItalicMap = {
  a:'𝒂', b:'𝒃', c:'𝒄', d:'𝒅', e:'𝒆', f:'𝒇', g:'𝒈', h:'𝒉', i:'𝒊',
  j:'𝒋', k:'𝒌', l:'𝒍', m:'𝒎', n:'𝒏', o:'𝒐', p:'𝒑', q:'𝒒', r:'𝒓',
  s:'𝒔', t:'𝒕', u:'𝒖', v:'𝒗', w:'𝒘', x:'𝒙', y:'𝒚', z:'𝒛',
  A:'𝑨', B:'𝑩', C:'𝑪', D:'𝑫', E:'𝑬', F:'𝑭', G:'𝑮', H:'𝑯', I:'𝑰',
  J:'𝑱', K:'𝑲', L:'𝑳', M:'𝑴', N:'𝑵', O:'𝑶', P:'𝑷', Q:'𝑸', R:'𝑹',
  S:'𝑺', T:'𝑻', U:'𝑼', V:'𝑽', W:'𝑾', X:'𝑿', Y:'𝒀', Z:'𝒁',
  '0':'𝟎', '1':'𝟏', '2':'𝟐', '3':'𝟑', '4':'𝟒', '5':'𝟓', '6':'𝟔', '7':'𝟕', '8':'𝟖', '9':'𝟗',
};

function toFancy(text) {
  return String(text).split('').map(c => boldItalicMap[c] || c).join('');
}

// Pre-defined fancy strings
const F = {
  SAHIL: '𝑺𝒂𝒉𝒊𝒍 𝑯𝒂𝒄𝒌𝒆𝒓 𝟖𝟎𝟒',
  BOT: '𝑺𝑨𝑯𝑰𝑳 𝟖𝟎𝟒 𝑩𝑶𝑻',
  OWNER: '👑 𝑷𝒐𝒘𝒆𝒓𝒆𝒅 𝒃𝒚: 𝑺𝒂𝒉𝒊𝒍 𝑯𝒂𝒄𝒌𝒆𝒓 𝟖𝟎𝟒',
};

// Morse code tables
const MORSE = {
  'A':'.-', 'B':'-...', 'C':'-.-.', 'D':'-..', 'E':'.', 'F':'..-.', 'G':'--.', 'H':'....', 'I':'..', 'J':'.---',
  'K':'-.-', 'L':'.-..', 'M':'--', 'N':'-.', 'O':'---', 'P':'.--.', 'Q':'--.-', 'R':'.-.', 'S':'...', 'T':'-',
  'U':'..-', 'V':'...-', 'W':'.--', 'X':'-..-', 'Y':'-.--', 'Z':'--..',
  '0':'-----', '1':'.----', '2':'..---', '3':'...--', '4':'....-', '5':'.....',
  '6':'-....', '7':'--...', '8':'---..', '9':'----.',
};

const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE).map(([k,v])=>[v,k]));

function toMorse(text) {
  return text.toUpperCase().split('').map(c => MORSE[c] || (c===' '?'/':c)).join(' ');
}

function fromMorse(text) {
  return text.split(' / ').map(word =>
    word.split(' ').map(c => REVERSE_MORSE[c] || c).join('')
  ).join(' ');
}

function toBinary(text) {
  return text.split('').map(c => c.charCodeAt(0).toString(2).padStart(8,'0')).join(' ');
}

function fromBinary(text) {
  return text.split(' ').map(b => String.fromCharCode(parseInt(b,2))).join('');
}

module.exports = { toFancy, F, toMorse, fromMorse, toBinary, fromBinary };
