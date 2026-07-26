require("dotenv").config();
const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const User = require("./models/user");
const Office = require("./models/office");
const streets = require("./data/streetsDB.json");

// اتصال ربات
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// اتصال دیتابیس
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

// منوی اصلی
const mainMenu = {
  reply_markup: {
    keyboard: [["📍 انتخاب منطقه", "⚙️ تنظیمات فیلتر"]],
    resize_keyboard: true
  }
};

// پیام‌ها
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;
  const text = (msg.text || "").trim();

  // انتخاب منطقه
  if (text === "📍 انتخاب منطقه") {
    return bot.sendMessage(chatId, "منطقه را انتخاب کنید:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "منطقه ۱", callback_data: "zone_1" },
            { text: "منطقه ۲", callback_data: "zone_2" },
            { text: "منطقه ۳", callback_data: "zone_3" }
          ],
          [
            { text: "منطقه ۴", callback_data: "zone_4" },
            { text: "منطقه ۵", callback_data: "zone_5" },
            { text: "منطقه ۶", callback_data: "zone_6" }
          ],
          [
            { text: "منطقه ۷", callback_data: "zone_7" },
            { text: "منطقه ۸", callback_data: "zone_8" },
            { text: "منطقه ۹", callback_data: "zone_9" }
          ],
          [
            { text: "منطقه ۱۰", callback_data: "zone_10" },
            { text: "منطقه ۱۱", callback_data: "zone_11" },
            { text: "منطقه ۱۲", callback_data: "zone_12" }
          ]
        ]
      }
    });
  }

  // تشخیص خیابان از دیتابیس
  if (streets[text]) {
    const info = streets[text];

    await User.findOneAndUpdate(
      { chatId },
      {
        zone: info.zone,
        street: text,
        neighborhood: info.neighborhood
      },
      { upsert: true }
    );

    return showFilterWindow(chatId);
  }

  // پیام پیش‌فرض
  bot.sendMessage(chatId, "برای شروع یکی از گزینه‌ها را انتخاب کنید.", mainMenu);
});

// هندلر دکمه‌ها
bot.on("callback_query", async (query) => {
  const chatId = query.message.chat.id;
  const data = query.data;

  // انتخاب منطقه
  if (data.startsWith("zone_")) {
    const zone = data.replace("zone_", "");

    await User.findOneAndUpdate(
      { chatId },
      { zone },
      { upsert: true }
    );

    return bot.sendMessage(
      chatId,
      `منطقه ${zone} انتخاب شد ✔\n\nنام خیابان یا کوچه را وارد کنید:`
    );
  }

  // نمایش منوی منطقه
  if (data === "zone_menu") {
    return bot.sendMessage(chatId, "منطقه را انتخاب کنید:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "منطقه ۱", callback_data: "zone_1" },
            { text: "منطقه ۲", callback_data: "zone_2" },
            { text: "منطقه ۳", callback_data: "zone_3" }
          ],
          [
            { text: "منطقه ۴", callback_data: "zone_4" },
            { text: "منطقه ۵", callback_data: "zone_5" },
            { text: "منطقه ۶", callback_data: "zone_6" }
          ],
          [
            { text: "منطقه ۷", callback_data: "zone_7" },
            { text: "منطقه ۸", callback_data: "zone_8" },
            { text: "منطقه ۹", callback_data: "zone_9" }
          ],
          [
            { text: "منطقه ۱۰", callback_data: "zone_10" },
            { text: "منطقه ۱۱", callback_data: "zone_11" },
            { text: "منطقه ۱۲", callback_data: "zone_12" }
          ]
        ]
      }
    });
  }

  // تغییر خیابان
  if (data === "change_street") {
    return bot.sendMessage(chatId, "نام خیابان جدید را وارد کنید:");
  }

  // تغییر قیمت
  if (data === "change_price") {
    return bot.sendMessage(chatId, "قیمت را وارد کنید:\nمثال: 3-5 میلیارد");
  }

  // تغییر متراژ
  if (data === "change_area") {
    return bot.sendMessage(chatId, "متراژ را وارد کنید:\nمثال: 80-120");
  }

  // تغییر نوع آگهی‌دهنده
  if (data === "change_owner") {
    await User.findOneAndUpdate(
      { chatId },
      { ownerType: "personal" },
      { upsert: true }
    );
    return bot.sendMessage(chatId, "نوع آگهی‌دهنده روی مالک تنظیم شد ✔");
  }

  // جستجوی فوری
  if (data === "search_now") {
    const user = await User.findOne({ chatId });
    const item = await getDivarItem(user);

    if (!item) {
      return bot.sendMessage(chatId, "هیچ فایل واقعی پیدا نشد ❌");
    }

    return sendDivarItem(chatId, item);
  }
});

// نمایش پنجره فیلتر حرفه‌ای
async function showFilterWindow(chatId) {
  const user = await User.findOne({ chatId }) || {};

  const text =
    `⚙️ فیلتر شما:\n\n` +
    `📍 منطقه: ${user.zone || "انتخاب نشده"}\n` +
    `📍 محله: ${user.neighborhood || "انتخاب نشده"}\n` +
    `📍 خیابان: ${user.street || "انتخاب نشده"}\n` +
    `💰 قیمت: ${user.price || "انتخاب نشده"}\n` +
    `📐 متراژ: ${user.area || "انتخاب نشده"}\n` +
    `👤 نوع آگهی‌دهنده: ${user.ownerType === "personal" ? "مالک" : "مشاور"}\n`;

  bot.sendMessage(chatId, text, {
    reply_markup: {
      inline_keyboard: [
        [{ text: "🔄 تغییر منطقه", callback_data: "zone_menu" }],
        [{ text: "🔄 تغییر خیابان", callback_data: "change_street" }],
        [{ text: "🔄 تغییر قیمت", callback_data: "change_price" }],
        [{ text: "🔄 تغییر متراژ", callback_data: "change_area" }],
        [{ text: "🔄 تغییر نوع آگهی‌دهنده", callback_data: "change_owner" }],
        [{ text: "🔍 جستجوی فوری", callback_data: "search_now" }]
      ]
    }
  });
}

// جستجو در دیوار (نسخه ساده)
async function getDivarItem(user) {
  // اینجا بعداً API دیوار را اضافه می‌کنیم
  return null;
}

// ارسال فایل دیوار
async function sendDivarItem(chatId, item) {
  await bot.sendMessage(
    chatId,
    `عنوان: ${item.title}\nقیمت: ${item.price}\nلینک: ${item.link}`
  );
      }
