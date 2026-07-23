const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
const axios = require("axios");
require("dotenv").config();

// ------------------ اتصال به MongoDB ------------------
mongoose
  .connect(process.env.MONGO_URL, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log("MongoDB Connected"))
  .catch((err) => console.log("MongoDB Error:", err));

// ------------------ مدل کاربر ------------------
const userSchema = new mongoose.Schema({
  chatId: Number,
  phone: String,
  neighborhood: String,
  price: String,
  area: String,
});

const User = mongoose.model("User", userSchema);

// ------------------ اتصال به ربات ------------------
const bot = new TelegramBot(process.env.BOT_TOKEN, { polling: true });

// ------------------ منوی اصلی ------------------
const mainMenu = {
  reply_markup: {
    keyboard: [
      ["📱 ثبت شماره"],
      ["📍 انتخاب محله"],
      ["💰 انتخاب قیمت"],
      ["📐 انتخاب متراژ"],
      ["🔍 جستجوی فایل‌های دیوار"],
    ],
    resize_keyboard: true,
  },
};

// ------------------ شروع ------------------
bot.onText(/\/start/, async (msg) => {
  const chatId = msg.chat.id;

  await User.findOneAndUpdate(
    { chatId },
    { chatId },
    { upsert: true, new: true }
  );

  bot.sendMessage(chatId, "سلام سعید! 👋\nبه ربات آپ‌لینک خوش آمدی.", mainMenu);
});

// ------------------ ثبت شماره ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "📱 ثبت شماره") {
    bot.sendMessage(chatId, "لطفاً شماره‌ات را ارسال کن یا روی دکمه زیر بزن:", {
      reply_markup: {
        keyboard: [
          [
            {
              text: "ارسال شماره من",
              request_contact: true,
            },
          ],
        ],
        resize_keyboard: true,
      },
    });
  }

  if (msg.contact) {
    await User.findOneAndUpdate(
      { chatId },
      { phone: msg.contact.phone_number }
    );

    bot.sendMessage(chatId, "شماره با موفقیت ثبت شد ✔", mainMenu);
  }
});

// ------------------ انتخاب محله ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "📍 انتخاب محله") {
    bot.sendMessage(chatId, "محله مورد نظر را وارد کن:");
    return;
  }

  const user = await User.findOne({ chatId });

  if (user && !user.neighborhood && msg.text !== "📍 انتخاب محله") {
    await User.findOneAndUpdate({ chatId }, { neighborhood: msg.text });
    bot.sendMessage(chatId, "محله ذخیره شد ✔", mainMenu);
  }
});

// ------------------ انتخاب قیمت ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "💰 انتخاب قیمت") {
    bot.sendMessage(chatId, "قیمت مورد نظر را وارد کن (مثلاً: 4 تا 5 میلیارد):");
    return;
  }

  const user = await User.findOne({ chatId });

  if (user && !user.price && msg.text !== "💰 انتخاب قیمت") {
    await User.findOneAndUpdate({ chatId }, { price: msg.text });
    bot.sendMessage(chatId, "قیمت ذخیره شد ✔", mainMenu);
  }
});

// ------------------ انتخاب متراژ ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "📐 انتخاب متراژ") {
    bot.sendMessage(chatId, "متراژ مورد نظر را وارد کن (مثلاً: 80 تا 120):");
    return;
  }

  const user = await User.findOne({ chatId });

  if (user && !user.area && msg.text !== "📐 انتخاب متراژ") {
    await User.findOneAndUpdate({ chatId }, { area: msg.text });
    bot.sendMessage(chatId, "متراژ ذخیره شد ✔", mainMenu);
  }
});

// ------------------ تابع دریافت فایل واقعی دیوار ------------------
async function getRealDivarItems(user) {
  try {
    const city = "mashhad";
    const category = "apartment-sell";

    const url = `https://api.divar.ir/v8/web-search/${city}/${category}?q=${user.neighborhood}`;

    const response = await axios.get(url);
    const items = response.data.widget_list;

    if (!items || items.length === 0) {
      return null;
    }

    const item = items[0].data;

    return {
      title: item.title,
      neighborhood: user.neighborhood,
      area: item.description,
      price: item.price,
      link: "https://divar.ir/v/" + item.token,
      images: item.image_urls || [],
    };
  } catch (err) {
    console.log("Divar API error:", err);
    return null;
  }
}

// ------------------ ارسال فایل دیوار ------------------
function sendDivarItem(bot, chatId, item) {
  let caption = `🏠 ${item.title}\n`;
  caption += `📍 محله: ${item.neighborhood}\n`;
  caption += `📐 متراژ: ${item.area}\n`;
  caption += `💰 قیمت: ${item.price}\n`;
  caption += `🔗 لینک: ${item.link}`;

  if (item.images.length > 0) {
    bot.sendPhoto(chatId, item.images[0], { caption });
  } else {
    bot.sendMessage(chatId, caption);
  }
}

// ------------------ جستجوی واقعی دیوار ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "🔍 جستجوی فایل‌های دیوار") {
    const user = await User.findOne({ chatId });

    if (!user.phone || !user.neighborhood || !user.price) {
      bot.sendMessage(chatId, "لطفا همه فیلترها را کامل کن.", mainMenu);
      return;
    }

    bot.sendMessage(
      chatId,
      `محله: ${user.neighborhood}\n💰 قیمت: ${user.price}\nدر حال جستجو...`
    );

    const realItem = await getRealDivarItems(user);

    if (!realItem) {
      bot.sendMessage(chatId, "هیچ فایل واقعی در دیوار پیدا نشد.");
      return;
    }

    sendDivarItem(bot, chatId, realItem);
  }
});

// ------------------ پورت فیک برای Render ------------------
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(3000, () => console.log("Fake port opened"));
