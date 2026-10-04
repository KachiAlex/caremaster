const express = require('express');
const crypto = require('crypto');
const db = require('../utils/database');
const { logger } = require('../utils/logger');

const router = express.Router();

// Paystack webhook handler — req.body arrives as a raw Buffer (the raw
// parser for this path is mounted in server.js before express.json so the
// HMAC is computed over the exact bytes Paystack signed).
router.post('/paystack', async (req, res) => {
  try {
    const rawBody = Buffer.isBuffer(req.body)
      ? req.body
      : Buffer.from(JSON.stringify(req.body || {}), 'utf8');

    const hash = crypto
      .createHmac('sha512', process.env.PAYSTACK_WEBHOOK_SECRET)
      .update(rawBody)
      .digest('hex');

    const signature = String(req.headers['x-paystack-signature'] || '');
    const expected = Buffer.from(hash, 'utf8');
    const actual = Buffer.from(signature, 'utf8');
    if (expected.length !== actual.length || !crypto.timingSafeEqual(expected, actual)) {
      logger.warn('Invalid Paystack webhook signature');
      return res.status(400).send('Invalid signature');
    }

    const event = JSON.parse(rawBody.toString('utf8'));
    logger.info(`Paystack webhook received: ${event.event}`);

    switch (event.event) {
      case 'charge.success':
        await handleSuccessfulPayment(event.data);
        break;
      case 'charge.failed':
        await handleFailedPayment(event.data);
        break;
      default:
        logger.info(`Unhandled webhook event: ${event.event}`);
    }

    res.status(200).send('OK');
  } catch (error) {
    logger.error('Webhook processing error:', error);
    res.status(500).send('Webhook processing failed');
  }
});

async function handleSuccessfulPayment(data) {
  try {
    const { reference, amount, paid_at, channel, customer } = data;

    // Find transaction
    const transaction = await db('transactions')
      .where({ reference })
      .first();

    if (!transaction) {
      logger.error(`Transaction not found for reference: ${reference}`);
      return;
    }

    if (transaction.status === 'successful') {
      logger.info(`Transaction ${reference} already processed`);
      return;
    }

    // Start database transaction
    await db.transaction(async (trx) => {
      // Update transaction status
      await trx('transactions')
        .where({ id: transaction.id })
        .update({
          status: 'successful',
          paid_at: new Date(paid_at),
          payment_method: channel,
          payment_channel: channel,
          payment_gateway_response: data
        });

      // Update wallet balance
      await trx('wallets')
        .where({ user_id: transaction.user_id })
        .increment('balance', transaction.amount);

      // Get user details for logging
      const user = await trx('users')
        .where({ id: transaction.user_id })
        .first();

      // Log successful payment
      await trx('audit_logs').insert({
        user_id: transaction.user_id,
        action: 'payment_successful_webhook',
        resource_type: 'transaction',
        resource_id: transaction.id,
        new_values: { 
          status: 'successful', 
          amount: transaction.amount,
          paystack_reference: reference 
        }
      });

      logger.info(`Payment successful via webhook - User: ${user.matric_number}, Amount: ₦${transaction.amount}, Reference: ${reference}`);

      // TODO: Send email notification to user
      // TODO: Auto-transfer to school bank account
      // TODO: Generate receipt
    });

  } catch (error) {
    logger.error('Error handling successful payment:', error);
    throw error;
  }
}

async function handleFailedPayment(data) {
  try {
    const { reference, amount, customer } = data;

    // Find transaction
    const transaction = await db('transactions')
      .where({ reference })
      .first();

    if (!transaction) {
      logger.error(`Transaction not found for reference: ${reference}`);
      return;
    }

    // Update transaction status
    await db('transactions')
      .where({ id: transaction.id })
      .update({
        status: 'failed',
        payment_gateway_response: data
      });

    // Get user details for logging
    const user = await db('users')
      .where({ id: transaction.user_id })
      .first();

    // Log failed payment
    await db('audit_logs').insert({
      user_id: transaction.user_id,
      action: 'payment_failed_webhook',
      resource_type: 'transaction',
      resource_id: transaction.id,
      new_values: { 
        status: 'failed', 
        amount: transaction.amount,
        paystack_reference: reference 
      }
    });

    logger.info(`Payment failed via webhook - User: ${user.matric_number}, Amount: ₦${transaction.amount}, Reference: ${reference}`);

    // TODO: Send email notification to user about failed payment

  } catch (error) {
    logger.error('Error handling failed payment:', error);
    throw error;
  }
}

module.exports = router;
