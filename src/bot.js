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

    if (!Array.isArray(user.filters.features)) user.filters.features = [];
    if (!Array.isArray(user.filters.regions)) user.filters.regions = [];

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
        "سلام!\nبرای فعال‌سازی سرویس، شماره تماس خودت را ارسال کن.",
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
              { text: "✔ منطقه ۱", callback_data: "region_منطقه ۱" },
              { text: "✔ منطقه ۲", callback_data: "region_منطقه ۲" }
            ],
            [
              { text: "✔ منطقه ۳", callback_data: "region_منطقه ۳" },
              { text: "✔ منطقه ۴", callback_data: "region_منطقه ۴" }
            ],
            [
              { text: "✔ منطقه ۵", callback_data: "region_منطقه ۵" },
              { text: "✔ منطقه ۶", callback_data: "region_منطقه ۶" }
            ],
            [
              { text: "✔ منطقه ۷", callback_data: "region_منطقه ۷" },
              { text: "✔ منطقه ۸", callback_data: "region_منطقه ۸" }
            ],
            [
              { text: "✔ منطقه ۹", callback_data: "region_منطقه ۹" },
              { text: "✔ منطقه ۱۰", callback_data: "region_منطقه ۱۰" }
            ],
            [
              { text: "✔ منطقه ۱۱", callback_data: "region_منطقه ۱۱" },
              { text: "✔ منطقه ۱۲", callback_data: "region_منطقه ۱۲" }
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
              { text: "آپارتمان", callback_data: "estate_آپارتمان" },
              { text: "خانه", callback_data: "estate_خانه" }
            ],
            [
              { text: "زمین", callback_data: "estate_زمین" },
              { text: "مغازه", callback_data: "estate_مغازه" }
            ],
            [{ text: "دفتر کار", callback_data: "estate_دفتر کار" }]
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
              { text: "فروش", callback_data: "ad_فروش" },
              { text: "رهن کامل", callback_data: "ad_رهن کامل" }
            ],
            [{ text: "رهن و اجاره", callback_data: "ad_رهن و اجاره" }]
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
              { text: "پارکینگ", callback_data: "feat_پارکینگ" },
              { text: "انباری", callback_data: "feat_انباری" }
            ],
            [
              { text: "آسانسور", callback_data: "feat_آسانسور" },
              { text: "بالکن/تراس", callback_data: "feat_بالکن/تراس" }
            ],
            [{ text: "هیچکدام", callback_data: "feat_هیچکدام" }]
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
              { text: "مالک", callback_data: "owner_مالک" },
              { text: "مشاور املاک", callback_data: "owner_مشاور املاک" }
            ]
          ]
        }
      });
      return;
    }

    if (text === "🔍 جستجوی نهایی") {
      const f = user.filters || {};

      if (!Array.isArray(f.features)) f.features = [];
      if (!Array.isArray(f.regions)) f.regions = [];

      bot.sendMessage(
        chat_id,
        `خلاصهٔ فیلترهای شما:\n
📍 مناطق: ${f.regions.length ? f.regions.join(", ") : "—"}
🏞️ خیابان: ${f.street || "—"}
🏠 نوع ملک: ${f.estateType || "—"}
📄 نوع آگهی: ${f.adType || "—"}
📏 متراژ: ${f.area || "—"}
💰 قیمت: ${f.price || "—"}
🗓️ سال ساخت: ${f.year || "—"}
🚗 امکانات: ${f.features.length ? f.features.join(", ") : "—"}
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

    if (!user.filters) {
      user.filters = {
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
      };
      await user.save();
    }

    if (!Array.isArray(user.filters.features)) user.filters.features = [];
    if (!Array.isArray(user.filters.regions)) user.filters.regions = [];

    if (data.startsWith("region_")) {
      const regionName = data.replace("region_", "");

      if (!user.filters.regions.includes(regionName)) {
        user.filters.regions.push(regionName);
        await user.save();
        bot.answerCallbackQuery(query.id, { text: `${regionName} اضافه شد` });
      } else {
        user.filters.regions = user.filters.regions.filter((r) => r !== regionName);
        await user.save();
        bot.answerCallbackQuery(query.id, { text: `${regionName} حذف شد` });
      }
      return;
    }

    if (data.startsWith("estate_")) {
      const estateType = data.replace("estate_", "");
      await updateUserFilters(chat_id, { estateType });
      bot.answerCallbackQuery(query.id, { text: `نوع ملک: ${estateType}` });
      return;
    }

    if (data.startsWith("ad_")) {
      const adType = data.replace("ad_", "");
      await updateUserFilters(chat_id, { adType });
      bot.answerCallbackQuery(query.id, { text: `نوع آگهی: ${adType}` });
      return;
    }

    if (data.startsWith("feat_")) {
      const feat = data.replace("feat_", "");

      if (feat === "هیچکدام") {
        user.filters.features = [];
        await user.save();
        bot.answerCallbackQuery(query.id, { text: "امکانات حذف شد" });
        return;
      }

      if (!user.filters.features.includes(feat)) {
        user.filters.features.push(feat);
        await user.save();
        bot.answerCallbackQuery(query.id, { text: `${feat} اضافه شد` });
      } else {
        user.filters.features = user.filters.features.filter((f) => f !== feat);
        await user.save();
        bot.answerCallbackQuery(query.id, { text: `${feat} حذف شد` });
      }
      return;
    }

    if (data.startsWith("owner_")) {
      const ownerType = data.replace("owner_", "");
      await updateUserFilters(chat_id, { ownerType });
      bot.answerCallbackQuery(query.id, { text: `${ownerType} ثبت شد` });
      return bot.sendMessage(chat_id, "فیلترها کامل شد. منتظر آگهی باشید.");
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

    const filters = user.filters || {};
    if (!Array.isArray(filters.features)) filters.features = [];
    if (!Array.isArray(filters.regions)) filters.regions = [];

    if (filters.regions.length > 0) {
      if (!filters.regions.includes(district)) return null;
    }

    if (filters.street) {
      if (!desc.includes(filters.street)) return null;
    }

    if (filters.estateType) {
      if (!category.includes(filters.estateType)) return null;
    }

    if (filters.adType === "فروش") {
      if (!desc.includes("فروش")) return null;
    }

    if (filters.adType === "رهن کامل") {
      if (!desc.includes("رهن کامل")) return null;
    }

    if (filters.adType === "رهن و اجاره") {
      if (!desc.includes("اجاره")) return null;
    }

    if (filters.area) {
      if (parseInt(area) < parseInt(filters.area)) return null;
    }

    if (filters.price) {
      const normalizedPrice = normalizePrice(price);
      if (normalizedPrice > parseInt(filters.price)) return null;
    }

    if (filters.year) {
      if (parseInt(year) < parseInt(filters.year)) return null;
    }

    if (filters.features.length > 0) {
      const features = filters.features;

      const hasParking = desc.includes("پارکینگ");
      const hasStorage = desc.includes("انباری");
      const hasElevator = desc.includes("آسانسور");
      const hasBalcony = desc.includes("بالکن") || desc.includes("تراس");

      if (features.includes("پارکینگ") && !hasParking) return null;
      if (features.includes("انباری") && !hasStorage) return null;
      if (features.includes("آسانسور") && !hasElevator) return null;
      if (features.includes("بالکن/تراس") && !hasBalcony) return null;
    }

    if (filters.ownerType === "مالک") {
      if (business !== "personal") return null;
    }

    if (filters.ownerType === "مشاور املاک") {
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
    const filters = user.filters || {};
    if (!filters.searchActive) return;

    try {
      const url = `https://api.divar.ir/v8/web-search/mashhad/real-estate`;

      const response = await axios.post(url, {
        query: filters.estateType || "",
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
    const filters = user.filters || {};

    try {
      const url = `https://api.divar.ir/v8/web-search/mashhad/real-estate`;

      const response = await axios.post(url, {
        query: filters.estateType || "",
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
  }, 10000);
}

start();
