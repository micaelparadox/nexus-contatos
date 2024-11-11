// src/index.js
const express = require('express');
const morgan = require('morgan');
const db = require('./db');
const backupDatabase = require('./backup');
const path = require('path');
const app = express();
const PORT = 3000;

// Middleware to log requests
app.use(morgan('dev'));

// Middleware to parse JSON
app.use(express.json());

// Serve static files from the "public" folder
app.use(express.static(path.join(__dirname, '../public')));

// Route to get contacts with pagination, sorting, and filtering
app.get('/contacts', (req, res) => {
    const { page = 1, limit = 10, sort = 'asc', search = '', city = '' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const order = sort === 'desc' ? 'DESC' : 'ASC';

    const query = `
        SELECT * FROM contacts
        WHERE name LIKE ? AND city LIKE ?
        ORDER BY name ${order}
        LIMIT ${limitNum} OFFSET ${offset}
    `;

    db.all(query, [`%${search}%`, `%${city}%`], (err, rows) => {
        if (err) return res.status(500).send(err.message);

        db.get(
            `SELECT COUNT(*) AS count FROM contacts WHERE name LIKE ? AND city LIKE ?`,
            [`%${search}%`, `%${city}%`],
            (err, countResult) => {
                if (err) return res.status(500).send(err.message);

                res.json({
                    data: rows,
                    page: pageNum,
                    limit: limitNum,
                    total: countResult.count,
                });
            }
        );
    });
});

// Route to add a new contact
app.post('/contacts', (req, res) => {
    const { phone_number, name, social_media, city, description } = req.body;
    db.run(
        'INSERT INTO contacts (phone_number, name, social_media, city, description) VALUES (?, ?, ?, ?, ?)',
        [phone_number, name, social_media, city, description],
        (err) => {
            if (err) return res.status(500).send(err.message);
            res.status(201).send('Contact added');
        }
    );
});

// Route to manually trigger a backup
app.post('/backup', (req, res) => {
    backupDatabase();
    res.status(200).send('Backup created successfully');
});

// Run backup every 24 hours
setInterval(backupDatabase, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
