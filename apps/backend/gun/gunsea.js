const Gun = require('gun');
require('gun/sea');
require('gun/lib/webrtc');
const fs = require('fs');
const path = require('path');
require('dotenv').config({
    path: path.resolve(__dirname, "../../.env")
});
const { verifyFraudSignature } = require('./gun-verify');

const relayHost = process.env.RELAY_HOST || 'localhost';
const PORT_RELAY = process.env.PORT_RELAY || 3031;
const peers = [`http://${relayHost}:${PORT_RELAY}/gun`];
const gun = Gun({
  peers,
  file: path.resolve(__dirname, '../../../gun-data'),
});

let user = gun.user(); // Moved user initialization here
const credentialsPath = path.resolve(__dirname, 'identity.json');

// 🔐 Load or Create SEA identity for this node
async function initIdentity() {
  if (fs.existsSync(credentialsPath)) {
    console.log("📂 Checking for identity file:", credentialsPath);
    const creds = JSON.parse(fs.readFileSync(credentialsPath));
    console.log("📥 Loaded credentials:", creds);
    console.log("🔐 Attempting login with alias/pass...");

    try {
      const authAck = await new Promise((resolve, reject) => {
        user.auth(creds.alias, creds.pass, ack => {
          if (!ack || ack.err || typeof ack === 'string') {
            reject(ack);
          } else {
            resolve(ack);
          }
        });
      });

      console.log(`🔐 Authenticated as ${creds.alias}`);
    } catch (err) {
      console.warn("⚠️ Auth failed. Regenerating identity...");
      fs.unlinkSync(credentialsPath);
      setTimeout(() => {
        initIdentity();
      }, 500);
      return;
    }

  } else {
    const alias = `node_${Date.now()}`;
    const pass = `pass_${Math.random().toString(36).slice(2)}`;

    try {
      const createAck = await new Promise((resolve, reject) => {
        user.create(alias, pass, ack => {
          if (!ack || ack.err || typeof ack === 'string') {
            reject(ack);
          } else {
            resolve(ack);
          }
        });
      });

      fs.writeFileSync(credentialsPath, JSON.stringify({ alias, pass }, null, 2));
      console.log("🆕 Identity created:", alias);
      console.log("🔑 Node public key:", user.is.pub);
      await new Promise(r => setTimeout(r, 500)); // Delay to ensure user registration
      return initIdentity(); // Login after creation
    } catch (err) {
      console.error("❌ Identity creation failed:", err);
    }
  }
}

// 📤 Publish a fraud alert (signed and saved under user's graph)
function publishFraud(data) {
  if (!user || !user.is) {
    return console.error("❌ Identity not initialized yet");
  }

  console.log("📡 Listening and publishing to:", user.get('fraud-firewall')._.soul);
  user.get('fraud-firewall').set({
    ...data,
    createdAt: new Date().toISOString(),
  }, (ack) => {
    if (ack.err) {
      console.error("❌ Failed to publish fraud alert:", ack.err);
    } else {
      console.log("📡 Published fraud alert to network:", data.id);
    }
  });
}

// 📥 Listen to alerts from any peer
function listenToFraudAlerts() {
  gun.get('fraud-firewall').map().on(async (data, key) => {
    if (!data || typeof data !== 'object' || key.startsWith('_') || key === 'undefined') return;

    console.log("🌐 Received data via Gun:", data);
    const pub = data?._?.['#'];
    if (!pub) return;

    try {
      const verified = await verifyFraudSignature(data, pub);
      console.log('✅ VERIFIED fraud alert from:', pub);
      appendUniqueAuditLog(verified);
    } catch {
      console.warn('❌ Invalid or tampered fraud alert ignored.');
    }
  });
}

initIdentity().then(() => {
  listenToFraudAlerts();
});

// Function to append unique logs to audit-log.json
function appendUniqueAuditLog(verified) {
  const auditLogPath = path.resolve(__dirname, '../../../audit-log.json');
  let logs = [];

  if (fs.existsSync(auditLogPath)) {
    logs = JSON.parse(fs.readFileSync(auditLogPath));
  }

  if (!logs.some(log => log.id === verified.id)) {
    logs.push(verified);
    fs.writeFileSync(auditLogPath, JSON.stringify(logs, null, 2));
  }
}

let lastPeers = [];

setInterval(() => {
  const peers = Object.keys(gun._.opt.peers || {});
  const newPeers = peers.filter(p => !lastPeers.includes(p));

  if (newPeers.length > 0) {
    console.log("🔄 Connected peers:", peers);
    lastPeers = peers;
  }
}, 5000);

module.exports = { publishFraud };