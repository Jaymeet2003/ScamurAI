const Gun = require('gun');
require('gun/sea');
require('gun/lib/webrtc');
const fs = require('fs');
const path = require('path');
require('dotenv').config({
  path: path.resolve(__dirname, "../../.env")
});
const { verifyFraudSignature } = require('./gun-verify');
const os = require('os');

// Get local IP address for better peer discovery
function getLocalIP() {
  const interfaces = os.networkInterfaces();
  for (const name of Object.keys(interfaces)) {
    for (const iface of interfaces[name]) {
      // Skip over non-IPv4 and internal (loopback) addresses
      if (iface.family === 'IPv4' && !iface.internal) {
        return iface.address;
      }
    }
  }
  return '127.0.0.1'; // Fallback to localhost
}

const LOCAL_IP = process.env.LOCAL_IP || getLocalIP();
const PORT_RELAY = process.env.PORT_RELAY || 6001;

// Use an array of possible peers for better discovery
const peers = [
  `http://${LOCAL_IP}:${PORT_RELAY}/gun`,
  `http://localhost:${PORT_RELAY}/gun`
];

console.log(`🔍 Looking for peers at: ${peers.join(', ')}`);

const gun = Gun({
  peers,
  file: path.resolve(__dirname, '../../../gun-data'),
  rad: true,
  axe: true, // Enable axe for better peer routing
  // Removed multicast option that caused errors
});

let user = gun.user();
const credentialsPath = path.resolve(__dirname, 'identity.json');

async function initIdentity() {
  if (fs.existsSync(credentialsPath)) {
    console.log("📂 Checking for identity file:", credentialsPath);
    const creds = JSON.parse(fs.readFileSync(credentialsPath));
    console.log("📥 Loaded credentials:", creds.alias);
    console.log("🔐 Attempting login with alias/pass...");

    let attempts = 0;
    const maxAttempts = 3;

    while (attempts < maxAttempts) {
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
        console.log(`🔑 Node public key: ${user.is.pub}`);
        return;
      } catch (err) {
        attempts++;
        if (err?.err?.includes("No user") || attempts >= maxAttempts) {
          console.warn("⚠️ Auth failed. Regenerating identity...");
          fs.unlinkSync(credentialsPath);
          return initIdentity(); // Re-run to create new identity
        }
        console.warn(`⏳ Auth failed (attempt ${attempts}), retrying...`);
        await new Promise(r => setTimeout(r, 1000));
      }
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
      await new Promise(r => setTimeout(r, 500));
      return initIdentity();
    } catch (err) {
      console.error("❌ Identity creation failed:", err);
    }
  }
}

async function publishFraud(data) {
  return new Promise(async (resolve, reject) => {
    if (!user || !user.is || !user._?.sea) {
      reject(new Error("❌ Identity not initialized yet"));
      return;
    }

    try {
      // Ensure required fields exist
      data.id = data.id || `fraud-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
      data.timestamp = data.timestamp || Date.now();
      
      console.log("📦 Preparing to publish fraud data:", JSON.stringify(data));
      
      // Verify peer connections before publishing
      const peers = Object.keys(gun._.opt.peers || {});
      if (peers.length === 0) {
        console.warn("⚠️ No peers connected! Attempting to reconnect...");
        
        // Try to reconnect to peers
        [
          `http://${LOCAL_IP}:${PORT_RELAY}/gun`,
          `http://localhost:${PORT_RELAY}/gun`
        ].forEach(peer => gun.opt({peers: [peer]}));
        
        // Wait a moment for connections to establish
        await new Promise(r => setTimeout(r, 1000));
        
        // Check again
        const reconnectedPeers = Object.keys(gun._.opt.peers || {});
        console.log(`🔄 Reconnection attempt result: ${reconnectedPeers.length} peers`);
      }
      
      // Sign the data
      const signed = await Gun.SEA.sign(data, user._.sea);
      signed.pub = user.is.pub;  // Add public key for verification
      signed.alias = user.is.alias; // Add alias for better identification
      
      // Use specific node ID for better tracking
      const nodeId = data.id;
      
      // First publish to the specific node ID
      gun.get('fraud-firewall').get(nodeId).put(signed, ack => {
        if (ack.err) {
          console.error("❌ Failed to publish fraud alert:", ack.err);
          reject(new Error(`Failed to publish: ${ack.err}`));
        } else {
          console.log("📡 Published fraud alert to network with ID:", nodeId);
          
          // Double-check peer connections
          const connectedPeers = Object.keys(gun._.opt.peers || {});
          console.log(`🔄 Active peers during publish: ${connectedPeers.length ? connectedPeers.join(', ') : 'None'}`);
          
          // Also publish to the collection without a specific key
          // This creates additional redundancy
          gun.get('fraud-firewall').set(signed);
          
          // Also publish to a "latest" node for easier discovery
          gun.get('fraud-latest').put({ 
            id: nodeId, 
            timestamp: Date.now(),
            type: data.type || 'unknown',
            amount: data.amount || 0,
            publisher: user.is.alias || user.is.pub.slice(0, 8)
          });
          
          // Final verification - check if we can read it back
          setTimeout(() => {
            gun.get('fraud-firewall').get(nodeId).once((verifyData) => {
              if (verifyData) {
                console.log("✅ Verified data was saved in local database:", nodeId);
              } else {
                console.warn("⚠️ Could not verify data was saved locally");
              }
            });
          }, 500);
          
          resolve(nodeId);
        }
      });
    } catch (err) {
      console.error("❌ Publishing failed:", err);
      reject(err);
    }
  });
}

function listenToFraudAlerts() {
  console.log("👂 Listening for fraud alerts on the network...");
  
  gun.get('fraud-firewall').map().on(async (data, key) => {
    if (!data || typeof data !== 'object' || key.startsWith('_') || key === 'undefined') {
      return;
    }

    const pub = data?.pub;
    if (!pub) {
      console.log("⚠️ Received data without public key, ignoring");
      return;
    }

    // Build trust with the user's graph
    gun.user(pub).get('alias').once((alias) => {
      console.log(`👤 Building trust for peer: ${alias || pub.slice(0, 8)}...`);
    });

    try {
      // Give Gun time to process the user graph
      await new Promise(r => setTimeout(r, 100));
      
      const verified = await verifyFraudSignature(data, pub);
      console.log('✅ VERIFIED fraud alert from:', pub.slice(0, 8));
      appendUniqueAuditLog(verified);
    } catch (err) {
      console.warn('❌ Invalid or tampered fraud alert ignored:', err.message);
    }
  });
}

function appendUniqueAuditLog(verified) {
  const auditLogPath = path.resolve(__dirname, '../../../audit-log.json');
  let logs = [];

  if (fs.existsSync(auditLogPath)) {
    logs = JSON.parse(fs.readFileSync(auditLogPath));
  }

  if (!logs.some(log => log.id === verified.id)) {
    logs.push({
      ...verified,
      receivedAt: new Date().toISOString()
    });
    fs.writeFileSync(auditLogPath, JSON.stringify(logs, null, 2));
    console.log(`📝 Added new fraud alert to audit log: ${verified.id}`);
  }
}

// Enhanced peer monitoring
function monitorNetwork() {
  // Monitor connected peers
  let lastPeers = [];
  setInterval(() => {
    const peers = Object.keys(gun._.opt.peers || {});
    const newPeers = peers.filter(p => !lastPeers.includes(p));
    const lostPeers = lastPeers.filter(p => !peers.includes(p));

    if (newPeers.length > 0 || lostPeers.length > 0) {
      console.log("🔄 Connected peers:", peers.length ? peers : "None");
      lastPeers = peers;
    }
  }, 5000);

  // Gun peer events
  gun.on('hi', peer => console.log('🔗 Connected to:', peer.url || peer));
  gun.on('bye', peer => console.log('❌ Disconnected from:', peer.url || peer));
  
  // Test network periodically
  setInterval(() => {
    if (Object.keys(gun._.opt.peers || {}).length === 0) {
      console.log("🔄 No peers connected. Attempting to reconnect...");
      peers.forEach(peer => gun.opt({peers: [peer]}));
    }
  }, 10000);
}

initIdentity().then(() => {
  listenToFraudAlerts();
  monitorNetwork();
  
  // Publish a heartbeat to help establish connections
  setInterval(() => {
    if (user && user.is) {
      gun.get('heartbeat').put({
        timestamp: Date.now(),
        pub: user.is.pub,
        alias: user.is.alias
      });
    }
  }, 30000);
});

module.exports = { publishFraud };