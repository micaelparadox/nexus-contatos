const express = require('express');
const morgan = require('morgan');
const db = require('./db');
const backupDatabase = require('./backup');
const path = require('path');
const app = express();
const PORT = 3000;

app.use(morgan('dev'));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

app.get('/contacts', (req, res) => {
    const { page = 1, limit = 10, sort = 'asc', search = '', city = '' } = req.query;
    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const offset = (pageNum - 1) * limitNum;
    const order = sort === 'desc' ? 'DESC' : 'ASC';

    const query = `
        SELECT * FROM contacts
        WHERE (name LIKE ? OR phone_number LIKE ?) AND city LIKE ?
        ORDER BY name ${order}
        LIMIT ? OFFSET ?
    `;

    const countQuery = `
        SELECT COUNT(*) AS count FROM contacts 
        WHERE (name LIKE ? OR phone_number LIKE ?) AND city LIKE ?
    `;

    db.get(countQuery, [`%${search}%`, `%${search}%`, `%${city}%`], (err, countResult) => {
        if (err) return res.status(500).json({ error: err.message });

        db.all(query, [`%${search}%`, `%${search}%`, `%${city}%`, limitNum, offset], (err, rows) => {
            if (err) return res.status(500).json({ error: err.message });

            res.json({
                data: rows,
                page: pageNum,
                limit: limitNum,
                total: countResult.count,
            });
        });
    });
});

app.post('/contacts', (req, res) => {
    const { phone_number, name, social_media, city, description } = req.body;

    if (!phone_number || !name) {
        return res.status(400).json({ error: 'Name and phone number are required' });
    }

    db.get('SELECT id FROM contacts WHERE phone_number = ?', [phone_number], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: 'Contact with this phone number already exists' });

        db.run(
            'INSERT INTO contacts (phone_number, name, social_media, city, description) VALUES (?, ?, ?, ?, ?)',
            [phone_number, name, social_media, city, description],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                res.status(201).json({ message: 'Contact added successfully', id: this.lastID });
            }
        );
    });
});

app.put('/contacts/:id', (req, res) => {
    const { id } = req.params;
    const { phone_number, name, social_media, city, description } = req.body;

    if (!phone_number || !name) {
        return res.status(400).json({ error: 'Name and phone number are required' });
    }

    // Check if phone number exists for a different contact
    db.get('SELECT id FROM contacts WHERE phone_number = ? AND id != ?', [phone_number, id], (err, row) => {
        if (err) return res.status(500).json({ error: err.message });
        if (row) return res.status(409).json({ error: 'Phone number already exists for another contact' });

        db.run(
            `UPDATE contacts SET phone_number = ?, name = ?, social_media = ?, city = ?, description = ? WHERE id = ?`,
            [phone_number, name, social_media, city, description, id],
            function(err) {
                if (err) return res.status(500).json({ error: err.message });
                if (this.changes === 0) return res.status(404).json({ error: 'Contact not found' });
                res.json({ message: 'Contact updated successfully' });
            }
        );
    });
});

app.delete('/contacts/:id', (req, res) => {
    const { id } = req.params;
    db.run('DELETE FROM contacts WHERE id = ?', [id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Contact not found' });
        res.json({ message: 'Contact deleted successfully' });
    });
});

app.post('/backup', (req, res) => {
    try {
        backupDatabase();
        res.json({ message: 'Backup created successfully' });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

setInterval(backupDatabase, 24 * 60 * 60 * 1000);

app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});