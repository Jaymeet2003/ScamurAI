require('dotenv').config();
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const fs = require('fs');

let lastSeenChargeId = null;

const findAndProcessNewCharge = (startTime, ip, geoInfo) => {
  const interval = setInterval(async () => {
    try {
      const charges = await stripe.charges.list({ limit: 5 });
      const charge = charges.data.find(c =>
        c.created > startTime &&
        c.status === 'succeeded' &&
        !c.refunded &&
        c.amount_refunded === 0
      );

      if (!charge || charge.id === lastSeenChargeId) return;
      lastSeenChargeId = charge.id;

      const intent = await stripe.paymentIntents.retrieve(charge.payment_intent, {
        expand: ['customer', 'payment_method']
      });

      const output = {
        payment_intent_id: charge.payment_intent,
        charge_id: charge.id,
        amount: `$${(charge.amount / 100).toFixed(2)}`,
        timestamp: new Date(charge.created * 1000).toISOString(),
        user_ip: ip,
        geolocation: geoInfo || {},
        charge: {
          status: charge.status,
          brand: charge.payment_method_details?.card?.brand,
          last4: charge.payment_method_details?.card?.last4,
          country: charge.payment_method_details?.card?.country,
          risk_score: charge.outcome?.risk_score ?? 'N/A',
          risk_level: charge.outcome?.risk_level ?? 'N/A',
          message: charge.outcome?.seller_message ?? 'N/A'
        },
        billing_details: {
          email: charge.billing_details?.email || intent.customer?.email || 'N/A',
          name: charge.billing_details?.name || intent.customer?.name || 'N/A',
          address: charge.billing_details?.address || {}
        }
      };

      console.log('\n🧾 New Payment Detected & Processed:');
      console.dir(output, { depth: null });

      fs.writeFileSync('dashboard-view.json', JSON.stringify(output, null, 2));

      const is_fraud = false;

      if (is_fraud) {
        try {
          const refund = await stripe.refunds.create({ charge: charge.id });
          console.log(`💸 Refunded successfully (Refund ID: ${refund.id})`);
        } catch (err) {
          console.error('❌ Refund failed:', err.message);
        }
      }

      clearInterval(interval);
    } catch (err) {
      console.error('❌ Stripe polling error:', err.message);
    }
  }, 5000);
};

module.exports = { findAndProcessNewCharge };
