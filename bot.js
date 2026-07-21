// ===============================
// 1) HTTP SERVER (برای Render)
// ===============================
const http = require("http");

const server = http.createServer((req, res) => {
  res.writeHead(200, { "Content-Type": "text/plain" });
  res.end("Bot is running");
});

server.listen(process.env.PORT || 3000, () => {
  console.log("HTTP server is running");
});

// ===============================
// 2) TELEGRAM BOT SETUP
// ===============================
const TelegramBot = require("node-telegram-bot-api");
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

console.log("Telegram bot is running...");

// ===============================
// 3) دستور /start
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
// 6) سیستم زمان‌بندی (هر ۱۵ دقیقه)
// ===============================

// این تابع بعداً سیستم دیوار → تلگرام را اجرا می‌کند
async function runDivarSystem() {
  console.log("⏳ اجرای سیستم دیوار...");
  // اینجا بعداً fetchDivarPage و extractAds و فیلترها را اضافه می‌کنیم
}

setInterval(async () => {
  await runDivarSystem();
}, 15 * 60 * 1000); // هر ۱۵ دقیقه
