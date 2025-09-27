// models/coupon.js
const mongoose = require("mongoose");

const couponSchema = new mongoose.Schema({
  code: { type: String, required: true, unique: true },
  type: { type: String, enum: ["percentage", "fixed"], default: "fixed" },
  value: { type: Number, required: true },
  expiryDate: { type: Date, required: true },
  active: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.models.Coupon || mongoose.model("Coupon", couponSchema);
