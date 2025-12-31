const { getConnection } = require('./db');
const sql = require('mssql');

async function migrate() {
    try {
        console.log('Connecting to DB...');
        const pool = await getConnection();

        // 1. ReceivablePayments
        if ((await pool.request().query("SELECT * FROM sys.tables WHERE name = 'ReceivablePayments'")).recordset.length === 0) {
            console.log('Creating ReceivablePayments table...');
            await pool.request().query(`
                CREATE TABLE ReceivablePayments (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    receivableId INT FOREIGN KEY REFERENCES AccountsReceivable(id),
                    amount DECIMAL(18,2) NOT NULL,
                    date DATETIME DEFAULT GETDATE()
                )
            `);
        }

        // 2. PayablePayments
        if ((await pool.request().query("SELECT * FROM sys.tables WHERE name = 'PayablePayments'")).recordset.length === 0) {
            console.log('Creating PayablePayments table...');
            await pool.request().query(`
                CREATE TABLE PayablePayments (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    payableId INT FOREIGN KEY REFERENCES AccountsPayable(id),
                    amount DECIMAL(18,2) NOT NULL,
                    date DATETIME DEFAULT GETDATE()
                )
            `);
        }

        console.log('Migration completed.');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
