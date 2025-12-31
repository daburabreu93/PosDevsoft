const { getConnection } = require('./db');

async function migrate() {
    try {
        console.log('Connecting via shared db module...');
        const pool = await getConnection();
        console.log('Connected.');

        const query1 = `
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'allow_credit')
        BEGIN
            ALTER TABLE Clients ADD allow_credit BIT DEFAULT 1;
            PRINT 'Added allow_credit';
        END
        ELSE PRINT 'allow_credit already exists';
        `;

        const query2 = `
        IF NOT EXISTS(SELECT * FROM sys.columns WHERE object_id = OBJECT_ID('Clients') AND name = 'default_credit_days')
        BEGIN
            ALTER TABLE Clients ADD default_credit_days INT DEFAULT 30;
            PRINT 'Added default_credit_days';
        END
        ELSE PRINT 'default_credit_days already exists';
        `;

        await pool.request().query(query1);
        await pool.request().query(query2);

        console.log('Migration complete');
        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
