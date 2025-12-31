const { getConnection } = require('../db');

async function debug() {
    try {
        const pool = await getConnection();
        const res = await pool.request().query(`
            SELECT 
                fk.name AS constraint_name,
                OBJECT_NAME(fk.parent_object_id) AS table_name,
                OBJECT_NAME(fk.referenced_object_id) AS referenced_table
            FROM sys.foreign_keys fk
        `);
        console.table(res.recordset);
        process.exit(0);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

debug();
