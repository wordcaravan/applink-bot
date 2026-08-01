const express = require("express");
const app = express();

app.get("/", (req, res) => {
  res.send("Bot is running");
});

app.listen(process.env.PORT || 3000, () => {
  console.log("HTTP server is running...");
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
          ownerType: "",
          searchActive: false
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
        filters: {
          regions: [],
          street: "",
          estateType: "",
          adType: "",
          area: "",
          price: "",
          year: "",
          features: [],
          ownerType: "",
          searchActive: false
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
      "لطفاً یکی از گزینه‌های زیر را انتخاب کن:",
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
            [{ text: "🧍‍♂️ آگهی‌دهنده" }],
            [{ text: "🔍 جستجوی نهایی" }]
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
        "سلام سعید!\nبرای فعال‌سازی سرویس، شماره تماس خودت را ارسال کن.",
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
      return;
    }

    mainMenu(msg.chat.id);
  });

  bot.on("contact", async (msg) => {
    const user = await findOrCreateUser(msg, msg.contact);

    user.phone = msg.contact.phone_number;
    await user.save();

    bot.sendMessage(msg.chat.id, "شماره ثبت شد.");
    mainMenu(msg.chat.id);
  });

  bot.on("message", async (msg) => {
    const chat_id = msg.chat.id;
    const text = msg.text;

    if (!text || msg.contact) return;

    const user = await User.findOne({ chat_id });
    if (!user) return;

    if (!user.phone) {
      bot.sendMessage(chat_id, "لطفاً شماره تماس را ارسال کن.");
      return;
    }

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
      bot.sendMessage(chat_id, "حداقل متراژ را وارد کن:");
      bot.once("message", async (areaMsg) => {
        await updateUserFilters(chat_id, { area: areaMsg.text.trim() });
        bot.sendMessage(chat_id, "متراژ ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "💰 قیمت") {
      bot.sendMessage(chat_id, "حداکثر قیمت را وارد کن:");
      bot.once("message", async (priceMsg) => {
        await updateUserFilters(chat_id, { price: priceMsg.text.trim() });
        bot.sendMessage(chat_id, "قیمت ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "🗓️ سال ساخت") {
      bot.sendMessage(chat_id, "حداقل سال ساخت را وارد کن:");
      bot.once("message", async (yearMsg) => {
        await updateUserFilters(chat_id, { year: yearMsg.text.trim() });
        bot.sendMessage(chat_id, "سال ساخت ثبت شد.");
        mainMenu(chat_id);
      });
      return;
    }

    if (text === "🚗 امکانات") {
      bot.sendMessage(chat_id, "امکانات را انتخاب کن:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "پارکینگ", callback_data: "feat_parking" },
              { text: "انباری", callback_data: "feat_storage" }
            ],
            [
              { text: "آسانسور", callback_data: "feat_elevator" },
              { text: "بالکن/تراس", callback_data: "feat_balcony" }
            ],
            [{ text: "هیچکدام", callback_data: "feat_none" }]
          ]
        }
      });
      return;
    }

    if (text === "🧍‍♂️ آگهی‌دهنده") {
      bot.sendMessage(chat_id, "آگهی‌دهنده را انتخاب کن:", {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "مالک", callback_data: "owner_owner" },
              { text: "مشاور املاک", callback_data: "owner_agent" }
            ]
          ]
        }
      });
      return;
    }

    if (text === "🔍 جستجوی نهایی") {
      const f = user.filters;

      bot.sendMessage(
        chat_id,
        `خلاصهٔ فیلترهای شما:\n
📍 مناطق: ${f.regions.join(", ") || "—"}
🏞️ خیابان: ${f.street || "—"}
🏠 نوع ملک: ${f.estateType || "—"}
📄 نوع آگهی: ${f.adType || "—"}
📏 متراژ: ${f.area || "—"}
💰 قیمت: ${f.price || "—"}
🗓️ سال ساخت: ${f.year || "—"}
🚗 امکانات: ${f.features.join(", ") || "—"}
🧍‍♂️ آگهی‌دهنده: ${f.ownerType || "—"}`,
        {
          reply_markup: {
            inline_keyboard: [
              [{ text: "🔍 شروع جستجو", callback_data: "start_search" }],
              [{ text: "📄 لیست آگهی‌های یک ماه اخیر", callback_data: "list_month" }]
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

    const user = await User.findOne({ chat_id });
    if (!user) return;

    if (data.startsWith("region_")) {
      const regionName = "منطقه " + data.split("_")[1];

      if (!user.filters.regions.includes(regionName)) {
        user.filters.regions.push(regionName);
      } else {
        user.filters.regions = user.filters.regions.filter((r) => r !== regionName);
      }

      await user.save();
      bot.answerCallbackQuery(query.id, { text: `${regionName} ثبت شد` });
      return;
    }

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

    if (data.startsWith("feat_")) {
      const featMap = {
        feat_parking: "پارکینگ",
        feat_storage: "انباری",
        feat_elevator: "آسانسور",
        feat_balcony: "بالکن/تراس",
        feat_none: "هیچکدام"
      };

      const feat = featMap[data];

      if (data === "feat_none") {
        user.filters.features = [];
        await user.save();
        bot.answerCallbackQuery(query.id, { text: "امکانات حذف شد" });
        return;
      }

      if (!user.filters.features.includes(feat)) {
        user.filters.features.push(feat);
        bot.answerCallbackQuery(query.id, { text: `${feat} اضافه شد` });
      } else {
        user.filters.features = user.filters.features.filter((f) => f !== feat);
        bot.answerCallbackQuery(query.id, { text: `${feat} حذف شد` });
      }

      await user.save();
      return;
    }

    if (data === "owner_owner") {
      await updateUserFilters(chat_id, { ownerType: "مالک" });
      bot.answerCallbackQuery(query.id, { text: "مالک ثبت شد" });
      bot.sendMessage(chat_id, "فیلترها کامل شد. منتظر آگهی باشید.");
      return;
    }

    if (data === "owner_agent") {
      await updateUserFilters(chat_id, { ownerType: "مشاور املاک" });
      bot.answerCallbackQuery(query.id, { text: "مشاور املاک ثبت شد" });
      bot.sendMessage(chat_id, "فیلترها کامل شد. منتظر آگهی باشید.");
      return;
    }

    if (data === "start_search") {
      await updateUserFilters(chat_id, { searchActive: true });
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chat_id, "جستجو فعال شد. منتظر آگهی‌های جدید مطابق فیلتر خود باشید.");
      return;
    }

    if (data === "list_month") {
      bot.answerCallbackQuery(query.id);
      bot.sendMessage(chat_id, "در حال دریافت لیست آگهی‌های یک ماه اخیر مطابق فیلتر شما...");
      await fetchDivarHistoryForUser(user, bot);
      return;
    }
  });

  // ===============================
  // توابع کمکی و Listener
  // ===============================

  function normalizePrice(priceText) {
    if (!priceText) return 0;
    let txt = priceText.toString().replace(/\s/g, "");
    if (txt.includes("میلیارد")) {
      const num = parseInt(txt.replace("میلیارد", ""));
      return num * 1000000000;
    }
    return parseInt(txt);
  }

  async function applyFiltersToPost(post, user) {
    const title = post.data.title || "";
    const desc = post.data.description || "";
    const district = post.data.district || "";
    const price = post.data.price || "";
    const area = post.data.area || "";
    const year = post.data.year || "";
    const category = post.data.category || "";
    const business = post.data.business_type || "";

    // منطقه
    if (user.filters.regions.length > 0) {
      if (!user.filters.regions.includes(district)) return null;
    }

    // خیابان
    if (user.filters.street) {
      if (!desc.includes(user.filters.street)) return null;
    }

    // نوع ملک
    if (user.filters.estateType) {
      if (!category.includes(user.filters.estateType)) return null;
    }

    // نوع آگهی
    if (user.filters.adType === "فروش") {
      if (!desc.includes("فروش")) return null;
    }

    if (user.filters.adType === "رهن کامل") {
      if (!desc.includes("رهن کامل")) return null;
    }

    if (user.filters.adType === "رهن و اجاره") {
      if (!desc.includes("اجاره")) return null;
    }

    // متراژ
    if (user.filters.area) {
      if (parseInt(area) < parseInt(user.filters.area)) return null;
    }

    // قیمت
    if (user.filters.price) {
      const normalizedPrice = normalizePrice(price);
      if (normalizedPrice > parseInt(user.filters.price)) return null;
    }

    // سال ساخت
    if (user.filters.year) {
      if (parseInt(year) < parseInt(user.filters.year)) return null;
    }

    // امکانات
    if (user.filters.features.length > 0) {
      const features = user.filters.features;

      const hasParking = desc.includes("پارکینگ");
      const hasStorage = desc.includes("انباری");
      const hasElevator = desc.includes("آسانسور");
      const hasBalcony = desc.includes("بالکن") || desc.includes("تراس");

      if (features.includes("پارکینگ") && !hasParking) return null;
      if (features.includes("انباری") && !hasStorage) return null;
      if (features.includes("آسانسور") && !hasElevator) return null;
      if (features.includes("بالکن/تراس") && !hasBalcony) return null;
    }

    // مالک / مشاور
    if (user.filters.ownerType === "مالک") {
      if (business !== "personal") return null;
    }

    if (user.filters.ownerType === "مشاور املاک") {
      if (business !== "business") return null;
    }

    return {
      title,
      desc,
      district,
      price,
      area,
      year,
      token: post.data.token
    };
  }

  async function fetchDivarPostsForUser(user, botInstance) {
    if (!user.filters.searchActive) return;

    try {
      const url = `https://api.divar.ir/v8/web-search/mashhad/real-estate`;

      const response = await axios.post(url, {
        query: user.filters.estateType || "",
        city: "mashhad"
      });

      const posts = response.data.widget_list.slice(0, 10);

      for (const post of posts) {
        const token = post.data.token;
        const post_id = token;

        const seen = await SeenPost.findOne({ post_id });
        if (seen) continue;

        const filtered = await applyFiltersToPost(post, user);
        if (!filtered) continue;

        await new SeenPost({ post_id, created_at: new Date() }).save();

        botInstance.sendMessage(
          user.chat_id,
          `🏠 *${filtered.title}*\n\n📍 منطقه: ${filtered.district}\n📏 متراژ: ${filtered.area}\n💰 قیمت: ${filtered.price}\n🗓 سال ساخت: ${filtered.year}\n\n${filtered.desc}\n\n🔗 لینک آگهی:\nhttps://divar.ir/v/${filtered.token}`,
          { parse_mode: "Markdown" }
        );
      }
    } catch (err) {
      console.log("Error fetching Divar:", err.message);
    }
  }

  async function fetchDivarHistoryForUser(user, botInstance) {
    try {
      const url = `https://api.divar.ir/v8/web-search/mashhad/real-estate`;

      const response = await axios.post(url, {
        query: user.filters.estateType || "",
        city: "mashhad"
      });

      const posts = response.data.widget_list.slice(0, 50);

      let count = 0;

      for (const post of posts) {
        const filtered = await applyFiltersToPost(post, user);
        if (!filtered) continue;

        count++;

        botInstance.sendMessage(
          user.chat_id,
          `📄 آگهی ${count}:\n\n🏠 *${filtered.title}*\n\n📍 منطقه: ${filtered.district}\n📏 متراژ: ${filtered.area}\n💰 قیمت: ${filtered.price}\n🗓 سال ساخت: ${filtered.year}\n\n${filtered.desc}\n\n🔗 لینک آگهی:\nhttps://divar.ir/v/${filtered.token}`,
          { parse_mode: "Markdown" }
        );
      }

      if (count === 0) {
        botInstance.sendMessage(
          user.chat_id,
          "هیچ آگهی مطابق فیلتر شما در یک ماه اخیر پیدا نشد."
        );
      } else {
        botInstance.sendMessage(
          user.chat_id,
          `لیست آگهی‌های یک ماه اخیر مطابق فیلتر شما ارسال شد. (${count} آگهی)`
        );
      }
    } catch (err) {
      console.log("Error fetching Divar history:", err.message);
    }
  }

  setInterval(async () => {
    const users = await User.find({});
    for (const user of users) {
      await fetchDivarPostsForUser(user, bot);
    }
  }, 10000); // هر ۱۰ ثانیه، سبک‌تر و مناسب چند کاربر
}

start();
