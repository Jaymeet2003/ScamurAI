const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const { findAndProcessNewCharge } = require('./stripe/stripe');
require('dotenv').config();
const { publishFraud } = require('./gun/gunsea');

const cors = require('cors');  // Add this import
const { auth } = require('express-openid-connect');
const app = express();
const PORT = 5050;

// CORS setup
app.use(
  cors({
    origin: "http://localhost:5173", // Adjust this to match your frontend URL
    credentials: true,
  }),
);

// Auth0 configuration
const config = {
  authRequired: false,  // Change to true if you want login to be required
  auth0Logout: true,
  secret: 'a long, randomly-generated string stored in env',  // Use a real secret
  baseURL: `http://localhost:${PORT}`,
  clientID: 'HgvOINEf1vwQu8IySdH0vOtvE6hTFLRE',
  issuerBaseURL: 'https://dev-nyglezhgb0zctxph.us.auth0.com',
};



app.use(express.json());

let capturedIp = null;
let geoInfo = null;

app.use(auth(config));

// Routes
app.get("/", (req, res) => {
  if (req.oidc.isAuthenticated()) {
    // Redirect to the frontend app's landing page if authenticated
    return res.redirect("http://localhost:5173/dashboard");
  }
  res.redirect("http://localhost:5173/");
});
const { requiresAuth } = require('express-openid-connect');

app.get('/profile', (req, res) => {
  if (req.oidc && req.oidc.isAuthenticated()) {
    res.json(req.oidc.user);
  } else {
    res.status(401).json({ error: 'Not authenticated' });
  }
});
app.get('/payment', async (req, res) => {
  capturedIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '8.8.8.8';
  if (capturedIp === '::1' || capturedIp === '127.0.0.1') capturedIp = '8.8.8.8';

  try {
    const geoRes = await fetch(`http://ip-api.com/json/${capturedIp}`);
    geoInfo = await geoRes.json();
  } catch {
    geoInfo = {};
  }

  const startTime = Math.floor(Date.now() / 1000);
  findAndProcessNewCharge(startTime, capturedIp, geoInfo);

  res.redirect('https://buy.stripe.com/test_aEU5ks0H38tF4KI4gh');
});

app.listen(PORT, () => {
  console.log(`✅ Server listening at http://localhost:${PORT}`);
});

// 🔐 Securely handle fraud pattern publishing
app.post('/gun-publish', async (req, res) => {
  const data = req.body;

  if (!data?.id || !data?.amount) {
    return res.status(400).json({ error: 'Missing required fraud data' });
  }

  try {
    // Add createdAt if not already present
    data.createdAt = data.createdAt || new Date().toISOString();

    publishFraud(data); // Signed + broadcasted by gunsea.js
    return res.json({ status: 'published', id: data.id });
  } catch (err) {
    console.error('❌ Error publishing fraud alert:', err);
    return res.status(500).json({ error: 'Internal Server Error' });
  }
});
