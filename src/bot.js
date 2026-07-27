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


// ===============================
// دکمه‌های اصلی سرچ
// ===============================
const mainSearchMenu = {
  reply_markup: {
    inline_keyboard: [
      [{ text: "📍 انتخاب منطقه", callback_data: "zone" }],
      [{ text: "🛣 انتخاب خیابان", callback_data: "street" }],
      [{ text: "🏠 نوع ملک", callback_data: "type" }],
      [{ text: "📏 متراژ", callback_data: "meter" }],
      [{ text: "💰 قیمت", callback_data: "price" }],
      [{ text: "📅 سال ساخت", callback_data: "year" }],
      [{ text: "🚗 امکانات", callback_data: "options" }],
      [{ text: "🔍 جست‌وجوی نهایی", callback_data: "final_search" }]
    ]
  }
};


// ===============================
// دستور /start
// ===============================
bot.onText(/\/start/, (msg) => {
  const chatId = msg.chat.id;

  bot.sendMessage(
    chatId,
    "سلام سعید! لطفاً یکی از گزینه‌های زیر را انتخاب کن:",
    mainSearchMenu
  );
});


// ===============================
// هندل کلیک روی دکمه‌ها
// ===============================
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  if (data === "zone") {
    bot.sendMessage(chatId, "منطقه مورد نظر را وارد کن:");
  }

  if (data === "street") {
    bot.sendMessage(chatId, "نام خیابان را وارد کن:");
  }

  if (data === "type") {
    bot.sendMessage(chatId, "نوع ملک را وارد کن (آپارتمان، خانه، زمین و...)");
  }

  if (data === "meter") {
    bot.sendMessage(chatId, "متراژ مورد نظر را وارد کن (مثلاً 80-120):");
  }

  if (data === "price") {
    bot.sendMessage(chatId, "بازه قیمت را وارد کن (مثلاً 3-5 میلیارد):");
  }

  if (data === "year") {
    bot.sendMessage(chatId, "سال ساخت مورد نظر را وارد کن:");
  }

  if (data === "options") {
    bot.sendMessage(chatId, "امکانات مورد نظر را وارد کن (آسانسور، پارکینگ، انباری):");
  }

  if (data === "final_search") {
    bot.sendMessage(chatId, "در حال ساخت جست‌وجو...");
  }
});


// ===============================
// هندل پیام‌های کاربر
// ===============================
bot.on("message", (msg) => {
  const chatId = msg.chat.id;

  // جلوگیری از تکرار پیام "پیامت رسید"
  if (msg.text.startsWith("/")) return;
});
