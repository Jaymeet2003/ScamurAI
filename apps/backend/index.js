// const express = require('express');
// const Gun = require('gun');
// require('gun/sea'); // Enables encryption/auth
// const fs = require('fs');
// const path = require('path');
// const crypto = require('crypto');

// // Initialize
// const app = express();
// const PORT = process.env.PORT || 5000;
// app.use(express.json());

// app.get('/', (req, res) => {
//     res.send('Hello from server');
// });
// // Connect to Gun relay
// const gun = Gun(['http://localhost:8765/gun']);

// // === Helper: Write to audit log ===
// const logToAuditFile = (pattern) => {
//   const logPath = path.join(__dirname, '../../logs/audit-log.json');
//   const existing = fs.existsSync(logPath)
//     ? JSON.parse(fs.readFileSync(logPath))
//     : [];

//   existing.push(pattern);
//   fs.writeFileSync(logPath, JSON.stringify(existing, null, 2));
// };

// // === Helper: Simulate or invoke fraud detection ===
// const runFraudDetection = async (transaction) => {
//   // 🔁 You can replace this block with child_process to run detectFraud.py
//   const result = {
//     isFraud: true,
//     patternType: 'geo-anomaly',
//     riskScore: 0.91,
//     location: {
//       lat: 37.7749,
//       lon: -122.4194
//     },
//     nodeId: 'node-alpha'
//   };

//   return {
//     ...result,
//     timestamp: Date.now(),
//     txHash: crypto.createHash('sha256').update(JSON.stringify(transaction)).digest('hex')
//   };
// };

// // === POST /analyze (manual trigger) ===
// app.post('/analyze', async (req, res) => {
//   try {
//     const transaction = req.body;
//     const pattern = await runFraudDetection(transaction);

//     // Broadcast to Gun
//     gun.get('fraud-patterns').set(pattern);

//     // Log locally
//     logToAuditFile(pattern);

//     res.status(200).json({ success: true, pattern });
//   } catch (err) {
//     console.error(err);
//     res.status(500).json({ success: false, error: err.message });
//   }
// });

// // === POST /webhook (Stripe trigger) ===
// app.post('/webhook', async (req, res) => {
//   const stripePayload = req.body; // ⚠️ Add rawBody if verifying signature
//   console.log('[Webhook] Stripe data received:', stripePayload);

//   const pattern = await runFraudDetection(stripePayload);

//   // Broadcast + log
//   gun.get('fraud-patterns').set(pattern);
//   logToAuditFile(pattern);

//   res.status(200).json({ success: true });
// });

// // === Start Backend Server ===
// app.listen(PORT, () => {
//   console.log(`✅ Backend API running at http://localhost:${PORT}`);
// });

//partially working

// const cors = require('cors');

// const express = require('express');
// const app = express();
// const PORT = 5050;
// const { auth } = require('express-openid-connect');
// app.use(
//   cors({
//     origin: "http://localhost:5173", // Change to your frontend port if different
//     credentials: true,
//   }),
// );
// const config = {
//   authRequired: false,
//   auth0Logout: true,
//   secret: 'a long, randomly-generated string stored in env',
//   baseURL: 'http://localhost:5050',
//   clientID: 'HgvOINEf1vwQu8IySdH0vOtvE6hTFLRE',
//   issuerBaseURL: 'https://dev-nyglezhgb0zctxph.us.auth0.com'
// };
// app.use(
//   auth({
//     authRequired: false,
//     auth0Logout: true,
//     secret: 'a long, randomly-generated string stored in env',
//     baseURL: `http://localhost:${PORT}`,
//     clientID: 'HgvOINEf1vwQu8IySdH0vOtvE6hTFLRE',
//     issuerBaseURL: 'https://dev-nyglezhgb0zctxph.us.auth0.com',
//   }),
// );
// app.use(express.json());
// // auth router attaches /login, /logout, and /callback routes to the baseURL
// app.use(auth(config));

// // req.isAuthenticated is provided from the auth router
// app.get("/", (req, res) => {
//   if (req.oidc.isAuthenticated()) {
//     // ✅ Redirect to the frontend app's landing page
//     return res.redirect("http://localhost:5173/home");
//   }
//   res.send('<a href="/login">Login</a>');
// });


// // app.get('/', (req, res) => {
// //   res.send('Hello from server');
// // });

// app.listen(port, () => {
//   console.log(`✅ Server running at http://localhost:${port}`);
// });

const express = require('express');
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

// Initialize Auth0 middleware
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
// Start server
app.listen(PORT, () => {
  console.log(`✅ Server running at http://localhost:${PORT}`);
});
