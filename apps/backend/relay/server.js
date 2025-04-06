const fs = require("fs");
const path = require("path");
const Gun = require("gun");
require("gun/sea");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});



const express = require("express");
const http = require("http");
const app = express();
const server = http.createServer(app);

const gun = Gun({ web: server, file: "data", rad: true });

const keyPath = path.join(__dirname, "keypair.json");
let keypair;

// 🔑 Load or generate SEA keypair for this relay node
if (fs.existsSync(keyPath)) {
  keypair = JSON.parse(fs.readFileSync(keyPath, "utf-8"));
  console.log("🔐 Loaded existing keypair");
} else {
  Gun.SEA.pair().then(pair => {
    fs.writeFileSync(keyPath, JSON.stringify(pair, null, 2));
    console.log("🔐 Generated new keypair");
    keypair = pair;
  });
}

// 🧠 Broadcast signed fraud alert
async function broadcastFraudAlert(data) {
  if (!keypair) {
    console.log("⏳ Waiting for keypair to initialize...");
    return;
  }

  try {
    const signed = await Gun.SEA.sign(data, keypair);
    gun.get("fraud_alerts").set(signed);
    console.log("📡 Signed & broadcasted fraud alert:", signed);
  } catch (err) {
    console.error("🚨 Signing failed:", err);
  }
}

app.get("/", (req, res) => res.send("🔫 Gun.js Relay with SEA ready"));

const PORT = process.env.PORT_RELAY || 3031;
server.listen(PORT, () => {
  console.log(`🚀 Gun relay running at http://localhost:${PORT}/gun`);
});

module.exports = { broadcastFraudAlert, keypair, gun };
