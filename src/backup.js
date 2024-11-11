// src/backup.js
const db = require('./db');
const fs = require('fs');
const path = require('path');

const backupDatabase = () => {
    const backupFile = path.join(__dirname, '../backups/contacts_backup.json');
    db.serialize(() => {
        const rows = [];
        db.each("SELECT * FROM contacts", (err, row) => {
            if (err) console.error("Error fetching rows:", err.message);
            else rows.push(row);
        }, (err) => {
            if (err) console.error("Error during backup:", err.message);
            else {
                fs.writeFileSync(backupFile, JSON.stringify(rows, null, 2));
                console.log("Database backup saved.");
            }
        });
    });
};

module.exports = backupDatabase;
