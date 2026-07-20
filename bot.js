const TelegramBot = require("node-telegram-bot-api");

const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// دستور /start
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

// دریافت شماره تماس
bot.on("contact", (msg) => {
  const chatId = msg.chat.id;
  const phone = msg.contact.phone_number;
  const name = msg.contact.first_name;

  bot.sendMessage(chatId, `🌟 ${name}\nشماره ${phone} دریافت شد و سرویس فعال شد.`);
});

// اجرای ربات
bot.on("message", (msg) => {
  console.log("پیام جدید:", msg.text);
});
