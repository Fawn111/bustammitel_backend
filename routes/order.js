// routes/order.js
const express = require("express");
const router = express.Router();
const Order = require("../models/Order");

// POST /api/orders - Create new order
router.post("/", async (req, res) => {
  console.log("Request body:", req.body); // <-- debug
  try {
    const newOrder = new Order(req.body);
    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);
  } catch (err) {
    console.error("Error creating order:", err.message);
    res.status(500).json({ error: err.message });
  }
});


// GET /api/orders - Get all orders
router.get("/", async (req, res) => {
  try {
    const orders = await Order.find();
    res.json(orders);
  } catch (err) {
    console.error("Error fetching orders:", err.message);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
