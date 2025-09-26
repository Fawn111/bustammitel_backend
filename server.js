const express = require("express");
const fetch = require("node-fetch");
require("dotenv").config();
const cors = require("cors");
const mongoose = require("mongoose");

const authRoutes = require("./routes/auth");
const esimRoutes = require("./routes/esim");

const app = express();

// 🌍 Allow all origins for public access
app.use(
  cors({
    origin: "*",
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

// Routes
app.use("/auth", authRoutes);
app.use("/esim", esimRoutes);

// Access token logic
let accessToken = null;
let tokenExpiry = null;

async function getAccessToken(retries = 3) {
  const now = Date.now();
  if (accessToken && tokenExpiry && now < tokenExpiry) return accessToken;

  try {
    const response = await fetch("https://partners-api.airalo.com/v2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: process.env.AIRALO_CLIENT_ID,
        client_secret: process.env.AIRALO_CLIENT_SECRET,
        grant_type: "client_credentials",
      }),
    });

    const data = await response.json();

    if (!response.ok) throw new Error("Failed to fetch token: " + JSON.stringify(data));

    accessToken = data.data.access_token;
    tokenExpiry = now + (data.data.expires_in - 60) * 1000; // 1 min buffer
    return accessToken;
  } catch (err) {
    console.error("Error fetching token:", err.message);
    if (retries > 0) {
      await new Promise(r => setTimeout(r, 1000));
      return getAccessToken(retries - 1);
    }
    throw err;
  }
}

// ✅ Test route
app.get("/test", (req, res) => {
  res.json({ status: "OK" });
});

// 🔹 MongoDB connection and server start
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log("MongoDB connected");

    const PORT = process.env.PORT || 4001;
    app.listen(PORT, "0.0.0.0", () => {
      console.log(`✅ Backend running on port ${PORT}`);
    });
  })
  .catch(err => {
    console.error("MongoDB connection error:", err);
    process.exit(1); // Stop container if DB fails
  });

// 🔹 Fetch all packages (local/global) with country filtering
app.get("/packages", async (req, res) => {
  try {
    const { type, country, limit = 50, page = 1 } = req.query;

    console.log("Incoming request:", { type, country, limit, page });

    if (!type) return res.status(400).json({ error: "'type' query param required (local/global)" });
    if (!country) return res.status(400).json({ error: "'country' query param required" });

    // Fetch Access Token
    let token;
    try {
      token = await getAccessToken();
      console.log("Access token fetched:", token?.slice(0, 10) + "...");
    } catch (err) {
      console.error("Failed to get access token:", err.message);
      return res.status(500).json({ error: "Failed to fetch access token", details: err.message });
    }

    const params = new URLSearchParams({
      "filter[type]": type,
      "limit": limit,
      "page": page,
      "include": "topup",
    });

    console.log("Requesting Airalo API with params:", params.toString());

    const response = await fetch(`https://partners-api.airalo.com/v2/packages?${params.toString()}`, {
      headers: { Accept: "application/json", Authorization: `Bearer ${token}` },
    });

    console.log("Airalo API status:", response.status);

    const data = await response.json();
    console.log("Airalo API response data keys:", Object.keys(data));

    const countryPackage = data.data?.find(pkg => pkg.slug.toLowerCase() === country.toLowerCase());

    if (!countryPackage) {
      console.warn("Country package not found for slug:", country);
      return res.status(404).json({ error: "Country package not found", available: data.data?.map(p => p.slug) || [] });
    }

    const formattedPackage = {
      slug: countryPackage.slug,
      country_code: countryPackage.country_code,
      title: countryPackage.title,
      image: countryPackage.image || null,
      operators: countryPackage.operators?.map(op => ({
        id: op.id,
        style: op.style,
        gradient_start: op.gradient_start,
        gradient_end: op.gradient_end,
        type: op.type,
        is_prepaid: op.is_prepaid,
        title: op.title,
        esim_type: op.esim_type,
        warning: op.warning,
        apn_type: op.apn_type,
        apn_value: op.apn_value,
        is_roaming: op.is_roaming,
        info: op.info,
        image: op.image || null,
        plan_type: op.plan_type,
        activation_policy: op.activation_policy,
        is_kyc_verify: op.is_kyc_verify,
        rechargeability: op.rechargeability,
        other_info: op.other_info,
        coverages: op.coverages,
        install_window_days: op.install_window_days,
        topup_grace_window_days: op.topup_grace_window_days,
        apn: op.apn,
        packages: op.packages?.map(p => ({
          id: p.id,
          type: p.type,
          price: p.price,
          amount: p.amount,
          day: p.day,
          is_unlimited: p.is_unlimited,
          title: p.title,
          short_info: p.short_info,
          qr_installation: p.qr_installation,
          manual_installation: p.manual_installation,
          is_fair_usage_policy: p.is_fair_usage_policy,
          fair_usage_policy: p.fair_usage_policy,
          data: p.data,
          voice: p.voice,
          text: p.text,
          net_price: p.net_price,
          prices: p.prices,
        })) || [],
      })) || [],
      countries: [
        {
          country_code: countryPackage.country_code,
          title: countryPackage.title,
          image: countryPackage.image || null,
        },
      ],
    };

    console.log("Formatted package ready for response:", formattedPackage.slug);
    res.json(formattedPackage);

  } catch (err) {
    console.error("Unexpected error in /packages route:", err);
    res.status(500).json({ error: "Failed to fetch country packages", details: err.message });
  }
});

// 🔹 Fetch local countries
app.get("/countries/local", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const token = await getAccessToken();
    const response = await fetch(
      `https://partners-api.airalo.com/v2/packages?filter[type]=local&limit=${limit}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();
    const countries = data.data.map(pkg => ({
      country_code: pkg.country_code,
      title: pkg.title,
      slug: pkg.slug,
      imageUrl: pkg.image?.url || null,
    }));

    res.json({ countries, currentPage: page, totalPages: data.meta?.last_page || 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch local countries" });
  }
});

// 🔹 Fetch global countries
app.get("/countries/global", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;

    const token = await getAccessToken();
    const response = await fetch(
      `https://partners-api.airalo.com/v2/packages?filter[type]=global&limit=${limit}&page=${page}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );

    const data = await response.json();
    const regions = data.data.map(pkg => ({
      slug: pkg.slug,
      title: pkg.title,
      imageUrl: pkg.image?.url || null,
    }));

    res.json({ regions, currentPage: page, totalPages: data.meta?.last_page || 1 });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch global regions" });
  }
});

// 🔹 Fetch single package by slug
app.get("/packages/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const token = await getAccessToken();

    const params = new URLSearchParams({ "filter[slug]": slug, include: "topup" });
    const response = await fetch(`https://partners-api.airalo.com/v2/packages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!data.data || data.data.length === 0) return res.status(404).json({ error: "Package not found" });

    const pkg = data.data[0];
    const formattedPackage = {
      slug: pkg.slug,
      country_code: pkg.country_code,
      title: pkg.title,
      imageUrl: pkg.image?.url || null,
      operators: pkg.operators?.map(op => ({
        id: op.id,
        title: op.title,
        type: op.type,
        esim_type: op.esim_type,
        price: op.packages?.[0]?.price || null,
      })) || [],
    };

    res.json(formattedPackage);
  } catch (err) {
    console.error("Error fetching package:", err);
    res.status(500).json({ error: "Failed to fetch package" });
  }
});

// 🔹 Fetch single country by slug with all operators and packages
app.get("/countries/:slug", async (req, res) => {
  try {
    const { slug } = req.params;
    const token = await getAccessToken();

    const params = new URLSearchParams({ "filter[slug]": slug, include: "topup" });
    const response = await fetch(`https://partners-api.airalo.com/v2/packages?${params.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });

    const data = await response.json();
    if (!data.data || data.data.length === 0) return res.status(404).json({ error: "Country not found" });

    const country = data.data[0];
    const formattedCountry = {
      slug: country.slug,
      country_code: country.country_code,
      title: country.title,
      image: country.image || null,
      operators: country.operators?.map(op => ({
        id: op.id,
        style: op.style,
        gradient_start: op.gradient_start,
        gradient_end: op.gradient_end,
        type: op.type,
        is_prepaid: op.is_prepaid,
        title: op.title,
        esim_type: op.esim_type,
        warning: op.warning,
        apn_type: op.apn_type,
        apn_value: op.apn_value,
        is_roaming: op.is_roaming,
        info: op.info,
        image: op.image || null,
        plan_type: op.plan_type,
        activation_policy: op.activation_policy,
        is_kyc_verify: op.is_kyc_verify,
        rechargeability: op.rechargeability,
        other_info: op.other_info,
        coverages: op.coverages,
        install_window_days: op.install_window_days,
        topup_grace_window_days: op.topup_grace_window_days,
        apn: op.apn,
        packages: op.packages?.map(p => ({
          id: p.id,
          type: p.type,
          price: p.price,
          amount: p.amount,
          day: p.day,
          is_unlimited: p.is_unlimited,
          title: p.title,
          short_info: p.short_info,
          qr_installation: p.qr_installation,
          manual_installation: p.manual_installation,
          is_fair_usage_policy: p.is_fair_usage_policy,
          fair_usage_policy: p.fair_usage_policy,
          data: p.data,
          voice: p.voice,
          text: p.text,
          net_price: p.net_price,
          prices: p.prices,
        })) || [],
      })) || [],
      countries: [
        {
          country_code: country.country_code,
          title: country.title,
          image: country.image || null,
        },
      ],
    };

    res.json(formattedCountry);
  } catch (err) {
    console.error("Error fetching country operators:", err);
    res.status(500).json({ error: "Failed to fetch country operators" });
  }
});
