const mongoose = require("mongoose");

const orderSchema = new mongoose.Schema({
  package: { type: Object, required: true }, // <-- change from String to Object
  operator: { type: Object, required: true },
  country: { type: Object, required: true },
  paymentMethod: { type: String, required: true },
  coupon: { type: String, default: "" },
}, { timestamps: true });

const Order = mongoose.model("Order", orderSchema);
module.exports = Order;
