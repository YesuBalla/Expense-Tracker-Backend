const express = require('express');
const db = require('../db');
const { verifyToken } = require('./users');
const router = express.Router();

// Add Transaction
router.post('/', verifyToken, (req, res) => {
    const { type, category_id, amount, date, description } = req.body;
    const user_id = req.userId;

    db.run(`INSERT INTO transactions (type, category_id, amount, date, description, user_id) 
            VALUES (?, ?, ?, ?, ?, ?)`,
        [type, category_id, amount, date, description, user_id],
        function(err) {
            if (err) return res.status(500).send('Error adding transaction.');
            res.status(201).send({ id: this.lastID, message: 'Transaction added.' });
        });
});

// Get User Transactions with Pagination
router.get('/', verifyToken, (req, res) => {
    const user_id = req.userId;
    const page = parseInt(req.query.page) || 1;  // Default to page 1
    const limit = parseInt(req.query.limit) || 10;  // Default to 10 transactions per page
    const offset = (page - 1) * limit;

    db.get(`SELECT COUNT(*) AS count FROM transactions WHERE user_id = ?`, [user_id], (err, result) => {
        if (err) return res.status(500).send('Error retrieving transactions count.');
        
        const totalTransactions = result.count;
        const totalPages = Math.ceil(totalTransactions / limit);

        // Fetch transactions for the current page
        db.all(`SELECT * FROM transactions WHERE user_id = ? LIMIT ? OFFSET ?`, [user_id, limit, offset], (err, rows) => {
            if (err) return res.status(500).send('Error retrieving transactions.');

            res.status(200).json({
                currentPage: page,
                totalPages: totalPages,
                limit: limit,
                totalTransactions: totalTransactions,
                transactions: rows
            });
        });
    });
});

// Get Transaction by ID
router.get('/:id', verifyToken, (req, res) => {
    const user_id = req.userId;
    const transactionId = req.params.id;

    db.get(`SELECT * FROM transactions WHERE id = ? AND user_id = ?`, [transactionId, user_id], (err, row) => {
        if (err) return res.status(500).send('Error retrieving transaction.');
        if (!row) return res.status(404).send('Transaction not found.');

        res.status(200).json(row);
    });
});

// Update Transaction by ID
router.put('/:id', verifyToken, (req, res) => {
    const user_id = req.userId;
    const transactionId = req.params.id;
    const { type, category_id, amount, date, description } = req.body;

    db.run(`UPDATE transactions SET type = ?, category_id = ?, amount = ?, date = ?, description = ? WHERE id = ? AND user_id = ?`, 
        [type, category_id, amount, date, description, transactionId, user_id], 
        function(err) {
            if (err) return res.status(500).send('Error updating transaction.');
            if (this.changes === 0) return res.status(404).send('Transaction not found.');

            res.status(200).json({ message: 'Transaction updated successfully.' });
        });
});


// Get Summary by Category
router.get('/summary/category', verifyToken, (req, res) => {
    const user_id = req.userId;
    db.all(`
        SELECT c.name, SUM(t.amount) as total 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        WHERE t.user_id = ? 
        GROUP BY c.id`, [user_id], (err, rows) => {
        if (err) return res.status(500).send('Error retrieving summary.');
        res.status(200).json(rows);
    });
});

// Get Summary by Time Period
router.get('/summary/time', verifyToken, (req, res) => {
    const { start_date, end_date } = req.query;
    const user_id = req.userId;

    db.all(`
        SELECT type, SUM(amount) as total 
        FROM transactions 
        WHERE user_id = ? AND date BETWEEN ? AND ?
        GROUP BY type`, [user_id, start_date, end_date], (err, rows) => {
        if (err) return res.status(500).send('Error retrieving summary.');
        res.status(200).json(rows);
    });
});

// Get Monthly Spending by Category
router.get('/report/monthly', verifyToken, (req, res) => {
    const user_id = req.userId;
    const { year, month } = req.query;

    if (!year || !month) {
        return res.status(400).send('Year and month are required.');
    }

    // Query to sum expenses by category for the specified month and year
    db.all(`
        SELECT c.name AS category, SUM(t.amount) AS total 
        FROM transactions t 
        JOIN categories c ON t.category_id = c.id 
        WHERE t.user_id = ? AND t.type = 'expense' 
        AND strftime('%Y', t.date) = ? AND strftime('%m', t.date) = ? 
        GROUP BY c.id
    `, [user_id, year, month], (err, rows) => {
        if (err) return res.status(500).send('Error retrieving report.');

        res.status(200).json({
            year: year,
            month: month,
            spending: rows
        });
    });
});

// Delete Transaction by ID
router.delete('/:id', verifyToken, (req, res) => {
    const user_id = req.userId;
    const transactionId = req.params.id;

    db.run(`DELETE FROM transactions WHERE id = ? AND user_id = ?`, [transactionId, user_id], function(err) {
        if (err) return res.status(500).send('Error deleting transaction.');
        if (this.changes === 0) return res.status(404).send('Transaction not found.');

        res.status(200).json({ message: 'Transaction deleted successfully.' });
    });
});


module.exports = router;
