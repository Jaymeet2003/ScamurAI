// gun-verify.js
const Gun = require('gun');
require('gun/sea');

/**
 * Verifies a SEA-signed fraud alert using the signer's public key
 * @param {Object} signedData - The SEA-signed object retrieved from Gun
 * @param {Object} pub - The signer's SEA public key (pub field from their identity)
 * @returns {Promise<Object>} - The verified original data or throws if invalid
 */
async function verifyFraudSignature(signedData, pub) {
  if (!signedData || !signedData.s) {
    throw new Error('Invalid signed data format');
  }

  try {
    const verified = await Gun.SEA.verify(signedData, pub);
    if (!verified) throw new Error('Verification failed');
    return verified;
  } catch (err) {
    console.error('❌ Signature verification failed:', err);
    throw err;
  }
}

module.exports = { verifyFraudSignature };
