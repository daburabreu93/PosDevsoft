const { getConnection, sql } = require('../db');

async function run() {
    try {
        console.log('Connecting to DB...');
        const pool = await getConnection();
        console.log('Connected.');

        const name = "Debug Product";
        const code = "DBG-001";
        const price = 100;
        const cost = 50;
        const stock = 10;
        const category = "Debug";

        console.log('Inserting...');
        const res = await pool.request()
            .input('name', sql.NVarChar(200), name)
            .input('code', sql.NVarChar(50), code)
            .input('price', sql.Decimal(18, 2), price)
            .input('cost', sql.Decimal(18, 2), cost)
            .input('stock', sql.Int, stock)
            .input('category', sql.NVarChar(100), category)
            .query('INSERT INTO Products (name, code, price, cost, stock, category) OUTPUT INSERTED.id VALUES (@name, @code, @price, @cost, @stock, @category)');

        console.log('Inserted ID:', res.recordset[0].id);

        console.log('Verifying...');
        const verify = await pool.request()
            .input('id', sql.Int, res.recordset[0].id)
            .query('SELECT * FROM Products WHERE id = @id');

        console.log('Record:', verify.recordset[0]);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
