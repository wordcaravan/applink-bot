const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');
const HttpsProxyAgent = require('https-proxy-agent');

// =========================
// CONFIG
// =========================

// دیوار
const COOKIES = {
  did: process.env.DID,
  csid: process.env.CSID,
};

const TOKENS = {
  sAccessToken: process.env.SACCESS,
  sFrontToken: process.env.SFRONT,
};

// پروکسی ایران (حتماً باید IP واقعی ایران باشد)
const agent = new HttpsProxyAgent(process.env.IR_PROXY);

// تلگرام
const TELEGRAM_TOKEN = process.env.TELEGRAM_TOKEN;
const CHAT_ID = process.env.CHAT_ID;

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: true });

// =========================
// AXIOS CLIENT
// =========================

const client = axios.create({
  baseURL: 'https://api.divar.ir/v8',
  httpsAgent: agent,
  headers: {
    'User-Agent': 'Mozilla/5.0',
    'Cookie': [
      `did=${COOKIES.did}`,
      `csid=${COOKIES.csid}`,
      `sAccessToken=${TOKENS.sAccessToken}`,
      `sFrontToken=${TOKENS.sFrontToken}`,
    ].join('; '),
    Authorization: `Bearer ${TOKENS.sAccessToken}`,
  },
});

// =========================
// FETCH LISTINGS
// =========================

async function fetchListings(params) {
  const body = {
    json_schema: {
      category: params.category,
      city: params.city,
      query: '',
      sort: { sort_by: 'date' },
    },
  };

  const res = await client.post('/search', body);
  return res.data?.web_widgets?.post_list || [];
}

// =========================
// SEND TO TELEGRAM
// =========================

function sendToTelegram(post) {
  const text = `[NEW] ${post.data?.title}\n${post.data?.description}\n${post.data?.share?.link}`;
  bot.sendMessage(CHAT_ID, text);
}

// =========================
// LISTENER
// =========================

async function startListener() {
  let lastIds = new Set();

  setInterval(async () => {
    try {
      const posts = await fetchListings({
        city: 'mashhad',
        category: 'apartment-rent',
      });

      for (const p of posts) {
        const id = p.data?.token;
        if (!id || lastIds.has(id)) continue;

        lastIds.add(id);
        console.log(`[NEW] ${p.data?.title} | ${p.data?.token}`);
        sendToTelegram(p);
      }

      if (lastIds.size > 5000) {
        lastIds = new Set([...lastIds].slice(-2000));
      }

    } catch (e) {
      console.error('listener error', e.message);
    }
  }, 8000);
}

startListener();
