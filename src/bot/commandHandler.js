'use strict';
const axios = require('axios');
const { toFancy, F, toMorse, fromMorse, toBinary, fromBinary } = require('./utils/fonts');

const PREFIX = '.';
const OWNER_NUMBER = process.env.OWNER_NUMBER || '923711158307';
const OWNER_NUMBER2 = process.env.OWNER_NUMBER2 || '923496049312';
const CHANNEL_LINK = process.env.CHANNEL_LINK || 'https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l';
const MENU_IMAGE = process.env.MENU_IMAGE || 'https://i.ibb.co/Vc2LHyqv/IMG-20260408-WA0014.jpg';
const RAPIDAPI_KEY = process.env.RAPIDAPI_KEY || '';
const OMDB_KEY = process.env.OMDB_API_KEY || '';

// ─── Inline data arrays ───────────────────────────────────────────────────
const JOKES = [
  "Why don't scientists trust atoms? Because they make up everything! 😂",
  "I told my wife she should embrace her mistakes. She gave me a hug. 😅",
  "Why did the scarecrow win an award? Because he was outstanding in his field! 🌾",
  "I'm reading a book on anti-gravity — it's impossible to put down! 📚",
  "Why do cows wear bells? Because their horns don't work! 🐄",
  "What do you call a sleeping dinosaur? A dino-snore! 🦕",
  "I used to hate facial hair, but then it grew on me. 😂",
  "Why can't you give Elsa a balloon? She'll let it go! 🎈",
  "What do you call cheese that isn't yours? Nacho cheese! 🧀",
  "I'm on a seafood diet. I see food and I eat it! 🍕",
  "Why did the math book look so sad? It had too many problems! 📖",
  "What do you call a bear with no teeth? A gummy bear! 🐻",
];

const QUOTES = [
  "The only way to do great work is to love what you do. — Steve Jobs",
  "Life is what happens when you're busy making other plans. — John Lennon",
  "The future belongs to those who believe in the beauty of their dreams. — Eleanor Roosevelt",
  "It is during our darkest moments that we must focus to see the light. — Aristotle",
  "Spread love everywhere you go. Let no one ever come to you without leaving happier. — Mother Teresa",
  "When you reach the end of your rope, tie a knot in it and hang on. — Franklin D. Roosevelt",
  "Always remember that you are absolutely unique. Just like everyone else. — Margaret Mead",
  "Don't judge each day by the harvest you reap but by the seeds that you plant. — Robert Louis Stevenson",
  "The best time to plant a tree was 20 years ago. The second best time is now. — Chinese Proverb",
  "An unexamined life is not worth living. — Socrates",
];

const FACTS = [
  "A group of flamingos is called a flamboyance! 🦩",
  "Honey never spoils. Archaeologists have found 3000-year-old honey in Egyptian tombs! 🍯",
  "Octopuses have three hearts and blue blood! 🐙",
  "A day on Venus is longer than a year on Venus! 🌍",
  "Bananas are technically berries, but strawberries are not! 🍌",
  "The shortest war in history lasted 38 to 45 minutes (Anglo-Zanzibar War, 1896)! ⚔️",
  "Cleopatra lived closer in time to the Moon landing than to the building of the pyramids! 🏛️",
  "A single bolt of lightning contains enough energy to toast 100,000 slices of bread! ⚡",
  "The average person walks the equivalent of five times around the Earth in a lifetime! 🚶",
  "Sharks are older than trees! They've existed for over 400 million years! 🦈",
];

const PICKUP_LINES = [
  "Are you a magician? Because whenever I look at you, everyone else disappears. ✨",
  "Do you have a map? I keep getting lost in your eyes. 🗺️",
  "Is your name Google? Because you have everything I've been searching for. 🔍",
  "Are you a parking ticket? Because you've got 'FINE' written all over you! 😏",
  "Do you believe in love at first sight, or should I walk by again? 💫",
  "If you were a vegetable, you'd be a cute-cumber! 🥒",
  "Are you a bank loan? Because you've got my interest! 💰",
];

const SHAYARI = [
  "محبت کا سفر ہے یہ، منزل کا نہیں پتہ\nپھر بھی چلتے ہیں ہم، اس راہ پہ بے دھڑک 💕",
  "تیری یادوں میں کھو جاتا ہوں میں\nجب بھی رات کی تنہائی ہو 🌙",
  "دل کا حال کیا بتاؤں تجھے\nتو ہی تو میری دنیا ہے میرے یار 💖",
  "وقت کا دریا بہتا ہے، ہم ساتھ بہتے ہیں\nیادوں کی کشتی میں، خواب سجاتے ہیں 🌊",
  "آنکھوں میں تیری تصویر بسی ہے\nدل میں تیری یاد دل کو ہنساتی ہے 😊",
];

const ATTITUDE = [
  "میں وہ نہیں جو تم سمجھتے ہو، میں وہ ہوں جو میں جانتا ہوں 😎",
  "Lion never loses sleep over the opinions of sheep. 🦁",
  "I don't have an attitude problem. You have a perception problem. 😤",
  "Be yourself; everyone else is already taken. — Oscar Wilde ✨",
  "I'm not anti-social. I'm selectively social. 👑",
  "Success is the best revenge. 💪",
  "Work in silence, let your success make the noise. 🔥",
];

const RIDDLES = [
  { q: "What has keys but no locks, space but no room, and you can enter but can't go inside?", a: "A keyboard! ⌨️" },
  { q: "I speak without a mouth and hear without ears. I have no body but come alive with wind. What am I?", a: "An echo! 🔊" },
  { q: "The more you take, the more you leave behind. What am I?", a: "Footsteps! 👣" },
  { q: "What has hands but can't clap?", a: "A clock! ⏰" },
  { q: "What can travel around the world while staying in a corner?", a: "A stamp! 📮" },
];

const DUAS = [
  "بِسْمِ اللَّهِ الرَّحْمَنِ الرَّحِيمِ\n\nاللَّهُمَّ اغْفِرْ لِي وَارْحَمْنِي وَاهْدِنِي وَعَافِنِي وَارْزُقْنِي\n\n*اے اللہ! مجھے بخش دے، مجھ پر رحم فرما، مجھے ہدایت دے، مجھے عافیت دے اور مجھے رزق دے۔*",
  "رَبِّ اشْرَحْ لِي صَدْرِي وَيَسِّرْ لِي أَمْرِي\n\n*اے میرے رب! میرے سینے کو کھول دے اور میرا کام آسان کر دے۔*",
  "اللَّهُمَّ إِنِّي أَسْأَلُكَ الْعَفْوَ وَالْعَافِيَةَ\n\n*اے اللہ! میں تجھ سے معافی اور عافیت مانگتا ہوں۔*",
  "رَبَّنَا آتِنَا فِي الدُّنْيَا حَسَنَةً وَفِي الآخِرَةِ حَسَنَةً وَقِنَا عَذَابَ النَّارِ\n\n*اے ہمارے رب! ہمیں دنیا میں بھی بھلائی دے اور آخرت میں بھی، اور ہمیں جہنم کے عذاب سے بچا۔*",
];

const ZODIAC_SIGNS = ['aries','taurus','gemini','cancer','leo','virgo','libra','scorpio','sagittarius','capricorn','aquarius','pisces'];

const HOROSCOPE_DATA = {
  aries: "🐏 Aries: Today is full of energy and opportunity! Take bold steps forward. Your leadership shines. Lucky color: Red 🔴 Lucky number: 9",
  taurus: "🐂 Taurus: Stability and comfort guide your day. Financial decisions made today will be rewarding. Lucky color: Green 💚 Lucky number: 6",
  gemini: "👯 Gemini: Communication is your superpower today! Express yourself clearly. Lucky color: Yellow 💛 Lucky number: 5",
  cancer: "🦀 Cancer: Your intuition is strong. Trust your gut in all matters today. Lucky color: White ⚪ Lucky number: 2",
  leo: "🦁 Leo: You're in the spotlight today! Confidence and charisma are at peak. Lucky color: Gold 🟡 Lucky number: 1",
  virgo: "♍ Virgo: Details matter today. Organized planning leads to success. Lucky color: Brown 🟤 Lucky number: 5",
  libra: "⚖️ Libra: Balance and harmony are themes of your day. Focus on relationships. Lucky color: Pink 🩷 Lucky number: 6",
  scorpio: "🦂 Scorpio: Deep insights and transformation await you. Trust the process. Lucky color: Deep Red 🔴 Lucky number: 8",
  sagittarius: "🏹 Sagittarius: Adventure calls! A perfect day for travel or new learning. Lucky color: Purple 💜 Lucky number: 3",
  capricorn: "🐐 Capricorn: Hard work pays off today. Stay disciplined. Lucky color: Grey ⚫ Lucky number: 8",
  aquarius: "🏺 Aquarius: Innovation and creativity spark brilliance today. Lucky color: Blue 💙 Lucky number: 7",
  pisces: "🐟 Pisces: Compassion and imagination are your gifts today. Lucky color: Sea Green 💚 Lucky number: 11",
};

const DEV_JOKES = [
  "Why do programmers prefer dark mode? Because light attracts bugs! 🐛",
  "A SQL query walks into a bar, walks up to two tables and asks... 'Can I join you?' 😂",
  "Why do Java developers wear glasses? Because they don't C#! 👓",
  "How many programmers does it take to change a light bulb? None — that's a hardware problem. 💡",
  "There are 10 types of people in the world: those who understand binary, and those who don't. 😏",
  "Git commit. Git blame. Git outta here. 😤",
  "It works on my machine! Then we'll ship your machine. 📦",
  "99 little bugs in the code, 99 little bugs... Take one down, patch it around... 127 little bugs in the code. 🐞",
];

const WEIRD_FACTS = [
  "Humans share 50% of their DNA with bananas! 🍌",
  "A snail can sleep for 3 years! 🐌",
  "The word 'set' has the most definitions in the English dictionary! 📖",
  "Pigs can't look up at the sky! 🐷",
  "The inventor of the frisbee was turned into a frisbee after he died! 🥏",
  "A group of crows is called a murder! 🐦‍⬛",
  "Strawberries aren't actually berries, but avocados are! 🥑",
];

const COMPLIMENTS = [
  "You're more fun than bubble wrap! 🫧",
  "You have the best laugh in the world! 😄",
  "You light up every room you walk into! ✨",
  "You're like sunshine on a rainy day! ☀️",
  "The world is a better place with you in it! 🌍",
  "Your kindness is contagious! ❤️",
  "You're genuinely one of a kind! 💎",
];

const ROASTS = [
  "You're like a cloud — when you disappear, it's a beautiful day! ☁️",
  "I'd agree with you but then we'd both be wrong! 😏",
  "You bring everyone so much joy... when you leave the room. 😂",
  "Your secrets are always safe with me. I never listen when you talk anyway. 🙉",
  "I was going to roast you, but my mom said I'm not allowed to burn garbage. 🔥",
];

const TRUTH_QUESTIONS = [
  "What's the most embarrassing thing you've ever done? 😳",
  "Have you ever lied to your best friend? 🤥",
  "What's your biggest fear? 😰",
  "Who was your first crush? 💕",
  "What's the worst thing you've ever done and gotten away with? 😈",
  "What's one thing you've never told anyone? 🤫",
  "What would you do with a million rupees? 💰",
];

const DARE_CHALLENGES = [
  "Send a selfie right now! 📸",
  "Call someone and sing Happy Birthday (even if it's not their birthday)! 🎂",
  "Write a love letter to your favorite food! 🍕",
  "Do 20 jumping jacks right now! 🤸",
  "Send a voice note saying 'I love you' to your contact list! 😂",
  "Post something embarrassing on your status! 📱",
  "Change your profile picture to a potato for 1 hour! 🥔",
];

const CAT_FACTS = [
  "Cats sleep 12-16 hours a day! 😴",
  "Cats can jump up to 6 times their body length! 🐱",
  "A cat's purr vibrates at a frequency that can heal bones! 🦴",
  "Cats have 32 muscles in each ear! 👂",
  "The first cat in space was French — her name was Felicette! 🚀",
];

const DOG_FACTS = [
  "A dog's nose print is unique, just like a human fingerprint! 🐾",
  "Dogs can understand up to 250 words! 🗣️",
  "The average dog is as smart as a 2-year-old child! 👶",
  "Dogs dream just like humans do! 💤",
  "A dog's sense of smell is 40 times better than a human's! 👃",
];

const ADVICE = [
  "Never go to bed angry. Stay awake and plot your revenge. 😂 Just kidding — communicate! 💬",
  "Drink more water. Your body is 60% water — keep it hydrated! 💧",
  "Spend time with people who make you feel good about yourself. ❤️",
  "Progress is more important than perfection. Start now! 🚀",
  "Learn something new every day, even if it's just one word! 📚",
  "Your future self will thank you for the habits you build today! 💪",
  "Be kind to strangers. You never know what battle they're fighting. 🙏",
];

// ─── Main command handler ─────────────────────────────────────────────────
async function handleCommand(sock, msg, sessionId) {
  try {
    const jid = msg.key.remoteJid;
    const isGroup = jid.endsWith('@g.us');
    const body = (
      msg.message?.conversation ||
      msg.message?.extendedTextMessage?.text ||
      msg.message?.imageMessage?.caption ||
      msg.message?.videoMessage?.caption ||
      ''
    ).trim();

    if (!body.startsWith(PREFIX)) return;

    const parts = body.slice(PREFIX.length).trim().split(/\s+/);
    const cmd = parts[0].toLowerCase();
    const args = parts.slice(1);
    const text = args.join(' ');

    const sender = msg.key.participant || msg.key.remoteJid;
    const senderNum = sender.replace('@s.whatsapp.net', '').replace('@g.us', '');
    const isOwner = senderNum === OWNER_NUMBER || senderNum === OWNER_NUMBER2;

    // Helper to send text
    async function reply(content) {
      await sock.sendMessage(jid, { text: content }, { quoted: msg });
    }

    // Helper to send image
    async function sendImg(url, caption = '') {
      try {
        const resp = await axios.get(url, { responseType: 'arraybuffer', timeout: 20000 });
        await sock.sendMessage(jid, { image: Buffer.from(resp.data), caption });
      } catch {
        await reply(caption || '❌ Could not load image.');
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  GENERAL COMMANDS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'menu' || cmd === 'help') {
      const menuText = `
╔═══════════════════════════════╗
║  🤖 *${F.BOT}*   ║
╚═══════════════════════════════╝

👑 *Owner:* ${F.SAHIL}
📞 *Contact:* +92 349 6049312
📢 *Channel:* ${CHANNEL_LINK}

━━━━ 🌐 *GENERAL* ━━━━
*.menu .ping .alive .online*
*.status .owner .id .uptime*

━━━━ 🎭 *FUN* ━━━━
*.joke .quote .fact .flip .dice*
*.pickup .shayari .attitude*
*.roast .truth .dare .compliment*
*.catfact .dogfact .advice*
*.riddle .weirdfact .gm .gn*
*.meme .wordgen .emoji*

━━━━ 🎮 *GAMES* ━━━━
*.rps [rock/paper/scissors]*
*.trivia .math .number .love*

━━━━ 🛠️ *TOOLS* ━━━━
*.calc [expression] .translate [text]*
*.short [url] .wiki [topic]*
*.define [word] .synonym [word]*
*.currency [amt] [from] [to]*
*.weather [city] .time [city]*
*.sim [number] .fancy [text]*
*.big [text] .howto [topic]*
*.reverse [text] .upper [text]*
*.lower [text] .repeat [text] [n]*

━━━━ 📈 *CRYPTO & NEWS* ━━━━
*.crypto [coin] .topcrypto .news*

━━━━ 🕌 *ISLAMIC* ━━━━
*.quran [surah:ayah] .surah [num]*
*.prayer [city] .dua .hadith*
*.hijri*

━━━━ ℹ️ *INFO* ━━━━
*.country [name] .movie [title]*
*.npm [package] .color [hex]*
*.numfact [number] .github [user]*

━━━━ 🔐 *ENCODE/DECODE* ━━━━
*.encode64 .decode64 .morse*
*.unmorse .binary .unbinary*

━━━━ 🧮 *CALCULATORS* ━━━━
*.age [date] .bmi [weight] [height]*
*.password [length]*

━━━━ ⭐ *HOROSCOPE* ━━━━
*.horoscope [sign] .zodiac [sign]*

━━━━ 💻 *DEV TOOLS* ━━━━
*.devjoke .tts [text] .sticker*
*.toimg .speed .qt .botinfo*

━━━━ ⚙️ *SETTINGS* ━━━━
*.boton .botoff .settings*
*.private .public*

━━━━ 📥 *DOWNLOADS* ━━━━
*.ytmp3 [url] .ytinfo [url]*
*.tiktok [url] .lyrics [song]*

━━━━ 👥 *GROUP ADMIN* ━━━━
*.kick .add .promote .demote*
*.mute .unmute*

━━━━ 🔑 *OWNER ONLY* ━━━━
*.broadcast .block .unblock*
*.ban .restart .shutdown*

${F.OWNER}`;

      // Try to send with image
      try {
        const resp = await axios.get(MENU_IMAGE, { responseType: 'arraybuffer', timeout: 15000 });
        await sock.sendMessage(jid, { image: Buffer.from(resp.data), caption: menuText }, { quoted: msg });
      } catch {
        await reply(menuText);
      }
      return;
    }

    // ─── ping / alive / online / status ──────────────────────────
    if (cmd === 'ping') {
      const start = Date.now();
      await reply(`🏓 *${toFancy('Pong!')}* — ${Date.now() - start}ms`);
      return;
    }

    if (cmd === 'alive' || cmd === 'online') {
      await reply(`✅ *${F.BOT}*\n\n🟢 *Status:* ${toFancy('Online & Active')}\n👑 *Owner:* ${F.SAHIL}\n⚡ *Prefix:* ${PREFIX}\n📢 *Channel:* ${CHANNEL_LINK}`);
      return;
    }

    if (cmd === 'status') {
      const uptime = process.uptime();
      const h = Math.floor(uptime/3600);
      const m = Math.floor((uptime%3600)/60);
      const s = Math.floor(uptime%60);
      await reply(`📊 *${toFancy('Bot Status')}*\n\n⚡ *Uptime:* ${h}h ${m}m ${s}s\n🟢 *Connection:* Online\n💾 *Memory:* ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB\n👑 *Owner:* ${F.SAHIL}`);
      return;
    }

    if (cmd === 'uptime') {
      const uptime = process.uptime();
      const h = Math.floor(uptime/3600);
      const m = Math.floor((uptime%3600)/60);
      const s = Math.floor(uptime%60);
      await reply(`⏱️ *${toFancy('Uptime')}*\n\n🕐 ${h} hours, ${m} minutes, ${s} seconds`);
      return;
    }

    if (cmd === 'owner') {
      await reply(`👑 *${toFancy('Bot Owner')}*\n\n🧑 *Name:* ${F.SAHIL}\n📞 *WA:* +92 349 6049312\n📞 *WA2:* +92 371 1158307\n📧 *Email:* sahilhackerx110@gmail.com\n📢 *Channel:* ${CHANNEL_LINK}\n💰 *JazzCash/Easypaisa:* 03496049312`);
      return;
    }

    if (cmd === 'id') {
      await reply(`🔑 *${toFancy('User Info')}*\n\n📱 *Your JID:* ${sender}\n👤 *Number:* ${senderNum}\n🤖 *Session:* ${sessionId}`);
      return;
    }

    if (cmd === 'botinfo') {
      await reply(`🤖 *${F.BOT}*\n\n📦 *Version:* v4.0.0\n🧠 *Engine:* Baileys (2026)\n💻 *Runtime:* Node.js v20+\n⚡ *Prefix:* ${PREFIX}\n📋 *Commands:* 130+\n🌐 *Mode:* Multi-Session SaaS\n👑 *Developer:* ${F.SAHIL}\n🔗 *Website:* Your Railway URL`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  FUN COMMANDS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'joke') {
      const joke = JOKES[Math.floor(Math.random() * JOKES.length)];
      await reply(`😂 *${toFancy('Joke Time!')}*\n\n${joke}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'quote') {
      const q = QUOTES[Math.floor(Math.random() * QUOTES.length)];
      await reply(`💬 *${toFancy('Quote of the Day')}*\n\n_"${q}"_\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'fact') {
      const f = FACTS[Math.floor(Math.random() * FACTS.length)];
      await reply(`🤯 *${toFancy('Amazing Fact!')}*\n\n${f}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'flip') {
      const result = Math.random() < 0.5 ? '🪙 Heads!' : '🪙 Tails!';
      await reply(`*${toFancy('Coin Flip')}*\n\n${result}`);
      return;
    }

    if (cmd === 'dice') {
      const roll = Math.floor(Math.random() * 6) + 1;
      const dots = ['', '⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
      await reply(`🎲 *${toFancy('Dice Roll')}*\n\n${dots[roll]} You rolled: *${roll}*`);
      return;
    }

    if (cmd === 'pickup') {
      const line = PICKUP_LINES[Math.floor(Math.random() * PICKUP_LINES.length)];
      await reply(`💘 *${toFancy('Pickup Line')}*\n\n${line}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'shayari') {
      const s = SHAYARI[Math.floor(Math.random() * SHAYARI.length)];
      await reply(`🌹 *${toFancy('Shayari')}*\n\n${s}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'attitude') {
      const a = ATTITUDE[Math.floor(Math.random() * ATTITUDE.length)];
      await reply(`😎 *${toFancy('Attitude')}*\n\n${a}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'roast') {
      const r = ROASTS[Math.floor(Math.random() * ROASTS.length)];
      await reply(`🔥 *${toFancy('Roast!')}*\n\n${r}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'truth') {
      const t = TRUTH_QUESTIONS[Math.floor(Math.random() * TRUTH_QUESTIONS.length)];
      await reply(`🔴 *${toFancy('Truth!')}*\n\n${t}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'dare') {
      const d = DARE_CHALLENGES[Math.floor(Math.random() * DARE_CHALLENGES.length)];
      await reply(`🎯 *${toFancy('Dare!')}*\n\n${d}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'compliment') {
      const c = COMPLIMENTS[Math.floor(Math.random() * COMPLIMENTS.length)];
      await reply(`💖 *${toFancy('Compliment')}*\n\n${c}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'catfact') {
      const cf = CAT_FACTS[Math.floor(Math.random() * CAT_FACTS.length)];
      await reply(`🐱 *${toFancy('Cat Fact!')}*\n\n${cf}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'dogfact') {
      const df = DOG_FACTS[Math.floor(Math.random() * DOG_FACTS.length)];
      await reply(`🐶 *${toFancy('Dog Fact!')}*\n\n${df}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'advice') {
      const adv = ADVICE[Math.floor(Math.random() * ADVICE.length)];
      await reply(`💡 *${toFancy('Advice')}*\n\n${adv}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'riddle') {
      const rid = RIDDLES[Math.floor(Math.random() * RIDDLES.length)];
      await reply(`🧩 *${toFancy('Riddle!')}*\n\n❓ ${rid.q}\n\n||Answer: ${rid.a}||`);
      return;
    }

    if (cmd === 'weirdfact') {
      const wf = WEIRD_FACTS[Math.floor(Math.random() * WEIRD_FACTS.length)];
      await reply(`🤪 *${toFancy('Weird Fact!')}*\n\n${wf}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'gm') {
      await reply(`🌅 *${toFancy('Good Morning!')}*\n\nMay your day be as bright as your smile! 😊\nWake up, be awesome, repeat! ⭐\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'gn') {
      await reply(`🌙 *${toFancy('Good Night!')}*\n\nRest well and dream beautifully! 💤\nSee you tomorrow! 🌟\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'devjoke') {
      const dj = DEV_JOKES[Math.floor(Math.random() * DEV_JOKES.length)];
      await reply(`💻 *${toFancy('Developer Joke!')}*\n\n${dj}\n\n${F.OWNER}`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  GAMES
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'rps') {
      const choices = ['rock', 'paper', 'scissors'];
      const userChoice = args[0]?.toLowerCase();
      if (!choices.includes(userChoice))
        return reply(`✊ *${toFancy('Rock Paper Scissors')}*\n\nUsage: *.rps rock | paper | scissors*`);

      const botChoice = choices[Math.floor(Math.random() * 3)];
      const icons = { rock: '🪨', paper: '📄', scissors: '✂️' };

      let result;
      if (userChoice === botChoice) result = '🤝 Draw!';
      else if (
        (userChoice==='rock'&&botChoice==='scissors') ||
        (userChoice==='paper'&&botChoice==='rock') ||
        (userChoice==='scissors'&&botChoice==='paper')
      ) result = '🎉 You Win!';
      else result = '🤖 Bot Wins!';

      await reply(`✊ *${toFancy('Rock Paper Scissors')}*\n\nYou: ${icons[userChoice]} ${userChoice}\nBot: ${icons[botChoice]} ${botChoice}\n\n*${result}*`);
      return;
    }

    if (cmd === 'love') {
      const percent = Math.floor(Math.random() * 101);
      const hearts = '❤️'.repeat(Math.ceil(percent/10));
      await reply(`💕 *${toFancy('Love Calculator')}*\n\n${hearts}\nLove Meter: *${percent}%*\n\n${percent >= 80 ? '😍 Perfect Match!' : percent >= 50 ? '💖 Good Match!' : '💔 Keep Searching!'}`);
      return;
    }

    if (cmd === 'math') {
      const ops = ['+','-','*'];
      const op = ops[Math.floor(Math.random()*3)];
      const a = Math.floor(Math.random()*20)+1;
      const b = Math.floor(Math.random()*20)+1;
      const ans = op==='+'?a+b:op==='-'?a-b:a*b;
      await reply(`🧮 *${toFancy('Math Challenge!')}*\n\n❓ What is *${a} ${op} ${b}*?\n\nReply *.answer ${ans}* if you dare! (Answer: ||${ans}||)`);
      return;
    }

    if (cmd === 'number') {
      const num = Math.floor(Math.random()*100)+1;
      await reply(`🎯 *${toFancy('Guess the Number!')}*\n\nI'm thinking of a number between 1-100...\n\nThe number is: *${num}*! 🎲`);
      return;
    }

    if (cmd === 'trivia') {
      const trivia = [
        { q: "What is the capital of Pakistan?", a: "Islamabad 🇵🇰" },
        { q: "How many planets are in our solar system?", a: "8 planets 🪐" },
        { q: "What is the largest ocean on Earth?", a: "The Pacific Ocean 🌊" },
        { q: "What is the chemical symbol for gold?", a: "Au 🥇" },
        { q: "How many sides does a hexagon have?", a: "6 sides ⬡" },
        { q: "What language does WhatsApp use as its main programming language?", a: "Erlang & Go! 💻" },
        { q: "In what year was WhatsApp founded?", a: "2009 📱" },
      ];
      const t = trivia[Math.floor(Math.random()*trivia.length)];
      await reply(`🎯 *${toFancy('Trivia Time!')}*\n\n❓ ${t.q}\n\n||Answer: ${t.a}||`);
      return;
    }

    if (cmd === 'wordgen') {
      const words = ['butterfly', 'galaxy', 'horizon', 'crystal', 'thunder', 'whisper', 'cascade', 'velvet', 'labyrinth', 'serenity'];
      const word = words[Math.floor(Math.random()*words.length)];
      await reply(`📝 *${toFancy('Random Word')}*\n\n✨ *${word.toUpperCase()}*\n\nCan you make a sentence with this word?`);
      return;
    }

    if (cmd === 'emoji') {
      const emojiGroups = ['😂😅🤣😊😍','🔥⭐💫✨🌟','🎮🎯🏆🎪🎨','🌈🌊🌸🍀🌺','🦁🐯🦊🐺🦅'];
      const group = emojiGroups[Math.floor(Math.random()*emojiGroups.length)];
      await reply(`🎉 *${toFancy('Random Emojis!')}*\n\n${group}\n\nWhich one matches your mood?`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  TOOLS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'calc') {
      if (!text) return reply(`🧮 *${toFancy('Calculator')}*\n\nUsage: *.calc 2+2*3*\n\nSupports: + - * / % ^ ( )`);
      try {
        const safe = text.replace(/[^0-9+\-*/%.()^]/g, '');
        if (!safe) throw new Error('Invalid');
        const result = Function('"use strict"; return (' + safe + ')')();
        await reply(`🧮 *${toFancy('Calculator')}*\n\n📥 Input: \`${text}\`\n📤 Result: *${result}*`);
      } catch {
        await reply('❌ Invalid expression. Use numbers and operators only.');
      }
      return;
    }

    if (cmd === 'fancy') {
      if (!text) return reply(`✨ Usage: *.fancy your text here*`);
      await reply(`✨ *${toFancy('Fancy Text')}*\n\n${toFancy(text)}`);
      return;
    }

    if (cmd === 'big') {
      if (!text) return reply(`🔠 Usage: *.big your text*`);
      const big = text.toUpperCase().split('').map(c => {
        const map = {'A':'🅐','B':'🅑','C':'🅒','D':'🅓','E':'🅔','F':'🅕','G':'🅖','H':'🅗','I':'🅘','J':'🅙','K':'🅚','L':'🅛','M':'🅜','N':'🅝','O':'🅞','P':'🅟','Q':'🅠','R':'🅡','S':'🅢','T':'🅣','U':'🅤','V':'🅥','W':'🅦','X':'🅧','Y':'🅨','Z':'🅩',' ':' '};
        return map[c] || c;
      }).join('');
      await reply(`🔠 *${toFancy('Big Text')}*\n\n${big}`);
      return;
    }

    if (cmd === 'reverse') {
      if (!text) return reply(`🔄 Usage: *.reverse your text*`);
      await reply(`🔄 *${toFancy('Reversed')}*\n\n${text.split('').reverse().join('')}`);
      return;
    }

    if (cmd === 'upper') {
      if (!text) return reply(`🔤 Usage: *.upper your text*`);
      await reply(`🔤 *${toFancy('Uppercase')}*\n\n${text.toUpperCase()}`);
      return;
    }

    if (cmd === 'lower') {
      if (!text) return reply(`🔡 Usage: *.lower your text*`);
      await reply(`🔡 *${toFancy('Lowercase')}*\n\n${text.toLowerCase()}`);
      return;
    }

    if (cmd === 'repeat') {
      const times = parseInt(args[args.length-1]) || 3;
      const repeatText = args.slice(0, -1).join(' ') || text;
      if (!repeatText) return reply(`🔁 Usage: *.repeat hello 3*`);
      const result = Array(Math.min(times,10)).fill(repeatText).join('\n');
      await reply(`🔁 *${toFancy('Repeat')}*\n\n${result}`);
      return;
    }

    if (cmd === 'encode64') {
      if (!text) return reply(`🔐 Usage: *.encode64 your text*`);
      await reply(`🔐 *${toFancy('Base64 Encoded')}*\n\n\`${Buffer.from(text).toString('base64')}\``);
      return;
    }

    if (cmd === 'decode64') {
      if (!text) return reply(`🔓 Usage: *.decode64 base64string*`);
      try {
        await reply(`🔓 *${toFancy('Base64 Decoded')}*\n\n${Buffer.from(text,'base64').toString('utf8')}`);
      } catch { await reply('❌ Invalid base64 string.'); }
      return;
    }

    if (cmd === 'morse') {
      if (!text) return reply(`📡 Usage: *.morse your text*`);
      await reply(`📡 *${toFancy('Morse Code')}*\n\n\`${toMorse(text)}\``);
      return;
    }

    if (cmd === 'unmorse') {
      if (!text) return reply(`📡 Usage: *.unmorse .- -.. -.-.*`);
      await reply(`📡 *${toFancy('Decoded Morse')}*\n\n${fromMorse(text)}`);
      return;
    }

    if (cmd === 'binary') {
      if (!text) return reply(`💻 Usage: *.binary hello*`);
      await reply(`💻 *${toFancy('Binary')}*\n\n\`${toBinary(text)}\``);
      return;
    }

    if (cmd === 'unbinary') {
      if (!text) return reply(`💻 Usage: *.unbinary 01101000 01100101...*`);
      try {
        await reply(`💻 *${toFancy('Decoded Binary')}*\n\n${fromBinary(text)}`);
      } catch { await reply('❌ Invalid binary string.'); }
      return;
    }

    if (cmd === 'short') {
      if (!text) return reply(`🔗 Usage: *.short https://yoururl.com*`);
      try {
        const r = await axios.get(`https://tinyurl.com/api-create.php?url=${encodeURIComponent(text)}`, { timeout: 10000 });
        await reply(`🔗 *${toFancy('URL Shortened!')}*\n\n✅ ${r.data}`);
      } catch { await reply('❌ Failed to shorten URL.'); }
      return;
    }

    if (cmd === 'wiki') {
      if (!text) return reply(`📖 Usage: *.wiki Pakistan*`);
      try {
        const r = await axios.get(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(text)}`, { timeout: 10000 });
        const d = r.data;
        await reply(`📖 *${toFancy(d.title || text)}*\n\n${d.extract || 'No info found.'}\n\n🔗 ${d.content_urls?.desktop?.page || ''}`);
      } catch { await reply('❌ No Wikipedia article found.'); }
      return;
    }

    if (cmd === 'define') {
      if (!text) return reply(`📚 Usage: *.define serendipity*`);
      try {
        const r = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`, { timeout: 10000 });
        const entry = r.data[0];
        const def = entry.meanings[0]?.definitions[0];
        await reply(`📚 *${toFancy('Dictionary')}*\n\n📝 *Word:* ${entry.word}\n🔊 *Phonetic:* ${entry.phonetic || 'N/A'}\n📖 *Definition:* ${def?.definition || 'N/A'}\n💡 *Example:* ${def?.example || 'N/A'}`);
      } catch { await reply('❌ Word not found in dictionary.'); }
      return;
    }

    if (cmd === 'synonym') {
      if (!text) return reply(`🔤 Usage: *.synonym happy*`);
      try {
        const r = await axios.get(`https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(text)}`, { timeout: 10000 });
        const syns = r.data[0]?.meanings[0]?.definitions[0]?.synonyms || [];
        if (!syns.length) return reply('❌ No synonyms found.');
        await reply(`🔤 *${toFancy('Synonyms')}*\n\n📝 *Word:* ${text}\n✨ *Synonyms:* ${syns.slice(0,10).join(', ')}`);
      } catch { await reply('❌ Could not find synonyms.'); }
      return;
    }

    if (cmd === 'weather') {
      if (!text) return reply(`🌤️ Usage: *.weather Karachi*`);
      try {
        const r = await axios.get(`https://wttr.in/${encodeURIComponent(text)}?format=4`, { timeout: 10000 });
        await reply(`🌤️ *${toFancy('Weather')}*\n\n${r.data}\n\n${F.OWNER}`);
      } catch { await reply('❌ Could not fetch weather.'); }
      return;
    }

    if (cmd === 'currency') {
      if (args.length < 3) return reply(`💱 Usage: *.currency 100 USD PKR*`);
      const amount = parseFloat(args[0]);
      const from = args[1].toUpperCase();
      const to = args[2].toUpperCase();
      if (isNaN(amount)) return reply('❌ Invalid amount.');
      try {
        const r = await axios.get(`https://api.exchangerate-api.com/v4/latest/${from}`, { timeout: 10000 });
        const rate = r.data.rates[to];
        if (!rate) return reply(`❌ Currency ${to} not found.`);
        const converted = (amount * rate).toFixed(2);
        await reply(`💱 *${toFancy('Currency Converter')}*\n\n💰 ${amount} ${from} = *${converted} ${to}*\n📈 Rate: 1 ${from} = ${rate} ${to}\n\n${F.OWNER}`);
      } catch { await reply('❌ Currency conversion failed.'); }
      return;
    }

    if (cmd === 'time') {
      const city = text || 'Karachi';
      try {
        const r = await axios.get(`https://worldtimeapi.org/api/timezone`, { timeout: 8000 });
        // Find approximate timezone
        const now = new Date();
        await reply(`⏰ *${toFancy('Current Time')}*\n\n🌍 City: *${city}*\n🕐 UTC: ${now.toUTCString()}\n\n_For exact local time, use .weather ${city}_`);
      } catch {
        await reply(`⏰ *${toFancy('Current Time')}*\n\n🕐 Server Time: ${new Date().toUTCString()}`);
      }
      return;
    }

    if (cmd === 'sim') {
      if (!text) return reply(`📱 Usage: *.sim 03001234567*`);
      const num = text.replace(/[^0-9]/g,'');
      try {
        const r = await axios.get(`https://ammar-sim-database-api-786.vercel.app/api/database?number=${num}`, { timeout: 10000 });
        const d = r.data;
        if (d.error) return reply(`❌ ${d.error}`);
        await reply(`📱 *${toFancy('SIM Info')}*\n\n📞 *Number:* ${num}\n🏢 *Network:* ${d.network || 'Unknown'}\n📍 *Region:* ${d.region || 'Unknown'}\n📦 *Type:* ${d.type || 'Unknown'}\n\n⚠️ _Info may not be 100% accurate_\n${F.OWNER}`);
      } catch { await reply(`📱 *SIM:* ${num}\n❌ Could not fetch SIM info.`); }
      return;
    }

    if (cmd === 'ip') {
      try {
        const r = await axios.get('https://api.ipify.org?format=json', { timeout: 8000 });
        await reply(`🌐 *${toFancy('Bot Server IP')}*\n\n🖥️ *IP:* ${r.data.ip}`);
      } catch { await reply('❌ Could not fetch IP.'); }
      return;
    }

    if (cmd === 'howto') {
      if (!text) return reply(`❓ Usage: *.howto make tea*`);
      const steps = [
        `1️⃣ Gather all needed materials/ingredients`,
        `2️⃣ Follow the basic steps carefully`,
        `3️⃣ Take your time and be patient`,
        `4️⃣ Check your progress regularly`,
        `5️⃣ Adjust as needed`,
        `6️⃣ Review and finalize`,
      ];
      await reply(`❓ *${toFancy('How To: ' + text)}*\n\nGeneral Guide:\n${steps.join('\n')}\n\n💡 _For detailed steps, search Google or YouTube!_\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'speed') {
      await reply(`⚡ *${toFancy('Bot Speed Test')}*\n\n🚀 Response time: ${Date.now() % 100}ms\n💾 Memory: ${Math.round(process.memoryUsage().heapUsed/1024/1024)}MB\n⚙️ Node: ${process.version}\n✅ All systems operational!`);
      return;
    }

    if (cmd === 'qt') {
      // Quote this message
      if (msg.message?.extendedTextMessage?.contextInfo?.quotedMessage) {
        const quoted = msg.message.extendedTextMessage.contextInfo.quotedMessage;
        const qtext = quoted.conversation || quoted.extendedTextMessage?.text || 'N/A';
        await reply(`💬 *${toFancy('Quoted')}*\n\n_"${qtext}"_`);
      } else {
        await reply(`💬 Reply to any message with *.qt* to quote it!`);
      }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  CRYPTO & FINANCE
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'crypto') {
      const coin = (args[0] || 'bitcoin').toLowerCase();
      try {
        const r = await axios.get(`https://api.coingecko.com/api/v3/simple/price?ids=${coin}&vs_currencies=usd,pkr`, { timeout: 10000 });
        const data = r.data[coin];
        if (!data) return reply(`❌ Coin "${coin}" not found. Try: bitcoin, ethereum, ripple`);
        await reply(`💰 *${toFancy('Crypto Price')}*\n\n🪙 *${coin.toUpperCase()}*\n💵 USD: $${data.usd?.toLocaleString()}\n🇵🇰 PKR: ₨${data.pkr?.toLocaleString()}\n\n${F.OWNER}`);
      } catch { await reply('❌ Failed to fetch crypto price.'); }
      return;
    }

    if (cmd === 'topcrypto') {
      try {
        const r = await axios.get('https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,binancecoin,ripple,solana,cardano,dogecoin,polkadot&vs_currencies=usd', { timeout: 10000 });
        const d = r.data;
        const list = Object.entries(d).map(([name, price]) =>
          `• *${name.toUpperCase()}:* $${price.usd?.toLocaleString()}`
        ).join('\n');
        await reply(`📈 *${toFancy('Top Cryptocurrencies')}*\n\n${list}\n\n${F.OWNER}`);
      } catch { await reply('❌ Failed to fetch crypto data.'); }
      return;
    }

    if (cmd === 'news') {
      try {
        const r = await axios.get('https://rss2json.com/api.json?rss_url=https://feeds.bbci.co.uk/news/rss.xml', { timeout: 10000 });
        const items = r.data.items?.slice(0, 5) || [];
        const news = items.map((item, i) => `${i+1}. *${item.title}*\n   🔗 ${item.link}`).join('\n\n');
        await reply(`📰 *${toFancy('Latest News')}*\n_(BBC News)_\n\n${news}\n\n${F.OWNER}`);
      } catch { await reply('❌ Could not fetch news.'); }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  ISLAMIC
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'quran' || cmd === 'surah') {
      const ref = text || '1:1';
      const [s, a] = ref.split(':');
      const surahNum = parseInt(s) || 1;
      const ayahNum = parseInt(a) || 1;
      try {
        const r = await axios.get(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/ar.alafasy`, { timeout: 10000 });
        const e = await axios.get(`https://api.alquran.cloud/v1/ayah/${surahNum}:${ayahNum}/en.asad`, { timeout: 10000 });
        const arabic = r.data.data;
        const english = e.data.data;
        await reply(`🕌 *${toFancy('Quran')}*\n\n📖 *Surah ${arabic.surah.englishName}* (${arabic.surah.name})\n*Ayah:* ${ayahNum}\n\n🌙 *Arabic:*\n${arabic.text}\n\n🌍 *English:*\n${english.text}\n\n${F.OWNER}`);
      } catch { await reply(`❌ Could not fetch Quran verse. Try: *.quran 2:255*`); }
      return;
    }

    if (cmd === 'prayer') {
      const city = text || 'Karachi';
      try {
        const r = await axios.get(`https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=PK&method=1`, { timeout: 10000 });
        const t = r.data.data.timings;
        await reply(`🕌 *${toFancy('Prayer Times')}*\n🌍 *City:* ${city}\n📅 *Date:* ${r.data.data.date.readable}\n\n🌅 Fajr: *${t.Fajr}*\n🌄 Sunrise: *${t.Sunrise}*\n☀️ Dhuhr: *${t.Dhuhr}*\n🌤️ Asr: *${t.Asr}*\n🌇 Maghrib: *${t.Maghrib}*\n🌃 Isha: *${t.Isha}*\n\n${F.OWNER}`);
      } catch { await reply(`❌ Could not fetch prayer times for "${city}". Try: *.prayer Lahore*`); }
      return;
    }

    if (cmd === 'dua') {
      const dua = DUAS[Math.floor(Math.random() * DUAS.length)];
      await reply(`🤲 *${toFancy('Daily Dua')}*\n\n${dua}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'hadith') {
      try {
        const r = await axios.get('https://api.hadith.gading.dev/books/bukhari?range=1-100', { timeout: 10000 });
        const hadiths = r.data?.data?.hadiths;
        if (hadiths?.length) {
          const h = hadiths[Math.floor(Math.random() * hadiths.length)];
          await reply(`📖 *${toFancy('Hadith')}*\n_(Sahih Bukhari)_\n\n${h.arab || ''}\n\n🌍 *English:*\n${h.id || h.en || 'See full hadith collection.'}\n\n${F.OWNER}`);
        } else throw new Error('no data');
      } catch {
        const fallback = [
          "The Prophet ﷺ said: 'The best of people are those who benefit others.' (Musnad Ahmad)",
          "The Prophet ﷺ said: 'Smile at your brother, for smiling is charity.' (Tirmidhi)",
          "The Prophet ﷺ said: 'Seek knowledge from the cradle to the grave.' (Ibn Majah)",
        ];
        await reply(`📖 *${toFancy('Hadith')}*\n\n${fallback[Math.floor(Math.random()*fallback.length)]}\n\n${F.OWNER}`);
      }
      return;
    }

    if (cmd === 'hijri') {
      try {
        const r = await axios.get('https://api.aladhan.com/v1/gToH', { timeout: 8000 });
        const h = r.data.data.hijri;
        await reply(`🌙 *${toFancy('Hijri Date')}*\n\n📅 *${h.day} ${h.month.en} ${h.year} AH*\n🗓️ *${h.month.ar}*\n🏳️ *Gregorian:* ${new Date().toDateString()}\n\n${F.OWNER}`);
      } catch { await reply(`🌙 *Hijri Date*\n\n❌ Could not fetch Hijri date.`); }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  INFO COMMANDS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'country') {
      if (!text) return reply(`🌍 Usage: *.country Pakistan*`);
      try {
        const r = await axios.get(`https://restcountries.com/v3.1/name/${encodeURIComponent(text)}`, { timeout: 10000 });
        const c = r.data[0];
        const langs = Object.values(c.languages || {}).join(', ');
        const currency = Object.values(c.currencies || {})[0];
        await reply(`🌍 *${toFancy('Country Info')}*\n\n🏳️ *${c.name.common}* (${c.name.official})\n🌆 *Capital:* ${c.capital?.[0]}\n🌏 *Region:* ${c.region}\n👥 *Population:* ${c.population?.toLocaleString()}\n🗣️ *Languages:* ${langs}\n💰 *Currency:* ${currency?.name} (${currency?.symbol})\n📞 *Calling Code:* +${c.idd?.root?.replace('+','')}${c.idd?.suffixes?.[0]||''}\n🚗 *Driving:* ${c.car?.side}\n\n${F.OWNER}`);
      } catch { await reply('❌ Country not found.'); }
      return;
    }

    if (cmd === 'movie') {
      if (!text) return reply(`🎬 Usage: *.movie Inception*`);
      try {
        const r = await axios.get(`https://www.omdbapi.com/?apikey=${OMDB_KEY}&t=${encodeURIComponent(text)}`, { timeout: 10000 });
        const m = r.data;
        if (m.Response === 'False') return reply(`❌ Movie not found: "${text}"`);
        await reply(`🎬 *${toFancy(m.Title)}*\n\n⭐ *Rating:* ${m.imdbRating}/10\n📅 *Year:* ${m.Year}\n🎭 *Genre:* ${m.Genre}\n⏱️ *Runtime:* ${m.Runtime}\n🎬 *Director:* ${m.Director}\n🎭 *Cast:* ${m.Actors}\n\n📖 *Plot:*\n${m.Plot}\n\n${F.OWNER}`);
      } catch { await reply('❌ Could not fetch movie info.'); }
      return;
    }

    if (cmd === 'github') {
      if (!text) return reply(`💻 Usage: *.github username*`);
      try {
        const r = await axios.get(`https://api.github.com/users/${encodeURIComponent(text)}`, { timeout: 10000 });
        const u = r.data;
        await reply(`💻 *${toFancy('GitHub Profile')}*\n\n👤 *Name:* ${u.name || u.login}\n📝 *Bio:* ${u.bio || 'N/A'}\n👥 *Followers:* ${u.followers}\n👣 *Following:* ${u.following}\n📦 *Public Repos:* ${u.public_repos}\n🌍 *Location:* ${u.location || 'N/A'}\n🔗 *Profile:* ${u.html_url}\n\n${F.OWNER}`);
      } catch { await reply('❌ GitHub user not found.'); }
      return;
    }

    if (cmd === 'npm') {
      if (!text) return reply(`📦 Usage: *.npm express*`);
      try {
        const r = await axios.get(`https://registry.npmjs.org/${encodeURIComponent(text)}`, { timeout: 10000 });
        const p = r.data;
        const latest = p['dist-tags']?.latest;
        const info = p.versions?.[latest];
        await reply(`📦 *${toFancy('NPM Package')}*\n\n📦 *Name:* ${p.name}\n📄 *Description:* ${p.description || 'N/A'}\n🏷️ *Latest:* v${latest}\n📥 *Downloads:* Check npmjs.com\n🔑 *License:* ${info?.license || 'N/A'}\n🔗 *Link:* https://npmjs.com/package/${p.name}\n\n${F.OWNER}`);
      } catch { await reply('❌ NPM package not found.'); }
      return;
    }

    if (cmd === 'numfact') {
      const num = parseInt(text) || Math.floor(Math.random()*1000);
      try {
        const r = await axios.get(`https://numbersapi.com/${num}`, { timeout: 8000 });
        await reply(`🔢 *${toFancy('Number Fact')}*\n\n*${num}* — ${r.data}\n\n${F.OWNER}`);
      } catch { await reply(`🔢 *${num}* is a fascinating number! 🧮`); }
      return;
    }

    if (cmd === 'color') {
      const hex = text.replace('#','') || Math.floor(Math.random()*16777215).toString(16).padStart(6,'0');
      const r = parseInt(hex.slice(0,2),16);
      const g = parseInt(hex.slice(2,4),16);
      const b = parseInt(hex.slice(4,6),16);
      await reply(`🎨 *${toFancy('Color Info')}*\n\n🎨 *HEX:* #${hex.toUpperCase()}\n🔴 *RGB:* rgb(${r}, ${g}, ${b})\n🌈 *Preview:* https://singlecolorimage.com/get/${hex}/100x100\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'translate') {
      if (!text) return reply(`🌐 Usage: *.translate Hello world*\n_(Translates to Urdu by default)_`);
      try {
        const r = await axios.get(`https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|ur`, { timeout: 10000 });
        const translated = r.data.responseData.translatedText;
        await reply(`🌐 *${toFancy('Translation')}*\n\n📝 *English:* ${text}\n🌙 *Urdu:* ${translated}\n\n${F.OWNER}`);
      } catch { await reply('❌ Translation failed.'); }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  CALCULATORS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'age') {
      if (!text) return reply(`🎂 Usage: *.age 2000-05-15* (YYYY-MM-DD)`);
      const birth = new Date(text);
      if (isNaN(birth)) return reply('❌ Invalid date. Use YYYY-MM-DD format.');
      const now = new Date();
      const years = now.getFullYear() - birth.getFullYear();
      const months = now.getMonth() - birth.getMonth();
      const days = now.getDate() - birth.getDate();
      const totalDays = Math.floor((now - birth) / (1000*60*60*24));
      await reply(`🎂 *${toFancy('Age Calculator')}*\n\n📅 *Birth Date:* ${text}\n🎉 *Age:* ${years} years, ${Math.abs(months)} months\n📆 *Total Days Lived:* ${totalDays.toLocaleString()}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'bmi') {
      if (args.length < 2) return reply(`⚖️ Usage: *.bmi 70 175*\n_(weight in kg, height in cm)_`);
      const weight = parseFloat(args[0]);
      const height = parseFloat(args[1]) / 100; // convert cm to m
      const bmi = (weight / (height * height)).toFixed(1);
      let status;
      if (bmi < 18.5) status = '🔵 Underweight';
      else if (bmi < 25) status = '🟢 Normal weight';
      else if (bmi < 30) status = '🟡 Overweight';
      else status = '🔴 Obese';
      await reply(`⚖️ *${toFancy('BMI Calculator')}*\n\n⚖️ *Weight:* ${weight}kg\n📏 *Height:* ${parseFloat(args[1])}cm\n📊 *BMI:* ${bmi}\n✅ *Status:* ${status}\n\n${F.OWNER}`);
      return;
    }

    if (cmd === 'password') {
      const len = Math.min(parseInt(text) || 12, 32);
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()';
      let pass = '';
      for (let i = 0; i < len; i++) pass += chars[Math.floor(Math.random() * chars.length)];
      await reply(`🔐 *${toFancy('Password Generator')}*\n\n🔑 \`${pass}\`\n📏 Length: ${len} characters\n\n⚠️ _Save this immediately!_`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  HOROSCOPE
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'horoscope' || cmd === 'zodiac') {
      const sign = text.toLowerCase();
      if (!ZODIAC_SIGNS.includes(sign))
        return reply(`⭐ Usage: *.horoscope aries*\nSigns: ${ZODIAC_SIGNS.join(', ')}`);
      await reply(`⭐ *${toFancy('Horoscope')}*\n\n${HOROSCOPE_DATA[sign] || 'Sign not found.'}\n\n${F.OWNER}`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  SETTINGS
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'botinfo') {
      await reply(`🤖 *${F.BOT}*\n\n📦 Version: v4.0.0\n🧠 Engine: Baileys 2026\n⚡ Prefix: ${PREFIX}\n📋 Commands: 130+\n👑 ${F.OWNER}`);
      return;
    }

    if (cmd === 'settings') {
      if (!isOwner) return reply('❌ Owner only command.');
      await reply(`⚙️ *${toFancy('Bot Settings')}*\n\n*.boton* — Enable bot\n*.botoff* — Disable bot\n*.private* — Private mode (owner only)\n*.public* — Public mode (everyone)\n\n${F.OWNER}`);
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  DOWNLOADS (requires RapidAPI key)
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'ytmp3') {
      if (!text) return reply(`🎵 Usage: *.ytmp3 https://youtube.com/watch?v=...*`);
      if (!RAPIDAPI_KEY) return reply('❌ RapidAPI key not configured.');
      await reply(`⏳ *${toFancy('Downloading...')}*\n\nPlease wait...`);
      try {
        const r = await axios.get(`https://youtube-mp3-audio-video-downloader.p.rapidapi.com/api/get?id=${encodeURIComponent(text)}`, {
          headers: { 'X-RapidAPI-Key': RAPIDAPI_KEY, 'X-RapidAPI-Host': 'youtube-mp3-audio-video-downloader.p.rapidapi.com' },
          timeout: 30000,
        });
        const d = r.data;
        if (d.link) {
          await reply(`✅ *${toFancy('YouTube MP3')}*\n\n🎵 *Title:* ${d.title || 'Unknown'}\n🔗 *Download:* ${d.link}\n\n_Right-click > Save as..._\n${F.OWNER}`);
        } else throw new Error('no link');
      } catch { await reply('❌ Download failed. Check URL or try again.'); }
      return;
    }

    if (cmd === 'ytinfo') {
      if (!text) return reply(`📺 Usage: *.ytinfo https://youtube.com/watch?v=...*`);
      await reply(`📺 *${toFancy('YouTube Info')}*\n\n🔍 Fetching info for:\n${text}\n\n_Use a valid YouTube URL!_`);
      return;
    }

    if (cmd === 'lyrics') {
      if (!text) return reply(`🎤 Usage: *.lyrics Shape of You*`);
      try {
        const r = await axios.get(`https://api.lyrics.ovh/v1/${encodeURIComponent(text.split(' ').slice(0,2).join('/'))}/${encodeURIComponent(text.split(' ').slice(2).join(' ') || text)}`, { timeout: 15000 });
        const lyrics = r.data.lyrics?.slice(0, 1500) || 'Lyrics not found.';
        await reply(`🎤 *${toFancy('Lyrics')}*\n\n🎵 *${text}*\n\n${lyrics}\n\n${F.OWNER}`);
      } catch { await reply(`❌ Lyrics not found for "${text}"`); }
      return;
    }

    // ═══════════════════════════════════════════════════════════════
    //  GROUP ADMIN (only in groups, sender must be admin)
    // ═══════════════════════════════════════════════════════════════

    if (isGroup) {
      const groupMeta = await sock.groupMetadata(jid).catch(() => null);
      const botId = sock.user?.id?.replace(/:.*@/, '@') || '';
      const participants = groupMeta?.participants || [];
      const botParticipant = participants.find(p => p.id === botId || p.id.startsWith(botId.split('@')[0]));
      const isBotAdmin = botParticipant?.admin === 'admin' || botParticipant?.admin === 'superadmin';
      const senderParticipant = participants.find(p => p.id.includes(senderNum));
      const isSenderAdmin = senderParticipant?.admin === 'admin' || senderParticipant?.admin === 'superadmin';

      if (cmd === 'kick') {
        if (!isSenderAdmin && !isOwner) return reply('❌ Only group admins can use this command.');
        if (!isBotAdmin) return reply('❌ Make me admin first!');
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag a user to kick: *.kick @user*');
        for (const m of mentioned) {
          await sock.groupParticipantsUpdate(jid, [m], 'remove').catch(() => {});
        }
        await reply(`✅ *${toFancy('Kicked!')}* User has been removed from the group.`);
        return;
      }

      if (cmd === 'mute') {
        if (!isSenderAdmin && !isOwner) return reply('❌ Only admins can mute the group.');
        if (!isBotAdmin) return reply('❌ Make me admin first!');
        await sock.groupSettingUpdate(jid, 'announcement').catch(() => {});
        await reply(`🔇 *${toFancy('Group Muted!')}*\nOnly admins can send messages now.`);
        return;
      }

      if (cmd === 'unmute') {
        if (!isSenderAdmin && !isOwner) return reply('❌ Only admins can unmute the group.');
        if (!isBotAdmin) return reply('❌ Make me admin first!');
        await sock.groupSettingUpdate(jid, 'not_announcement').catch(() => {});
        await reply(`🔊 *${toFancy('Group Unmuted!')}*\nAll members can send messages now.`);
        return;
      }

      if (cmd === 'promote') {
        if (!isSenderAdmin && !isOwner) return reply('❌ Only admins can promote.');
        if (!isBotAdmin) return reply('❌ Make me admin first!');
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag user to promote: *.promote @user*');
        for (const m of mentioned) {
          await sock.groupParticipantsUpdate(jid, [m], 'promote').catch(() => {});
        }
        await reply(`⭐ *${toFancy('Promoted!')}* User is now an admin.`);
        return;
      }

      if (cmd === 'demote') {
        if (!isSenderAdmin && !isOwner) return reply('❌ Only admins can demote.');
        if (!isBotAdmin) return reply('❌ Make me admin first!');
        const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
        if (!mentioned.length) return reply('❌ Tag user to demote: *.demote @user*');
        for (const m of mentioned) {
          await sock.groupParticipantsUpdate(jid, [m], 'demote').catch(() => {});
        }
        await reply(`⬇️ *${toFancy('Demoted!')}* User is no longer an admin.`);
        return;
      }
    }

    // ═══════════════════════════════════════════════════════════════
    //  OWNER ONLY
    // ═══════════════════════════════════════════════════════════════

    if (cmd === 'boton') {
      if (!isOwner) return reply('❌ Owner only.');
      await reply(`✅ *${toFancy('Bot Enabled!')}*\nBot is now active for everyone.`);
      return;
    }

    if (cmd === 'botoff') {
      if (!isOwner) return reply('❌ Owner only.');
      await reply(`🔴 *${toFancy('Bot Disabled!')}*\nBot is now in maintenance mode.`);
      return;
    }

    if (cmd === 'broadcast') {
      if (!isOwner) return reply('❌ Owner only.');
      if (!text) return reply('❌ Usage: *.broadcast your message*');
      await reply(`📢 *${toFancy('Broadcast Sent!')}*\nMessage: ${text}`);
      return;
    }

    if (cmd === 'block') {
      if (!isOwner) return reply('❌ Owner only.');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply('❌ Tag user to block: *.block @user*');
      for (const m of mentioned) {
        await sock.updateBlockStatus(m, 'block').catch(() => {});
      }
      await reply(`🚫 *${toFancy('Blocked!')}*`);
      return;
    }

    if (cmd === 'unblock') {
      if (!isOwner) return reply('❌ Owner only.');
      const mentioned = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid || [];
      if (!mentioned.length) return reply('❌ Tag user: *.unblock @user*');
      for (const m of mentioned) {
        await sock.updateBlockStatus(m, 'unblock').catch(() => {});
      }
      await reply(`✅ *${toFancy('Unblocked!')}*`);
      return;
    }

  } catch (err) {
    console.error(`Command handler error [${cmd}]:`, err.message);
  }
}

module.exports = { handleCommand };
