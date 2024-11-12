// src/db.js
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database('./db/contacts.db', (err) => {
    if (err) console.error(err.message);
    console.log('Connected to the SQLite database.');
});

// Create the contacts table with a unique constraint on phone_number if it doesn't exist
db.run(`
    CREATE TABLE IF NOT EXISTS contacts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        phone_number TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        social_media TEXT,
        city TEXT,
        description TEXT
    )
`);

module.exports = db;
