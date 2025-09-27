// routes/coupon.js
const express = require("express");
const Coupon = require("../models/coupon");

const router = express.Router();

// Get all coupons
router.get("/", async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });
    res.json(coupons);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Add a new coupon
router.post("/", async (req, res) => {
  try {
    const { code, type, value, expiryDate } = req.body;

    const existing = await Coupon.findOne({ code });
    if (existing) return res.status(400).json({ error: "Coupon code already exists" });

    const coupon = await Coupon.create({ code, type, value, expiryDate });
    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update a coupon
router.put("/:id", async (req, res) => {
  try {
    const updatedCoupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.json(updatedCoupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete a coupon
router.delete("/:id", async (req, res) => {
  try {
    await Coupon.findByIdAndDelete(req.params.id);
    res.json({ message: "Coupon deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
