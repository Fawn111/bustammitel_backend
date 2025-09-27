const express = require("express");
const router = express.Router();
const Order = require("../models/Order");
const QRCode = require("qrcode"); // ✅ add this for QR generation

// ----------------------
// Create a new order
// POST /api/orders
// ----------------------
router.post("/", async (req, res) => {
  console.log("Request body:", req.body); // debug
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("Error creating order:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Get all orders (Admin)
// GET /api/orders
// ----------------------
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Get orders by userId (User)
// GET /api/orders/user/:userId
// ----------------------
router.get("/user/:userId", async (req, res) => {
  try {
    const orders = await Order.find({ userId: req.params.userId }).sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    console.error("Error fetching user orders:", err.message);
    res.status(500).json({ error: err.message });
  }
});

// ----------------------
// Update QR code and status (Admin)
// PUT /api/orders/:id/qr
// ----------------------
router.put("/:id/qr", async (req, res) => {
  try {
    const { id } = req.params;
    const { qrText } = req.body; // admin sends plain text, e.g., esim code

    if (!qrText || !qrText.trim()) {
      return res.status(400).json({ message: "QR text is required" });
    }

    // ✅ Generate QR code as base64 image
    const qrCodeDataUrl = await QRCode.toDataURL(qrText);

    const updatedOrder = await Order.findByIdAndUpdate(
      id,
      { qrCode: qrCodeDataUrl, status: "Completed" }, // store base64 QR image
      { new: true }
    );

    if (!updatedOrder) {
      return res.status(404).json({ message: "Order not found" });
    }

    res.json(updatedOrder);
  } catch (err) {
    console.error("Error generating QR:", err.message);
    res.status(500).json({ error: "Server error generating QR" });
  }
});

module.exports = router;
