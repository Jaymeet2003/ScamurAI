const Gun = require("gun");
require("gun/sea");
require("gun/lib/load");
require("gun/sea/index");
const fs = require("fs");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const gun = Gun({
  peers: [`http://localhost:${PORT_RELAY}/gun`],
  file: "gun-data",
  rad: true
});

// Listen to fraud alerts and verify
gun.get("fraud_alerts")
  .map()
  .once(async (signedAlert, id) => {
    if (!signedAlert) return;

    try {
      // 🔍 Automatically verify signature
      const verified = await Gun.SEA.verify(signedAlert, signedAlert["~"]);
      if (verified) {
        console.log("✅ Verified Fraud Alert:", verified);
      } else {
        console.warn("🚨 Failed to verify alert:", id);
      }
    } catch (err) {
      console.error("❌ Error verifying alert:", err);
    }
  });
