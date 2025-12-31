const { getConnection } = require('./db');
const sql = require('mssql');

async function migrate() {
    try {
        console.log('Connecting to DB...');
        const pool = await getConnection();

        // 1. Alter AccountsPayable
        // Check if 'payee' exists
        const result = await pool.request().query("SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('AccountsPayable') AND name = 'payee'");

        if (result.recordset.length === 0) {
            console.log('Adding payee and type columns, and making supplierId nullable...');

            // Allow nulls on supplierId
            await pool.request().query('ALTER TABLE AccountsPayable ALTER COLUMN supplierId INT NULL');

            // Add payee column
            await pool.request().query('ALTER TABLE AccountsPayable ADD payee NVARCHAR(200)');

            // Add type column (default 'invoice')
            await pool.request().query("ALTER TABLE AccountsPayable ADD type NVARCHAR(50) DEFAULT 'invoice'");

            console.log('Schema updated.');
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
