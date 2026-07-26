const mongoose = require("mongoose");

const UserSchema = new mongoose.Schema({
  chatId: { type: Number, unique: true },
  zone: String,
  street: String,
  neighborhood: String,
  price: String,
  area: String,
  ownerType: { type: String, default: "personal" },
  officeId: String
});

module.exports = mongoose.model("User", UserSchema);
