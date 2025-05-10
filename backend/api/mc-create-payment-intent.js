const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

const createPaymentIntent = async (req, res) => {
  try {
    let { amount, currency } = req.body; 
    console.log('Received create-payment-intent request:', { amount, currency });

    // Since TND is not supported by Stripe, convert to USD
    if (currency === 'TND') {
      const exchangeRateTndToUsd = 0.32; 
      const amountInUsd = (amount / 1000) * exchangeRateTndToUsd;
      const amountInCents = Math.round(amountInUsd * 100);

      // Check Stripe's minimum charge amount for USD (0.50 USD)
      if (amountInCents < 50) {
        throw new Error(
          `Amount too small. Minimum amount is ${(0.50 / exchangeRateTndToUsd).toFixed(3)} TND (equivalent to 0.50 USD).`
        );
      }

      amount = amountInCents; 
      currency = 'usd'; 
      console.log('Converted TND to USD:', { amountInCents, currency });
    } else {
    
      console.log('Using provided currency:', currency);
    }

    const paymentIntent = await stripe.paymentIntents.create({
      amount,
      currency,
    });

    res.status(200).json({ clientSecret: paymentIntent.client_secret });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
};

module.exports = { createPaymentIntent };