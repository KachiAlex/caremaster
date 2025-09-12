const express = require('express');
const ExcelJS = require('exceljs');
const PDFDocument = require('pdfkit');
const createCsvWriter = require('csv-writer').createObjectCsvWriter;
const db = require('../utils/database');
const { authenticateToken, requireRole, require2FA } = require('../middleware/auth');
const { validateRequest, schemas } = require('../middleware/validation');
const { logger } = require('../utils/logger');

const router = express.Router();

// Get dashboard statistics
router.get('/dashboard', authenticateToken, requireRole(['bursar', 'admin']), require2FA, async (req, res) => {
  try {
    const { start_date, end_date } = req.query;
    
    // Build date filter
    let dateFilter = {};
    if (start_date && end_date) {
      dateFilter = {
        'transactions.created_at': {
          '>=': new Date(start_date),
          '<=': new Date(end_date)
        }
      };
    }

    // Get total statistics
    const [
      totalStudents,
      totalTransactions,
      totalRevenue,
      successfulTransactions,
      pendingTransactions,
      failedTransactions
    ] = await Promise.all([
      db('users').where({ user_type: 'student', is_active: true }).count('* as count').first(),
      db('transactions').where(dateFilter).count('* as count').first(),
      db('transactions').where({ ...dateFilter, status: 'successful' }).sum('amount as total').first(),
      db('transactions').where({ ...dateFilter, status: 'successful' }).count('* as count').first(),
      db('transactions').where({ ...dateFilter, status: 'pending' }).count('* as count').first(),
      db('transactions').where({ ...dateFilter, status: 'failed' }).count('* as count').first()
    ]);

    // Get recent transactions
    const recentTransactions = await db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .where(dateFilter)
      .orderBy('transactions.created_at', 'desc')
      .limit(10)
      .select(
        'transactions.id',
        'transactions.reference',
        'transactions.amount',
        'transactions.status',
        'transactions.created_at',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department'
      );

    // Get department-wise statistics
    const departmentStats = await db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .where({ ...dateFilter, 'transactions.status': 'successful' })
      .groupBy('users.department')
      .select('users.department')
      .count('transactions.id as transaction_count')
      .sum('transactions.amount as total_amount');

    res.json({
      success: true,
      data: {
        statistics: {
          totalStudents: parseInt(totalStudents.count),
          totalTransactions: parseInt(totalTransactions.count),
          totalRevenue: parseFloat(totalRevenue.total || 0),
          successfulTransactions: parseInt(successfulTransactions.count),
          pendingTransactions: parseInt(pendingTransactions.count),
          failedTransactions: parseInt(failedTransactions.count)
        },
        recentTransactions,
        departmentStats
      }
    });

  } catch (error) {
    logger.error('Admin dashboard error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch dashboard data'
    });
  }
});

// Get detailed reports with filtering
router.get('/reports', authenticateToken, requireRole(['bursar', 'admin']), require2FA, validateRequest(schemas.adminReports), async (req, res) => {
  try {
    const { 
      start_date, 
      end_date, 
      department, 
      session, 
      status, 
      page = 1, 
      limit = 20 
    } = req.query;

    const offset = (page - 1) * limit;

    // Build query
    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.id',
        'transactions.reference',
        'transactions.type',
        'transactions.status',
        'transactions.amount',
        'transactions.fee',
        'transactions.currency',
        'transactions.description',
        'transactions.payment_method',
        'transactions.created_at',
        'transactions.paid_at',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.level',
        'users.session'
      );

    // Apply filters
    if (start_date && end_date) {
      query = query.whereBetween('transactions.created_at', [new Date(start_date), new Date(end_date)]);
    }
    if (department) {
      query = query.where('users.department', department);
    }
    if (session) {
      query = query.where('users.session', session);
    }
    if (status) {
      query = query.where('transactions.status', status);
    }

    // Get total count
    const totalQuery = query.clone();
    const total = await totalQuery.count('* as count').first();

    // Get paginated results
    const transactions = await query
      .orderBy('transactions.created_at', 'desc')
      .limit(limit)
      .offset(offset);

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
    logger.error('Admin reports error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch reports'
    });
  }
});

// Export reports to Excel
router.get('/reports/export/excel', authenticateToken, requireRole(['bursar', 'admin']), require2FA, async (req, res) => {
  try {
    const { start_date, end_date, department, session, status } = req.query;

    // Build query (same as reports endpoint)
    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.reference',
        'transactions.type',
        'transactions.status',
        'transactions.amount',
        'transactions.fee',
        'transactions.currency',
        'transactions.description',
        'transactions.payment_method',
        'transactions.created_at',
        'transactions.paid_at',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.level',
        'users.session'
      );

    // Apply filters
    if (start_date && end_date) {
      query = query.whereBetween('transactions.created_at', [new Date(start_date), new Date(end_date)]);
    }
    if (department) {
      query = query.where('users.department', department);
    }
    if (session) {
      query = query.where('users.session', session);
    }
    if (status) {
      query = query.where('transactions.status', status);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Transaction Report');

    // Add headers
    worksheet.columns = [
      { header: 'Reference', key: 'reference', width: 20 },
      { header: 'Matric Number', key: 'matric_number', width: 15 },
      { header: 'Student Name', key: 'student_name', width: 25 },
      { header: 'Department', key: 'department', width: 20 },
      { header: 'Level', key: 'level', width: 10 },
      { header: 'Session', key: 'session', width: 15 },
      { header: 'Amount (₦)', key: 'amount', width: 15 },
      { header: 'Fee (₦)', key: 'fee', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Payment Method', key: 'payment_method', width: 15 },
      { header: 'Created At', key: 'created_at', width: 20 },
      { header: 'Paid At', key: 'paid_at', width: 20 }
    ];

    // Add data
    transactions.forEach(transaction => {
      worksheet.addRow({
        reference: transaction.reference,
        matric_number: transaction.matric_number,
        student_name: `${transaction.first_name} ${transaction.last_name}`,
        department: transaction.department,
        level: transaction.level,
        session: transaction.session,
        amount: transaction.amount,
        fee: transaction.fee,
        status: transaction.status,
        payment_method: transaction.payment_method,
        created_at: transaction.created_at,
        paid_at: transaction.paid_at
      });
    });

    // Style the header row
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFE0E0E0' }
    };

    // Set response headers
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="ndu-transactions-${new Date().toISOString().split('T')[0]}.xlsx"`);

    // Write to response
    await workbook.xlsx.write(res);
    res.end();

    // Log export action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'export_excel',
      resource_type: 'report',
      new_values: { format: 'excel', filters: { start_date, end_date, department, session, status } },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Excel export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export Excel report'
    });
  }
});

// Export reports to CSV
router.get('/reports/export/csv', authenticateToken, requireRole(['bursar', 'admin']), require2FA, async (req, res) => {
  try {
    const { start_date, end_date, department, session, status } = req.query;

    // Build query (same as reports endpoint)
    let query = db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .select(
        'transactions.reference',
        'transactions.type',
        'transactions.status',
        'transactions.amount',
        'transactions.fee',
        'transactions.currency',
        'transactions.description',
        'transactions.payment_method',
        'transactions.created_at',
        'transactions.paid_at',
        'users.matric_number',
        'users.first_name',
        'users.last_name',
        'users.department',
        'users.level',
        'users.session'
      );

    // Apply filters
    if (start_date && end_date) {
      query = query.whereBetween('transactions.created_at', [new Date(start_date), new Date(end_date)]);
    }
    if (department) {
      query = query.where('users.department', department);
    }
    if (session) {
      query = query.where('users.session', session);
    }
    if (status) {
      query = query.where('transactions.status', status);
    }

    const transactions = await query.orderBy('transactions.created_at', 'desc');

    // Prepare CSV data
    const csvData = transactions.map(transaction => ({
      reference: transaction.reference,
      matric_number: transaction.matric_number,
      student_name: `${transaction.first_name} ${transaction.last_name}`,
      department: transaction.department,
      level: transaction.level,
      session: transaction.session,
      amount: transaction.amount,
      fee: transaction.fee,
      status: transaction.status,
      payment_method: transaction.payment_method,
      created_at: transaction.created_at,
      paid_at: transaction.paid_at
    }));

    // Create CSV writer
    const csvWriter = createCsvWriter({
      path: 'temp-transactions.csv',
      header: [
        { id: 'reference', title: 'Reference' },
        { id: 'matric_number', title: 'Matric Number' },
        { id: 'student_name', title: 'Student Name' },
        { id: 'department', title: 'Department' },
        { id: 'level', title: 'Level' },
        { id: 'session', title: 'Session' },
        { id: 'amount', title: 'Amount (₦)' },
        { id: 'fee', title: 'Fee (₦)' },
        { id: 'status', title: 'Status' },
        { id: 'payment_method', title: 'Payment Method' },
        { id: 'created_at', title: 'Created At' },
        { id: 'paid_at', title: 'Paid At' }
      ]
    });

    await csvWriter.writeRecords(csvData);

    // Set response headers
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="ndu-transactions-${new Date().toISOString().split('T')[0]}.csv"`);

    // Read and send file
    const fs = require('fs');
    const fileStream = fs.createReadStream('temp-transactions.csv');
    fileStream.pipe(res);

    // Clean up temp file
    fileStream.on('end', () => {
      fs.unlinkSync('temp-transactions.csv');
    });

    // Log export action
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'export_csv',
      resource_type: 'report',
      new_values: { format: 'csv', filters: { start_date, end_date, department, session, status } },
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('CSV export error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to export CSV report'
    });
  }
});

// Generate and download receipt
router.get('/receipt/:transactionId', authenticateToken, requireRole(['bursar', 'admin']), require2FA, async (req, res) => {
  try {
    const { transactionId } = req.params;

    // Get transaction with user details
    const transaction = await db('transactions')
      .join('users', 'transactions.user_id', 'users.id')
      .where('transactions.id', transactionId)
      .first();

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found'
      });
    }

    // Create PDF receipt
    const doc = new PDFDocument({ margin: 50 });
    
    // Set response headers
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="receipt-${transaction.reference}.pdf"`);

    // Pipe PDF to response
    doc.pipe(res);

    // Add content to PDF
    doc.fontSize(20).text('NIGER DELTA UNIVERSITY', { align: 'center' });
    doc.fontSize(16).text('TUITION PAYMENT RECEIPT', { align: 'center' });
    doc.moveDown();

    doc.fontSize(12);
    doc.text(`Receipt Number: ${transaction.reference}`);
    doc.text(`Date: ${new Date(transaction.paid_at || transaction.created_at).toLocaleDateString()}`);
    doc.moveDown();

    doc.text('Student Information:', { underline: true });
    doc.text(`Matric Number: ${transaction.matric_number}`);
    doc.text(`Name: ${transaction.first_name} ${transaction.last_name}`);
    doc.text(`Department: ${transaction.department}`);
    doc.text(`Level: ${transaction.level}`);
    doc.text(`Session: ${transaction.session}`);
    doc.moveDown();

    doc.text('Payment Information:', { underline: true });
    doc.text(`Amount: ₦${transaction.amount.toLocaleString()}`);
    doc.text(`Status: ${transaction.status.toUpperCase()}`);
    doc.text(`Payment Method: ${transaction.payment_method || 'N/A'}`);
    if (transaction.paid_at) {
      doc.text(`Paid At: ${new Date(transaction.paid_at).toLocaleString()}`);
    }
    doc.moveDown();

    doc.text('School Information:', { underline: true });
    doc.text('Niger Delta University');
    doc.text('Wilberforce Island, Bayelsa State, Nigeria');
    doc.text('Email: info@ndu.edu.ng');
    doc.text('Phone: +234-XXX-XXX-XXXX');

    // Finalize PDF
    doc.end();

    // Log receipt generation
    await db('audit_logs').insert({
      user_id: req.user.id,
      action: 'generate_receipt',
      resource_type: 'receipt',
      resource_id: transactionId,
      ip_address: req.ip,
      user_agent: req.get('User-Agent')
    });

  } catch (error) {
    logger.error('Receipt generation error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to generate receipt'
    });
  }
});

// Get audit logs
router.get('/audit-logs', authenticateToken, requireRole(['admin']), require2FA, async (req, res) => {
  try {
    const { page = 1, limit = 50, action, user_id } = req.query;
    const offset = (page - 1) * limit;

    let query = db('audit_logs')
      .join('users', 'audit_logs.user_id', 'users.id')
      .select(
        'audit_logs.*',
        'users.matric_number',
        'users.first_name',
        'users.last_name'
      );

    if (action) {
      query = query.where('audit_logs.action', action);
    }
    if (user_id) {
      query = query.where('audit_logs.user_id', user_id);
    }

    const logs = await query
      .orderBy('audit_logs.created_at', 'desc')
      .limit(limit)
      .offset(offset);

    const total = await query.clone().count('* as count').first();

    res.json({
      success: true,
      data: {
        logs,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: parseInt(total.count),
          pages: Math.ceil(total.count / limit)
        }
      }
    });

  } catch (error) {
    logger.error('Audit logs fetch error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch audit logs'
    });
  }
});

module.exports = router;
