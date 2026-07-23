const TelegramBot = require("node-telegram-bot-api");
const mongoose = require("mongoose");
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

// ------------------ تابع ارسال عکس ملک ------------------
async function sendDivarItem(bot, chatId, item) {
  try {
    // اگر چند عکس دارد → آلبوم
    if (item.images && item.images.length > 1) {
      const mediaGroup = item.images.map((img) => ({
        type: "photo",
        media: img,
      }));

      await bot.sendMediaGroup(chatId, mediaGroup);
    } else if (item.images && item.images.length === 1) {
      await bot.sendPhoto(chatId, item.images[0]);
    }

    // کپشن کامل
    const caption = `
🏠 ${item.title}
📍 محله: ${item.neighborhood}
📐 متراژ: ${item.area}
💰 قیمت: ${item.price}

🔗 لینک آگهی:
${item.link}
    `;

    await bot.sendMessage(chatId, caption);
  } catch (err) {
    console.log("Error sending item:", err);
    bot.sendMessage(chatId, "❌ خطا در ارسال عکس ملک");
  }
}

// ------------------ جستجوی دیوار ------------------
bot.on("message", async (msg) => {
  const chatId = msg.chat.id;

  if (msg.text === "🔍 جستجوی فایل‌های دیوار") {
    const user = await User.findOne({ chatId });

    if (!user.phone || !user.neighborhood || !user.price || !user.area) {
      bot.sendMessage(chatId, "لطفاً همه فیلترها را کامل کن.", mainMenu);
      return;
    }

    bot.sendMessage(
      chatId,
      `فیلترهای شما:\n\n📍 محله: ${user.neighborhood}\n💰 قیمت: ${user.price}\n📐 متراژ: ${user.area}\n\nدر حال جستجو در دیوار...`
    );

    // نمونهٔ تستی (بعداً API واقعی دیوار را اضافه می‌کنیم)
    const sampleItem = {
      title: "آپارتمان 85 متری نوساز",
      neighborhood: user.neighborhood,
      area: user.area,
      price: user.price,
      link: "https://divar.ir/v/test-item",
      images: [
        "https://via.placeholder.com/600x400.png?text=Photo+1",
        "https://via.placeholder.com/600x400.png?text=Photo+2"
      ]
    };

    sendDivarItem(bot, chatId, sampleItem);
  }
});
const express = require("express");
const app = express();

app.get("/", (req, res) => res.send("Bot is running"));

app.listen(3000, () => console.log("Fake port opened"));
