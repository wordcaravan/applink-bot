require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

// اتصال به تلگرام
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال به MongoDB Atlas
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✔️ اتصال به MongoDB برقرار شد");
  } catch (err) {
    console.error("❌ خطا در اتصال به MongoDB:", err.message);
  }
}
connectDB();

// پیام شروع
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // اگر کاربر /start بزند
  if (msg.text === "/start") {
    bot.sendMessage(chatId, "سلام سعید! ربات اپ‌لینک آمادهٔ خدمت است ✔️");
    return;
  }

  // پاسخ پیش‌فرض
  bot.sendMessage(chatId, "پیامت رسید ✔️");
});
