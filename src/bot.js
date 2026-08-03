const axios = require('axios');
const TelegramBot = require('node-telegram-bot-api');

// config
const COOKIES = {
  did: 'd631d10f-0a20-4c73-8731-9ee44be23bbb',
  csid: '052d489dca9a2fe40c',
};

const TOKENS = {
  sAccessToken: 'توکن_اصلی_دیوار',
  sFrontToken: 'توکن_فرانت_دیوار',
};

// proxy config
const proxyUrl = 'http://192.168.154.12:8080';

// telegram config
const TELEGRAM_TOKEN = 'توکن_ربات_تلگرام';
const CHAT_ID = 'چت_آیدی_خودت';

const bot = new TelegramBot(TELEGRAM_TOKEN, { polling: false });

// base client
const client = axios.create({
  baseURL: 'https://api.divar.ir/v8',
  proxy: {
    host: '192.168.154.12',
    port: 8080,
  },
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

// fetch listings
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

// send to telegram
function sendToTelegram(post) {
  const text = `[NEW] ${post.data?.title}\n${post.data?.description}\n${post.data?.share?.link}`;
  bot.sendMessage(CHAT_ID, text);
}

// listener
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
