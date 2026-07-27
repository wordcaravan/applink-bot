require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");

// اتصال به ربات تلگرام
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال به دیتابیس MongoDB Atlas
async function connectDB() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("✔️ اتصال به MongoDB برقرار شد");
  } catch (err) {
    console.error("❌ خطا در اتصال به MongoDB:", err.message);
  }
}
connectDB();

// هندل پیام‌ها
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "/start") {
    bot.sendMessage(chatId, "سلام سعید! ربات اپ‌لینک آمادهٔ خدمت است ✔️");
    return;
  }

  bot.sendMessage(chatId, "پیامت رسید ✔️");
});
