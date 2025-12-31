const { getConnection, sql } = require('../db');
const fs = require('fs');
const path = require('path');

async function initDB() {
    try {
        const pool = await getConnection();
        const schemaPath = path.join(__dirname, '../database/schema.sql');
        const schemaSql = fs.readFileSync(schemaPath, 'utf8');

        // Split by GO if necessary, but mssql driver usually handles batches if sent correctly or might need splitting.
        // Simple trick: split by 'GO' case insensitive on new lines.
        const batches = schemaSql.split(/\nGO\r?\n/i);

        console.log(`Found ${batches.length} batches to execute.`);

        for (const batch of batches) {
            if (batch.trim()) {
                await pool.request().query(batch);
                console.log('Batch executed successfully.');
            }
        }

        console.log('Database initialized successfully!');
        process.exit(0);
    } catch (err) {
        console.error('Error initializing database:', err);
        process.exit(1);
    }
}

initDB();
