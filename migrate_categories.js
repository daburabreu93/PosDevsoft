const { getConnection } = require('./db');
const sql = require('mssql');

async function migrate() {
    try {
        console.log('Connecting to DB...');
        const pool = await getConnection();

        // 1. Create Categories Table
        await pool.request().query(`
            IF OBJECT_ID('Categories', 'U') IS NULL
            BEGIN
                CREATE TABLE Categories (
                    id INT IDENTITY(1,1) PRIMARY KEY,
                    name NVARCHAR(100) NOT NULL UNIQUE,
                    description NVARCHAR(255)
                );
                PRINT 'Categories table created.';
            END
        `);

        // 2. Populate from existing Products
        console.log('Migrating existing categories...');
        const result = await pool.request().query('SELECT DISTINCT category FROM Products WHERE category IS NOT NULL AND category <> \'\'');

        let count = 0;
        for (const row of result.recordset) {
            const catName = row.category;
            // Insert if not exists
            try {
                await pool.request()
                    .input('name', sql.NVarChar(100), catName)
                    .query('IF NOT EXISTS (SELECT * FROM Categories WHERE name = @name) INSERT INTO Categories (name) VALUES (@name)');
                count++;
            } catch (ignore) { }
        }
        console.log(`Migrated ${count} categories.`);

        process.exit(0);
    } catch (err) {
        console.error('Migration failed:', err);
        process.exit(1);
    }
}

migrate();
