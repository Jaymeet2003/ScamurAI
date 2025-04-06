// gun-verify.js
const Gun = require('gun');
require('gun/sea');

// Replace the existing verifyFraudSignature function in gun-verify.js

/**
 * Verifies a SEA-signed fraud alert using the signer's public key
 * @param {Object} signedData - The SEA-signed object retrieved from Gun
 * @param {string} pub - The signer's SEA public key (pub field from their identity)
 * @returns {Promise<Object>} - The verified original data or throws if invalid
 */
async function verifyFraudSignature(signedData, pub) {
  if (!signedData) {
    throw new Error('Missing signed data');
  }
  
  console.log(`🔐 Verifying data: ${typeof signedData === 'object' ? JSON.stringify(Object.keys(signedData)) : typeof signedData}`);
  
  // SEA signatures should have these properties
  if (!signedData.m || !signedData.s) {
    console.error('❌ Invalid signature format:', JSON.stringify(signedData).substring(0, 100) + '...');
    throw new Error('Invalid signed data format - missing signature components');
  }

  if (!pub) {
    throw new Error('Missing public key for verification');
  }

  try {
    // Implement retry logic for verification which sometimes fails on first attempt
    let verified = null;
    let attempts = 0;
    const maxAttempts = 5; // Increase max attempts
    
    while (!verified && attempts < maxAttempts) {
      attempts++;
      try {
        console.log(`🔄 Verification attempt ${attempts}...`);
        verified = await Gun.SEA.verify(signedData, pub);
        
        if (verified) {
          console.log(`✅ Verification successful on attempt ${attempts}`);
          break;
        }
        
        // Increase delay between attempts
        await new Promise(r => setTimeout(r, 300));
      } catch (err) {
        console.warn(`⚠️ Verification attempt ${attempts} failed:`, err.message);
        if (attempts >= maxAttempts) throw err;
        // Otherwise continue to next attempt
      }
    }
    
    if (!verified) {
      throw new Error('Verification failed after multiple attempts');
    }
    
    // Add verification metadata
    return {
      ...verified,
      _meta: {
        verifiedAt: new Date().toISOString(),
        signerPub: pub.slice(0, 16) + '...',
        verificationAttempts: attempts
      }
    };
  } catch (err) {
    console.error('❌ Signature verification failed:', err.message);
    throw new Error(`Verification error: ${err.message}`);
  }
}

module.exports = { verifyFraudSignature };