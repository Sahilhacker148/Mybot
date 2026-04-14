# 🤖 SAHIL 804 BOT — WhatsApp SaaS Platform 2026

**Enterprise-grade WhatsApp Bot SaaS — 130+ Commands**

---

## 🚀 Railway Deployment

### Step 1: Upload to GitHub
```bash
git init
git add .
git commit -m "SAHIL 804 BOT v4.0.0"
git push origin main
```

### Step 2: Create Railway Project
1. Go to [railway.app](https://railway.app)
2. New Project → Deploy from GitHub
3. Select your repo

### Step 3: Set Environment Variables on Railway
Go to Variables tab and add ALL of these:

```
FIREBASE_PROJECT_ID=sahilbot804-21c4d
FIREBASE_CLIENT_EMAIL=firebase-adminsdk-fbsvc@sahilbot804-21c4d.iam.gserviceaccount.com
FIREBASE_PRIVATE_KEY_ID=8fd08f65c56098ee395f6e7e242b5fd322210b22
FIREBASE_CLIENT_ID=103078318867399698765
FIREBASE_PRIVATE_KEY=-----BEGIN PRIVATE KEY-----\nMIIEvwIBAD...your key...\n-----END PRIVATE KEY-----\n
FIREBASE_DATABASE_URL=https://sahilbot804-21c4d-default-rtdb.asia-southeast1.firebasedatabase.app
FIREBASE_API_KEY=AIzaSyDA-ckh7bI1jT421g4llxKDw-6CdwG_jnQ
SESSION_SECRET=Sahil804BotSuperSecretKey2026!@#$%^
ADMIN_EMAIL=sahilhackerx110@gmail.com
ADMIN_PASSWORD=Sahil38@
RAPIDAPI_KEY=your_key
OMDB_API_KEY=your_key
HADITH_API_KEY=your_key
OWNER_NUMBER=923711158307
OWNER_NUMBER2=923496049312
BOT_NUMBER=923496049312
CHANNEL_LINK=https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l
MENU_IMAGE=https://i.ibb.co/Vc2LHyqv/IMG-20260408-WA0014.jpg
```

### Step 4: Deploy
Railway auto-deploys on push. Health check: `/health`

---

## 📋 File Structure
```
sahil804-bot/
├── server.js              # Main server
├── package.json
├── railway.json           # Railway config
├── .env                   # Local only (never commit)
├── public/                # Frontend (unchanged UI)
│   ├── index.html
│   ├── dashboard.html
│   ├── admin.html
│   ├── login.html
│   └── register.html
├── src/
│   ├── config/
│   │   ├── firebase.js    # Firebase Admin SDK
│   │   └── sessionStore.js # Firestore sessions
│   ├── routes/
│   │   ├── auth.js        # Register/Login/Logout
│   │   ├── bot.js         # Bot API endpoints
│   │   └── admin.js       # Admin panel API
│   └── bot/
│       ├── botManager.js  # Multi-session manager
│       ├── session.js     # Baileys connection
│       ├── commandHandler.js # 130+ commands
│       └── utils/
│           └── fonts.js   # Fancy Unicode fonts
└── auth_info_baileys/     # Bot auth (auto-created)
```

---

## 👑 Developer
**Sahil Hacker 804**  
📞 +92 349 6049312  
📢 https://whatsapp.com/channel/0029Vb7ufE7It5rzLqedDc3l
