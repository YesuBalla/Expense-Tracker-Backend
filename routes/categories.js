const express = require('express');
const db = require('../db');
const { verifyToken } = require('./users');
const router = express.Router();

// Add Category
router.post('/', verifyToken, (req, res) => {
    const { name, type } = req.body;
    db.run(`INSERT INTO categories (name, type) VALUES (?, ?)`, [name, type], function(err) {
        if (err) return res.status(500).send('Error adding category.');
        res.status(201).send({ id: this.lastID, message: 'Category added.' });
    });
});

// Get Categories
router.get('/', verifyToken, (req, res) => {
    db.all(`SELECT * FROM categories`, [], (err, rows) => {
        if (err) return res.status(500).send('Error retrieving categories.');
        res.status(200).json(rows);
    });
});

module.exports = router;
