const { getConnection } = require('./db');
const sql = require('mssql');

async function migrate() {
    try {
        console.log('Connecting to DB...');
        const pool = await getConnection();

        // Check if 'initialAmount' exists
        const result = await pool.request().query("SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AccountsPayable') AND name = 'initialAmount'");

        if (result.recordset.length === 0) {
            console.log('Adding initialAmount column...');

            // Add column
            await pool.request().query('ALTER TABLE AccountsPayable ADD initialAmount DECIMAL(18,2)');

            // Backfill existing data
            await pool.request().query('UPDATE AccountsPayable SET initialAmount = amount');

            console.log('Schema updated and data backfilled.');
        } else {
            console.log('Schema already up to date.');
        }

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
