const TelegramBot = require("node-telegram-bot-api");
const axios = require("axios");
const mongoose = require("mongoose");

const BOT_TOKEN = process.env.BOT_TOKEN;
const MONGO_URI = process.env.MONGO_URI;

const bot = new TelegramBot(BOT_TOKEN, { polling: true });

mongoose.connect(MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
});

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
      regions: [String],
      street: String,
      type: String,
      ownerType: String
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
      filters: {}
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

bot.onText(/\/start/, async (msg) => {
  await findOrCreateUser(msg, null);

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
});

bot.on("contact", async (msg) => {
  await findOrCreateUser(msg, msg.contact);

  bot.sendMessage(
    msg.chat.id,
    "شماره ثبت شد.\nحالا منطقه را انتخاب کن:",
    {
      reply_markup: {
        inline_keyboard: [
          [{ text: "📍 انتخاب منطقه", callback_data: "set_regions" }]
        ]
      }
    }
  );
});

bot.on("callback_query", async (query) => {
  const chat_id = query.message.chat.id;
  const data = query.data;

  if (data === "set_regions") {
    bot.sendMessage(chat_id, "منطقه را انتخاب کن:", {
      reply_markup: {
        inline_keyboard: [
          [
            { text: "✔ منطقه ۱", callback_data: "region_1" },
            { text: "✔ منطقه ۵", callback_data: "region_5" }
          ],
          [
            { text: "✔ منطقه ۱۰", callback_data: "region_10" },
            { text: "✔ منطقه ۱۲", callback_data: "region_12" }
          ],
          [{ text: "ادامه ➡️", callback_data: "next_street" }]
        ]
      }
    });
    return;
  }

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

  if (data === "next_street") {
    bot.sendMessage(chat_id, "نام خیابان را تایپ کن:");
    bot.answerCallbackQuery(query.id);
    return;
  }

  if (data.startsWith("type_")) {
    const typeMap = {
      type_apartment: "آپارتمان",
      type_house: "خانه",
      type_land: "زمین",
      type_shop: "مغازه",
      type_office: "دفتر کار"
    };
    await updateUserFilters(chat_id, { type: typeMap[data] });

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
    bot.answerCallbackQuery(query.id);
    return;
  }

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

  if (data === "start_search") {
    bot.answerCallbackQuery(query.id);
    bot.sendMessage(chat_id, "جستجو فعال شد. آگهی‌های جدید ارسال می‌شود.");
    return;
  }

  if (data.startsWith("save_")) {
    const postId = data.replace("save_", "");

    const title = "آپارتمان 85 متری";
    const price = "3,200,000,000";
    const area = "85";
    const region = "منطقه ۱۰";
    const street = "نرگس";
    const ownerType = "مالک";
    const description = "آپارتمان نوساز، نرگس 23 پلاک 70، طبقه دوم...";
    const mainImageUrl = "https://via.placeholder.com/600x400.png?text=Sample";

    const caption = `
📌 ذخیره آگهی

🏠 ${title}
💰 قیمت: ${price}
📐 متراژ: ${area}
📍 ${region}
🛣 خیابان: ${street}
👤 آگهی‌دهنده: ${ownerType}

🔗 لینک آگهی:
https://divar.ir/v/${postId}
    `;

    bot.sendPhoto(chat_id, mainImageUrl, {
      caption,
      reply_markup: {
        inline_keyboard: [
          [
            {
              text: "➕ ذخیره در پیام‌های ذخیره‌شده",
              url: `https://t.me/${process.env.BOT_USERNAME}?start=save_${postId}`
            }
          ]
        ]
      }
    });

    bot.answerCallbackQuery(query.id, { text: "آگهی برای ذخیره ارسال شد" });
    return;
  }
});

bot.on("message", async (msg) => {
  if (msg.text && !msg.text.startsWith("/") && !msg.contact) {
    await updateUserFilters(msg.chat.id, { street: msg.text.trim() });

    bot.sendMessage(
      msg.chat.id,
      "نوع ملک را انتخاب کن:",
      {
        reply_markup: {
          inline_keyboard: [
            [
              { text: "آپارتمان", callback_data: "type_apartment" },
              { text: "خانه", callback_data: "type_house" }
            ],
            [
              { text: "زمین", callback_data: "type_land" },
              { text: "مغازه", callback_data: "type_shop" }
            ],
            [{ text: "دفتر کار", callback_data: "type_office" }]
          ]
        }
      }
    );
  }
});

async function fetchDivarPostsForUser(user) {
  const filters = user.filters;
  if (!filters || !filters.street) return;

  const keyword = filters.street;

  try {
    const res = await axios.get(
      "https://api.divar.ir/v8/web-search/mashhad/real-estate",
      {
        headers: {
          "User-Agent": "Android"
        }
      }
    );

    const posts = res.data.web_items || [];

    for (const post of posts) {
      const postId = post.token;
      if (!postId) continue;

      const exists = await SeenPost.findOne({ post_id: postId });
      if (exists) continue;

      await new SeenPost({ post_id: postId, created_at: new Date() }).save();

      const description = post.description || "";
      const title = post.title || "";
      const location = post.location || "";
      const neighborhood = post.neighborhood || "";
      const district = post.district || "";

      const match =
        description.includes(keyword) ||
        title.includes(keyword) ||
        location.includes(keyword) ||
        neighborhood.includes(keyword) ||
        district.includes(keyword);

      if (!match) continue;

      const mainImageUrl = post.image_url || "https://via.placeholder.com/600x400";

      const caption = `
🏠 ${title}
📍 ${district}
🛣 ${filters.street}

🔎 توضیحات:
${description}

🔗 لینک آگهی:
https://divar.ir/v/${postId}
      `;

      bot.sendPhoto(user.chat_id, mainImageUrl, {
        caption,
        reply_markup: {
          inline_keyboard: [
            [
              {
                text: "📞 تماس امن",
                url: `https://divar.ir/v/${postId}`
              }
            ],
            [
              {
                text: "📌 ذخیره آگهی",
                callback_data: `save_${postId}`
              }
            ]
          ]
        }
      });
    }
  } catch (e) {
    console.log("خطای دیوار:", e.message);
  }
}

setInterval(async () => {
  const users = await User.find({});
  const now = new Date();

  for (const user of users) {
    if (user.subscription && user.subscription.end > now) {
      await fetchDivarPostsForUser(user);
    }
  }
}, 2000);
