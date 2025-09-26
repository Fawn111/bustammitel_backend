const express = require("express");
const User = require("../models/user");
const router = express.Router();

// 🔹 Add eSIM to user
router.post("/:userId/add", async (req, res) => {
  try {
    const { userId } = req.params;
    const esimData = req.body; // { esimId, packageName, country, operators, expiryDate }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    user.esims.push(esimData);
    await user.save();

    res.json({ message: "eSIM added", esims: user.esims });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// 🔹 Get all eSIMs of a user
router.get("/:userId", async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ error: "User not found" });

    res.json({ esims: user.esims });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
