const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("HTTP server is running on port " + (process.env.PORT || 3000));
});

const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const mongoose = require("mongoose");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

async function start() {
  await mongoose.connect(MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true
  });

  const bot = new TelegramBot(BOT_TOKEN, { polling: true });

  const User = mongoose.model(
    "User",
    new mongoose.Schema({
      chat_id: Number,
      user_id: Number,
      name: String,
      phone: String,
      created_at: Date,
      subscription: {
        plan: String,
        start: Date,
        end: Date,
        autoRenew: Boolean
      },
      filters: {
        type: Object,
        default: {
          regions: [],
          street: "",
          estateType: "",
          adType: "",
          area: "",
          price: "",
          year: "",
          features: [],
          ownerType: ""
        }
      }
    })
  );

  const SeenPost = mongoose.model(
    "SeenPost",
    new mongoose.Schema({
      post_id: String,
      created_at: Date
    })
  );

  async function findOrCreateUser(msg, contact) {
    const chat_id = msg.chat.id;
    let user = await User.findOne({ chat_id });

    if (!user) {
      user = new User({
        chat_id,
        user_id: msg.from.id,
        name: contact ? contact.first_name : msg.from.first_name,
        phone: contact ? contact.phone_number : null,
        created_at: new Date(),
        subscription: {
          plan: "monthly",
          start: new Date(),
          end: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
          autoRenew: true
        },
        filters: {
          regions: [],
          street: "",
          estateType: "",
          adType: "",
          area: "",
          price: "",
          year: "",
          features: [],
          ownerType: ""
        }
      });
      await user.save();
    }
    return user;
  }

  async function updateUserFilters(chat_id, newFilters) {
    const user = await User.findOne({ chat_id });
    if (!user) return;
    user.filters = { ...user.filters, ...newFilters };
    await user.save();
  }

  function mainMenu(chat_id) {
    bot.sendMessage(
      chat_id,
      "سلام! لطفاً یکی از گزینه‌های زیر را انتخاب کن:",
      {
        reply_markup: {
          keyboard: [
            [{ text: "📍 انتخاب منطقه" }],
            [{ text: "🏞️ انتخاب خیابان" }],
            [{ text: "🏠 نوع ملک" }],
            [{ text: "📄 نوع آگهی" }],
            [{ text: "📏 متراژ" }],
            [{ text: "💰 قیمت" }],
            [{ text: "🗓️ سال ساخت" }],
            [{ text: "🚗 امکانات" }],
            [{ text: "🔍 جست‌وجوی نهایی" }]
          ],
          resize_keyboard: true
        }
      }
    );
  }

  bot.onText(/\/start/, async (msg) => {
    const user = await findOrCreateUser(msg, null);

    if (!user.phone) {
      bot.sendMessage(
        msg.chat.id,
        "سلام\nبرای فعال‌سازی سرویس، شماره تماس خودت را ارسال کن.",
        {
          reply_markup: {
            keyboard: [
              [
                {
                  text: "📞 ارسال شماره تماس",
                  request_contact: true
                }
              ]
            ],
            resize_keyboard: true
          }
        }
      );
    } else {
      mainMenu(msg.chat.id);
    }
  });

  bot.on("contact", async (msg) => {
    await findOrCreateUser(msg, msg.contact);
    mainMenu(msg.chat.id);
  });

  bot.on("message", async (msg) => {
    const chat_id = msg.chat.id;
    const text = msg.text;

    if (!text || msg.contact) return;

    // منوی اصلی
    if (text === "📍 انتخاب منطقه") {
      bot.sendMessage(chat_id, "منطقه را انتخاب کن:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "✔ منطقه ۱", callback_data: "region_1" },
              { text: "✔ منطقه ۲", callback_data: "region_2" }
            ],
            [
              { text: "✔ منطقه ۳", callback_data: "region_3" },
              { text: "✔ منطقه ۴", callback_data: "region_4" }
            ],
            [
              { text: "✔ منطقه ۵", callback_data: "region_5" },
              { text: "✔ منطقه ۶", callback_data: "region_6" }
            ],
            [
              { text: "✔ منطقه ۷", callback_data: "region_7" },
              { text: "✔ منطقه ۸", callback_data: "region_8" }
            ],
            [
              { text: "✔ منطقه ۹", callback_data: "region_9" },
              { text: "✔ منطقه ۱۰", callback_data: "region_10" }
            ],
            [
              { text: "✔ منطقه ۱۱", callback_data: "region_11" },
              { text: "✔ منطقه ۱۲", callback_data: "region_12" }
            ]
          ]
        }
      });
      return;
    }

    if (text === "🏞️ انتخاب خیابان") {
      bot.sendMessage(chat_id, "نام خیابان را تایپ کن:");
      bot.once("message", async (streetMsg) => {
        if (!streetMsg.text) return;
        await updateUserFilters(chat_id, { street: streetMsg.text.trim() });
        bot.sendMessage(chat_id, "خیابان ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "🏠 نوع ملک") {
      bot.sendMessage(chat_id, "نوع ملک را انتخاب کن:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "آپارتمان", callback_data: "estate_apartment" },
              { text: "خانه", callback_data: "estate_house" }
            ],
            [
              { text: "زمین", callback_data: "estate_land" },
              { text: "مغازه", callback_data: "estate_shop" }
            ],
            [{ text: "دفتر کار", callback_data: "estate_office" }]
          ]
        }
      });
      return;
    }

    if (text === "📄 نوع آگهی") {
      bot.sendMessage(chat_id, "نوع آگهی را انتخاب کن:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "فروش", callback_data: "ad_sell" },
              { text: "رهن کامل", callback_data: "ad_full" }
            ],
            [{ text: "رهن و اجاره", callback_data: "ad_rent" }]
          ]
        }
      });
      return;
    }

    if (text === "📏 متراژ") {
      bot.sendMessage(chat_id, "حداقل متراژ را وارد کن (مثلاً ۸۰):");
      bot.once("message", async (areaMsg) => {
        if (!areaMsg.text) return;
        await updateUserFilters(chat_id, { area: areaMsg.text.trim() });
        bot.sendMessage(chat_id, "متراژ ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "💰 قیمت") {
      bot.sendMessage(chat_id, "حداکثر قیمت را وارد کن (مثلاً ۳۰۰۰۰۰۰۰۰۰):");
      bot.once("message", async (priceMsg) => {
        if (!priceMsg.text) return;
        await updateUserFilters(chat_id, { price: priceMsg.text.trim() });
        bot.sendMessage(chat_id, "قیمت ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "🗓️ سال ساخت") {
      bot.sendMessage(chat_id, "حداقل سال ساخت را وارد کن (مثلاً ۱۳۹۵):");
      bot.once("message", async (yearMsg) => {
        if (!yearMsg.text) return;
        await updateUserFilters(chat_id, { year: yearMsg.text.trim() });
        bot.sendMessage(chat_id, "سال ساخت ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "🚗 امکانات") {
      bot.sendMessage(
        chat_id,
        "امکانات را انتخاب کن:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "پارکینگ", callback_data: "feat_parking" },
                { text: "انباری", callback_data: "feat_storage" }
              ],
              [
                { text: "آسانسور", callback_data: "feat_elevator" },
                { text: "بالکن", callback_data: "feat_balcony" }
              ]
            ]
          }
        }
      );
      return;
    }

    if (text === "🔍 جست‌وجوی نهایی") {
      bot.sendMessage(
        chat_id,
        "آگهی‌دهنده را انتخاب کن:",
        {
          reply_markup: {
            inline_keyboard: [
              [
                { text: "👤 مالک", callback_data: "owner_owner" },
                { text: "🏢 مشاور املاک", callback_data: "owner_agent" }
              ],
              [{ text: "🔍 شروع جستجو", callback_data: "start_search" }]
            ]
          }
        }
      );
      return;
    }
  });

  bot.on("callback_query", async (query) => {
    const chat_id = query.message.chat.id;
    const data = query.data;

    // مناطق
    if (data.startsWith("region_")) {
      const regionName = "منطقه " + data.split("_")[1];
      const user = await User.findOne({ chat_id });

      if (!user.filters.regions) user.filters.regions = [];

      if (!user.filters.regions.includes(regionName)) {
        user.filters.regions.push(regionName);
      } else {
        user.filters.regions = user.filters.regions.filter((r) => r !== regionName);
      }

      await user.save();
      bot.answerCallbackQuery(query.id, { text: `${regionName} ثبت شد` });
      return;
    }

    // نوع ملک
    if (data.startsWith("estate_")) {
      const map = {
        estate_apartment: "آپارتمان",
        estate_house: "خانه",
        estate_land: "زمین",
        estate_shop: "مغازه",
        estate_office: "دفتر کار"
      };
      await updateUserFilters(chat_id, { estateType: map[data] });
      bot.answerCallbackQuery(query.id, { text: `نوع ملک: ${map[data]}` });
      return;
    }

    // نوع آگهی
    if (data === "ad_sell") {
      await updateUserFilters(chat_id, { adType: "فروش" });
      bot.answerCallbackQuery(query.id, { text: "نوع آگهی: فروش" });
      return;
    }

    if (data === "ad_full") {
      await updateUserFilters(chat_id, { adType: "رهن کامل" });
      bot.answerCallbackQuery(query.id, { text: "نوع آگهی: رهن کامل" });
      return;
    }

    if (data === "ad_rent") {
      await updateUserFilters(chat_id, { adType: "رهن و اجاره" });
      bot.answerCallbackQuery(query.id, { text: "نوع آگهی: رهن و اجاره" });
      return;
    }

    // امکانات
    if (data.startsWith("feat_")) {
      const featMap = {
        feat_parking: "پارکینگ",
        feat_storage: "انباری",
        feat_elevator: "آسانسور",
        feat_balcony: "بالکن"
      };

      const user = await User.findOne({ chat_id });
      if (!user.filters.features) user.filters.features = [];

      const feat = featMap[data];

      if (!user.filters.features.includes(feat)) {
        user.filters.features.push(feat);
      } else {
        user.filters.features = user.filters.features.filter((f) => f !== feat);
      }

      await user.save();
      bot.answerCallbackQuery(query.id, { text: `امکانات: ${feat}` });
      return;
    }

    // مالک / مشاور
    if (data === "owner_owner") {
      await updateUserFilters(chat_id, { ownerType: "مالک" });
      bot.answerCallbackQuery(query.id, { text: "مالک ثبت شد" });
      return;
    }

    if (data === "owner_agent") {
      await updateUserFilters(chat_id, { ownerType: "مشاور املاک" });
      bot.answerCallbackQuery(query.id, { text: "مشاور املاک ثبت شد" });
      return;
    }

    // شروع جستجو
    if (data === "start_search") {
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chat_id, "جستجو فعال شد. آگهی‌های جدید ارسال می‌شود.");
      return;
    }
  });

  // اینجا بعداً Listener دیوار را بر اساس filters کامل می‌کنیم
  setInterval(async () => {
    const users = await User.find({});
    const now = new Date();

    for (const user of users) {
      if (user.subscription && user.subscription.end > now) {
        // TODO: fetchDivarPostsForUser(user) با فیلترهای کامل
      }
    }
  }, 5000);
}

start();
