const express = require('express');
const axios = require('axios');
const crypto = require('crypto');
const db = require('../utils/database');
const { authenticateToken, requireRole } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get wallet balance (read-only for students)
router.get('/balance', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    
    const wallet = await db('wallets')
      .where({ user_id: user.id })
      .first();

    if (!wallet) {
      return res.status(404).json({
        success: false,
        message: 'Wallet not found'
      });
    }

    res.json({
      success: true,
      data: {
        balance: wallet.balance,
        currency: wallet.currency,
        is_active: wallet.is_active
      }
    });

  } catch (error) {
    logger.error('Wallet balance fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch wallet balance'
    });
  }
});

// Get transaction history (read-only for students)
router.get('/transactions', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    const transactions = await db('transactions')
      .where({ user_id: user.id })
      .orderBy('created_at', 'desc')
      .limit(limit)
      .offset(offset)
      .select('id', 'reference', 'type', 'status', 'amount', 'fee', 'currency', 'description', 'payment_method', 'created_at', 'paid_at');

    const total = await db('transactions')
      .where({ user_id: user.id })
      .count('* as count')
      .first();

    res.json({
      success: true,
      data: {
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Transaction history fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction history'
    });
  }
});

// Initiate wallet funding
router.post('/fund', authenticateToken, requireRole(['student']), validateRequest(schemas.fundWallet), async (req, res) => {
  try {
    const user = req.user;
    const { amount, description } = req.body;

    // Validate minimum amount
    if (amount < 100) {
      return res.status(400).json({
        success: false,
        message: 'Minimum funding amount is ₦100'
      });
    }

    // Generate unique reference
    const reference = `NDU_${Date.now()}_${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

    // Create pending transaction
    const [transaction] = await db('transactions')
      .insert({
        user_id: user.id,
        wallet_id: user.id, // Assuming wallet_id matches user_id
        reference,
        type: 'deposit',
        status: 'pending',
        amount,
        description: description || 'Tuition wallet funding',
        currency: 'NGN'
      })
      .returning('*');

    // Initialize Paystack transaction
    const paystackResponse = await axios.post(
      'https://api.paystack.co/transaction/initialize',
      {
        email: user.email,
        amount: amount * 100, // Convert to kobo
        reference,
        callback_url: `${process.env.FRONTEND_URL}/payment/callback`,
        metadata: {
          user_id: user.id,
          matric_number: user.matric_number,
          transaction_id: transaction.id
        }
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    if (paystackResponse.data.status) {
      // Update transaction with Paystack response
      await db('transactions')
        .where({ id: transaction.id })
        .update({
          payment_gateway_response: paystackResponse.data
        });

      // Log funding initiation
      await db('audit_logs').insert({
        user_id: user.id,
        action: 'initiate_funding',
        resource_type: 'transaction',
        resource_id: transaction.id,
        new_values: { amount, reference, paystack_reference: paystackResponse.data.data.reference },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      logger.info(`Funding initiated for user ${user.matric_number}: ₦${amount}`);

      res.json({
        success: true,
        message: 'Payment initialization successful',
        data: {
          authorization_url: paystackResponse.data.data.authorization_url,
          access_code: paystackResponse.data.data.access_code,
          reference: paystackResponse.data.data.reference,
          amount,
          currency: 'NGN'
        }
      });
    } else {
      throw new Error('Paystack initialization failed');
    }

  } catch (error) {
    logger.error('Wallet funding error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to initialize payment. Please try again.'
    });
  }
});

// Get transaction details
router.get('/transactions/:id', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { id } = req.params;

    const transaction = await db('transactions')
      .where({ id, user_id: user.id })
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    res.json({
      success: true,
      data: { transaction }
    });

  } catch (error) {
    logger.error('Transaction details fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch transaction details'
    });
  }
});

// Download receipt
router.get('/receipt/:transactionId', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { transactionId } = req.params;

    // Get transaction
    const transaction = await db('transactions')
      .where({ id: transactionId, user_id: user.id })
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    if (transaction.status !== 'successful') {
      return res.status(400).json({
        success: false,
        message: 'Receipt only available for successful transactions'
      });
    }

    // Get or create receipt
    let receipt = await db('receipts')
      .where({ transaction_id: transactionId })
      .first();

    if (!receipt) {
      // Generate receipt number
      const receiptNumber = `NDU-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      
      // Create receipt record
      [receipt] = await db('receipts')
        .insert({
          transaction_id: transactionId,
          user_id: user.id,
          receipt_number: receiptNumber,
          receipt_data: {
            transaction,
            user: {
              matric_number: user.matric_number,
              first_name: user.first_name,
              last_name: user.last_name,
              department: user.department,
              level: user.level,
              session: user.session
            },
            school: {
              name: 'Niger Delta University',
              address: 'Wilberforce Island, Bayelsa State, Nigeria'
            }
          }
        })
        .returning('*');
    }

    // For now, return receipt data (PDF generation would be implemented separately)
    res.json({
      success: true,
      data: {
        receipt_number: receipt.receipt_number,
        transaction: {
          reference: transaction.reference,
          amount: transaction.amount,
          currency: transaction.currency,
          paid_at: transaction.paid_at,
          description: transaction.description
        },
        user: {
          matric_number: user.matric_number,
          first_name: user.first_name,
          last_name: user.last_name,
          department: user.department,
          level: user.level,
          session: user.session
        },
        school: {
          name: 'Niger Delta University',
          address: 'Wilberforce Island, Bayelsa State, Nigeria'
        }
      }
    });

  } catch (error) {
    logger.error('Receipt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
});

// Verify payment status
router.get('/verify/:reference', authenticateToken, async (req, res) => {
  try {
    const user = req.user;
    const { reference } = req.params;

    // Get transaction from database
    const transaction = await db('transactions')
      .where({ reference, user_id: user.id })
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // If already successful, return current status
    if (transaction.status === 'successful') {
      return res.json({
        success: true,
        data: {
          status: transaction.status,
          amount: transaction.amount,
          reference: transaction.reference,
          paid_at: transaction.paid_at
        }
      });
    }

    // Verify with Paystack
    const paystackResponse = await axios.get(
      `https://api.paystack.co/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`
        }
      }
    );

    if (paystackResponse.data.status && paystackResponse.data.data.status === 'success') {
      const paystackData = paystackResponse.data.data;

      // Update transaction status
      await db('transactions')
        .where({ id: transaction.id })
        .update({
          status: 'successful',
          paid_at: new Date(paystackData.paid_at),
          payment_method: paystackData.channel,
          payment_channel: paystackData.channel,
          payment_gateway_response: paystackData
        });

      // Update wallet balance
      await db('wallets')
        .where({ user_id: user.id })
        .increment('balance', transaction.amount);

      // Log successful payment
      await db('audit_logs').insert({
        user_id: user.id,
        action: 'payment_successful',
        resource_type: 'transaction',
        resource_id: transaction.id,
        new_values: { status: 'successful', amount: transaction.amount },
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      logger.info(`Payment successful for user ${user.matric_number}: ₦${transaction.amount}`);

      res.json({
        success: true,
        data: {
          status: 'successful',
          amount: transaction.amount,
          reference: transaction.reference,
          paid_at: new Date(paystackData.paid_at)
        }
      });
    } else {
      res.json({
        success: true,
        data: {
          status: 'pending',
          amount: transaction.amount,
          reference: transaction.reference
        }
      });
    }

  } catch (error) {
    logger.error('Payment verification error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to verify payment status'
    });
  }
});

module.exports = router;
