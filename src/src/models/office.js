const mongoose = require("mongoose");

const OfficeSchema = new mongoose.Schema({
  officeId: { type: String, unique: true },
  maxAgents: { type: Number, default: 1 },
  agents: [Number],
  tokens: [{ token: String, used: Boolean, expiresAt: Date }],
  expiresAt: Date
});

module.exports = mongoose.model("Office", OfficeSchema);
