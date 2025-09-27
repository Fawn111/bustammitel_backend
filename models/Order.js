const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  username: { type: String, required: true },
  cardType: { type: String, required: true },
  package: { type: Object, required: true },
  operator: { type: Object, required: true },
  country: { type: Object, required: true },
  paymentMethod: { type: String, required: true },
  coupon: { type: String, default: "" },
  status: { type: String, default: "Pending" },
  qrCode: { type: String, default: null }
}, { timestamps: true });

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
module.exports = Order;
