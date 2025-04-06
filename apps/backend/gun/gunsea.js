const Gun = require("gun");
require("gun/sea");
require("gun/lib/load");
require("gun/sea/index");
const fs = require("fs");
const path = require("path");
require("dotenv").config({
    path: path.resolve(__dirname, "../../.env")
});

const PORT_RELAY = process.env.PORT_RELAY || 3031;
const peers = [`http://localhost:${PORT_RELAY}/gun`];
const gun = Gun({
  peers,
  file: path.resolve(__dirname, '../../../gun-data'),
});

let user;
const credentialsPath = path.join(__dirname, 'identity.json');

// 🔐 Load or Create SEA identity for this node
async function initIdentity() {
  if (fs.existsSync(credentialsPath)) {
    const creds = JSON.parse(fs.readFileSync(credentialsPath));
    user = gun.user();
    const authAck = await user.auth(creds.alias, creds.pass);
    if (authAck.err) {
      console.warn("⚠️ Wrong user or password. Recreating identity...");
      fs.unlinkSync(credentialsPath);
      return initIdentity();
    }
    console.log(`🔐 Authenticated as ${creds.alias}`);
  } else {
    const alias = `node_${Date.now()}`;
    const pass = `pass_${Math.random().toString(36).slice(2)}`;
    gun.user().create(alias, pass, async (ack) => {
      if (ack.err) return console.error("❌ Identity creation failed:", ack.err);
      fs.writeFileSync(credentialsPath, JSON.stringify({ alias, pass }, null, 2));
      console.log("🆕 Identity created:", alias);
      await initIdentity();
    });
  }
}

// 📤 Publish a fraud alert (signed and saved under user's graph)
function publishFraud(data) {
  if (!user) return console.error("❌ Identity not initialized yet");

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
  gun.get('fraud-firewall').map().on(async (data) => {
    const pub = data?._?.['#']; // Extract public key from metadata
    if (!data || !pub) return;

    try {
      const verified = await verifyFraudSignature(data, pub);
      console.log('✅ VERIFIED fraud alert from:', pub);

      // Append to replica audit log only if verified
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
  const auditLogPath = path.join(__dirname, '../../../audit-log.json');
  let logs = [];

  if (fs.existsSync(auditLogPath)) {
    logs = JSON.parse(fs.readFileSync(auditLogPath));
  }

  if (!logs.some(log => log.id === verified.id)) {
    logs.push(verified);
    fs.writeFileSync(auditLogPath, JSON.stringify(logs, null, 2));
  }
}

module.exports = { publishFraud };