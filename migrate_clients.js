const { getConnection } = require('./server'); // Import just connection logic if possible, or copy paste
const sql = require('mssql');
require('dotenv').config();

const config = {
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    server: process.env.DB_SERVER,
    database: process.env.DB_NAME,
    options: {
        encrypt: true,
        trustServerCertificate: true
    }
};

async function migrate() {
    try {
        const pool = await sql.connect(config);
        console.log('Connected to DB');

        const query1 = `
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'allow_credit')
        BEGIN
            ALTER TABLE Clients ADD allow_credit BIT DEFAULT 1;
            PRINT 'Added allow_credit';
        END
        `;

        const query2 = `
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'default_credit_days')
        BEGIN
            ALTER TABLE Clients ADD default_credit_days INT DEFAULT 30;
            PRINT 'Added default_credit_days';
        END
        `;

        await pool.request().query(query1);
        await pool.request().query(query2);

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed', err);
        process.exit(1);
    }
}

migrate();
