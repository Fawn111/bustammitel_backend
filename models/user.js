const mongoose = require("mongoose");

const esimSchema = new mongoose.Schema({
  esimId: { type: String, required: true },
  packageName: { type: String },
  country: { type: String },
  operators: [String],
  purchaseDate: { type: Date, default: Date.now },
  expiryDate: Date,
  status: { type: String, default: "active" },
});

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  esims: [esimSchema],
}, { timestamps: true });

module.exports = mongoose.models.User || mongoose.model("User", userSchema);
