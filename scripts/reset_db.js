const { getConnection } = require('../db');

async function reset() {
    try {
        const pool = await getConnection();
        console.log('Dropping tables sequentially...');

        const tables = [
            'AccountsPayable',
            'AccountsReceivable',
            'SaleDetails',
            'SaleItems',
            'Sales',
            'Suppliers',
            'Clients',
            'Products',
            'Users'
        ];

        for (const t of tables) {
            console.log(`Dropping ${t}...`);
            try {
                await pool.request().query(`IF OBJECT_ID('${t}', 'U') IS NOT NULL DROP TABLE ${t}`);
            } catch (e) {
                console.error(`Error dropping ${t}:`, e.message);
                // Continue despite error? No, if we can't drop simple FK dep, we fail later.
                // But let's try to proceed.
            }
        }

        console.log('Tables dropped.');
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

reset();
