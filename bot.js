// ===============================
// 1) HTTP SERVER (Render)
// ===============================
const express = require("express");
const app = express();
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("HTTP server is running");
});

// ===============================
// 2) Telegram Bot (Webhook)
// ===============================
const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const cheerio = require("cheerio");

const bot = new TelegramBot(process.env.BOT_TOKEN, { webHook: true });

// تنظیم webhook روی Render
bot.setWebHook(`https://applink-bot.onrender.com/${process.env.BOT_TOKEN}`);

// مسیر webhook
app.post(`/${process.env.BOT_TOKEN}`, (req, res) => {
  bot.processUpdate(req.body);
  res.sendStatus(200);
});

console.log("Telegram bot is running with webhook...");

// ===============================
// 3) /start command
// ===============================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(chatId, "برای فعال‌سازی سرویس، شماره تماس خود را ارسال کنید.", {
    reply_markup: {
      keyboard: [
        [{ text: "📞 ارسال شماره تماس", request_contact: true }]
      ],
      resize_keyboard: true,
      one_time_keyboard: true
    }
  });
});

// ===============================
// 4) دریافت شماره تماس
// ===============================
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phone = msg.contact.phone_number;
  const name = msg.contact.first_name;

  bot.sendMessage(chatId, `🌟 ${name}\nشماره ${phone} دریافت شد و سرویس فعال شد.`);
});

// ===============================
// 5) نمایش پیام‌های ورودی
// ===============================
bot.on("message", (msg) => {
  console.log("پیام جدید:", msg.text);
});

// ===============================
// 6) منوی اصلی ربات
// ===============================
bot.onText(/\/menu/, (msg) => {
  const chatId = msg.chat.id;

  const menu = {
    reply_markup: {
      keyboard: [
        ["🔍 ساخت فیلتر جدید"],
        ["📄 مشاهده فیلتر فعلی"],
        ["▶️ شروع جستجوی خودکار"],
        ["⏹ توقف جستجو"],
        ["🔗 دریافت لینک نهایی"],
        ["❓ راهنما"]
      ],
      resize_keyboard: true
    }
  };

  bot.sendMessage(chatId, "منوی اصلی 👇", menu);
});

// ===============================
// 7) اتصال به دیوار
// ===============================
const DIVAR_URL = "https://divar.ir/s/mashhad/apartment-sell";
let lastAds = new Set();

// گرفتن HTML صفحه دیوار
async function fetchDivarPage() {
  try {
    const response = await axios.get(DIVAR_URL);
    return response.data;
  } catch (err) {
    console.log("❌ خطا در دریافت دیوار:", err.message);
    return null;
  }
}

// استخراج آگهی‌ها
function extractAds(html) {
  const $ = cheerio.load(html);
  const ads = [];

  $("div.post-card-item").each((i, el) => {
    const title = $(el).find("h2").text().trim();
    const price = $(el).find(".kt-post-card__description").text().trim();
    const link = "https://divar.ir" + $(el).find("a").attr("href");

    if (title && link) {
      ads.push({ title, price, link });
    }
  });

  return ads;
}

// ارسال پیام به تلگرام
function sendToTelegram(ad) {
  const message = `
🏠 *${ad.title}*
💰 قیمت: ${ad.price}

🔗 لینک:
${ad.link}
`;

  bot.sendMessage(process.env.CHAT_ID, message, { parse_mode: "Markdown" });
}

// پردازش آگهی‌ها
function processAds(ads) {
  ads.forEach((ad) => {
    if (!lastAds.has(ad.link)) {
      lastAds.add(ad.link);
      sendToTelegram(ad);
    }
  });
}

// اجرای سیستم دیوار
async function runDivarSystem() {
  console.log("⏳ اجرای سیستم دیوار...");

  const html = await fetchDivarPage();
  if (!html) return;

  const ads = extractAds(html);
  processAds(ads);

  console.log("✔ پردازش انجام شد");
}

// اجرای هر ۱۵ دقیقه
setInterval(async () => {
  await runDivarSystem();
}, 15 * 60 * 1000);
