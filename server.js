const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const { getConnection, sql } = require('./db');
require('dotenv').config();

const app = express();

// Middlewares
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.static('.')); // Serve static files (Store.js replacement will call this API)

// Routes

// --- PRODUCTS ---
app.get('/api/products', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Products');
        const products = result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        });
        res.json(products);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/products', async (req, res) => {
    const { name, code, price, cost, stock, category } = req.body;
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('name', name)
            .input('code', code)
            .input('price', price)
            .input('cost', cost)
            .input('stock', stock)
            .input('category', category)
            .query('INSERT INTO Products (name, code, price, cost, stock, category) OUTPUT INSERTED.id VALUES (@name, @code, @price, @cost, @stock, @category)');
        res.json({ message: 'Product created', id: result.recordset[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    const { name, stock, cost, price, category } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('stock', sql.Int, stock)
            .input('cost', sql.Decimal(18, 2), cost)
            .input('price', sql.Decimal(18, 2), price)
            .input('category', sql.NVarChar, category)
            .query('UPDATE Products SET name=@name, stock=@stock, cost=@cost, price=@price, category=@category WHERE id=@id');
        res.json({ message: 'Product updated' });
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/products/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Products WHERE id=@id');
        res.json({ message: 'Product deleted' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- CATEGORIES ---
app.get('/api/categories', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Categories');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/categories', async (req, res) => {
    const { name, description } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('name', sql.NVarChar(100), name)
            .input('description', sql.NVarChar(255), description)
            .query('INSERT INTO Categories (name, description) VALUES (@name, @description)');
        res.json({ message: 'Category created' });
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar(100), name)
            .input('description', sql.NVarChar(255), description)
            .query('UPDATE Categories SET name=@name, description=@description WHERE id=@id');
        res.json({ message: 'Category updated' });
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/categories/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Categories WHERE id=@id');
        res.json({ message: 'Category deleted' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- CLIENTS ---
app.get('/api/clients', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Clients');
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/clients/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM Clients WHERE id = @id');

        if (result.recordset.length > 0) {
            const row = result.recordset[0];
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            res.json(lower);
        } else {
            res.status(404).send('Client not found');
        }
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/clients', async (req, res) => {
    const { name, email, phone, address, creditLimit, allowCredit, creditDays } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('name', sql.NVarChar(200), name)
            .input('email', sql.NVarChar(100), email)
            .input('phone', sql.NVarChar(50), phone)
            .input('address', sql.NVarChar(255), address)
            .input('creditLimit', sql.Decimal(18, 2), creditLimit)
            .input('allowCredit', sql.Bit, allowCredit === undefined ? 1 : allowCredit)
            .input('creditDays', sql.Int, creditDays || 30)
            .query('INSERT INTO Clients (name, email, phone, address, creditLimit, allow_credit, default_credit_days) VALUES (@name, @email, @phone, @address, @creditLimit, @allowCredit, @creditDays)');
        res.json({ message: 'Client created' });
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/clients/:id', async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, address, creditLimit, allowCredit, creditDays } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar(200), name)
            .input('email', sql.NVarChar(100), email)
            .input('phone', sql.NVarChar(50), phone)
            .input('address', sql.NVarChar(255), address)
            .input('creditLimit', sql.Decimal(18, 2), creditLimit)
            .input('allowCredit', sql.Bit, allowCredit)
            .input('creditDays', sql.Int, creditDays || 0) // Default to 0 if null/NaN
            .query('UPDATE Clients SET name=@name, email=@email, phone=@phone, address=@address, creditLimit=@creditLimit, allow_credit=@allowCredit, default_credit_days=@creditDays WHERE id=@id');
        res.json({ message: 'Client updated' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- SUPPLIERS ---
app.get('/api/suppliers', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Suppliers');
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/suppliers', async (req, res) => {
    const { name, contact, email, phone } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('name', sql.NVarChar(200), name)
            .input('contact', sql.NVarChar(100), contact)
            .input('email', sql.NVarChar(100), email)
            .input('phone', sql.NVarChar(50), phone)
            .query('INSERT INTO Suppliers (name, contact, email, phone) VALUES (@name, @contact, @email, @phone)');
        res.json({ message: 'Supplier created' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- USERS (Login) ---
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .query('SELECT * FROM Users WHERE username = @username AND password = @password');

        if (result.recordset.length > 0) {
            const user = result.recordset[0];
            // Parse permissions if it's stored as JSON string
            try {
                user.permissions = JSON.parse(user.permissions);
            } catch (e) { user.permissions = {}; }
            res.json(user);
        } else {
            res.status(401).send('Invalid credentials');
        }
    } catch (err) { res.status(500).send(err.message); }
});


// --- USERS (CRUD) ---
app.get('/api/users', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Users');
        const users = result.recordset.map(row => {
            const u = {};
            for (const k in row) u[k.toLowerCase()] = row[k];
            try { u.permissions = JSON.parse(u.permissions); } catch (e) { u.permissions = {}; }
            return u;
        });
        res.json(users);
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/users', async (req, res) => {
    const { name, username, password, role, permissions } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('name', sql.NVarChar, name)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .input('role', sql.NVarChar, role)
            .input('permissions', sql.NVarChar, JSON.stringify(permissions))
            .query('INSERT INTO Users (name, username, password, role, permissions) VALUES (@name, @username, @password, @role, @permissions)');
        res.json({ message: 'User created' });
    } catch (err) { res.status(500).send(err.message); }
});

app.put('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    const { name, username, password, role, permissions } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('id', sql.Int, id)
            .input('name', sql.NVarChar, name)
            .input('username', sql.NVarChar, username)
            .input('password', sql.NVarChar, password)
            .input('role', sql.NVarChar, role)
            .input('permissions', sql.NVarChar, JSON.stringify(permissions))
            .query('UPDATE Users SET name=@name, username=@username, password=@password, role=@role, permissions=@permissions WHERE id=@id');
        res.json({ message: 'User updated' });
    } catch (err) { res.status(500).send(err.message); }
});

app.delete('/api/users/:id', async (req, res) => {
    const { id } = req.params;
    try {
        const pool = await getConnection();
        await pool.request().input('id', sql.Int, id).query('DELETE FROM Users WHERE id=@id');
        res.json({ message: 'User deleted' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- SALES (Transaction) ---
app.get('/api/sales', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM Sales ORDER BY date DESC');
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/sales', async (req, res) => {
    const { items, clientId, total, paymentMethod, creditDays } = req.body;
    const transaction = new sql.Transaction(await getConnection());

    try {
        await transaction.begin();
        const request = new sql.Request(transaction);

        // 1. Insert Sale
        request.input('clientId', sql.Int, clientId || null);
        request.input('total', sql.Decimal(18, 2), total);
        request.input('paymentMethod', sql.NVarChar, paymentMethod);
        request.input('creditDays', sql.Int, creditDays || 0);

        const saleResult = await request.query(`
            INSERT INTO Sales (clientId, total, paymentMethod, creditDays) 
            OUTPUT INSERTED.id 
            VALUES (@clientId, @total, @paymentMethod, @creditDays)
        `);
        const saleId = saleResult.recordset[0].id;

        // 2. Insert Items & Update Stock
        for (const item of items) {
            const itemReq = new sql.Request(transaction);
            itemReq.input('saleId', sql.Int, saleId);
            itemReq.input('productId', sql.Int, item.productId);
            itemReq.input('qty', sql.Int, item.qty);
            itemReq.input('price', sql.Decimal(18, 2), item.price);

            await itemReq.query('INSERT INTO SaleItems (saleId, productId, qty, price) VALUES (@saleId, @productId, @qty, @price)');

            const stockReq = new sql.Request(transaction);
            stockReq.input('qty', sql.Int, item.qty);
            stockReq.input('productId', sql.Int, item.productId);
            await stockReq.query('UPDATE Products SET stock = stock - @qty WHERE id = @productId');
        }

        // 3. Handle Credit (Accounts Receivable & Client Debt)
        if (paymentMethod === 'credit' && clientId) {
            const days = parseInt(creditDays) || 15;
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + days);

            const arReq = new sql.Request(transaction);
            arReq.input('clientId', sql.Int, clientId);
            arReq.input('saleId', sql.Int, saleId);
            arReq.input('amount', sql.Decimal(18, 2), total);
            arReq.input('dueDate', sql.DateTime, dueDate);
            arReq.input('desc', sql.NVarChar, `Venta #${saleId}`);

            await arReq.query(`
                INSERT INTO AccountsReceivable (clientId, saleId, amount, dueDate, description) 
                VALUES (@clientId, @saleId, @amount, @dueDate, @desc)
             `);

            const clientReq = new sql.Request(transaction);
            clientReq.input('id', sql.Int, clientId);
            clientReq.input('amount', sql.Decimal(18, 2), total);
            await clientReq.query('UPDATE Clients SET debt = debt + @amount WHERE id = @id');
        }

        await transaction.commit();
        res.json({ message: 'Sale processed', id: saleId });
    } catch (err) {
        await transaction.rollback();
        res.status(500).send(err.message);
    }
});

// --- ACCOUNTS RECEIVABLE ---
app.get('/api/accounts-receivable', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM AccountsReceivable');
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/accounts-receivable/payment', async (req, res) => {
    const { clientId, amount } = req.body;
    const transaction = new sql.Transaction(await getConnection());

    try {
        await transaction.begin();

        // FIFO Logic on Server
        const listReq = new sql.Request(transaction);
        listReq.input('clientId', sql.Int, clientId);
        const invoices = await listReq.query(`
            SELECT * FROM AccountsReceivable 
            WHERE clientId = @clientId AND status = 'pending' 
            ORDER BY date ASC
        `);

        let remaining = parseFloat(amount);
        let totalPaid = 0;

        for (const inv of invoices.recordset) {
            if (remaining <= 0) break;

            const invAmount = parseFloat(inv.amount);
            let pay = 0;
            let status = 'pending';
            let newAmount = invAmount;

            if (remaining >= invAmount) {
                pay = invAmount;
                remaining -= invAmount;
                newAmount = 0;
                status = 'paid';
            } else {
                pay = remaining;
                newAmount = invAmount - remaining;
                remaining = 0;
            }

            const updateReq = new sql.Request(transaction);
            updateReq.input('id', sql.Int, inv.id);
            updateReq.input('amount', sql.Decimal(18, 2), newAmount);
            updateReq.input('status', sql.NVarChar, status);
            await updateReq.query('UPDATE AccountsReceivable SET amount = @amount, status = @status WHERE id = @id');

            // Log Payment
            const logReq = new sql.Request(transaction);
            logReq.input('receivableId', sql.Int, inv.id);
            logReq.input('amount', sql.Decimal(18, 2), pay);
            await logReq.query('INSERT INTO ReceivablePayments (receivableId, amount) VALUES (@receivableId, @amount)');

            totalPaid += pay;
        }

        if (totalPaid > 0) {
            const clientReq = new sql.Request(transaction);
            clientReq.input('id', sql.Int, clientId);
            clientReq.input('amount', sql.Decimal(18, 2), totalPaid);
            await clientReq.query('UPDATE Clients SET debt = debt - @amount WHERE id = @id');
        }

        await transaction.commit();
        res.json({ message: 'Payment processed', totalPaid });
    } catch (err) {
        await transaction.rollback();
        res.status(500).send(err.message);
    }
});

// --- ACCOUNTS PAYABLE ---
app.get('/api/accounts-payable', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query('SELECT * FROM AccountsPayable');
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/accounts-payable', async (req, res) => {
    const { supplierId, description, amount, date, type, payee } = req.body;
    try {
        const pool = await getConnection();
        await pool.request()
            .input('supplierId', sql.Int, supplierId || null)
            .input('description', sql.NVarChar, description)
            .input('amount', sql.Decimal(18, 2), amount)
            .input('date', sql.DateTime, date)
            .input('type', sql.NVarChar(50), type || 'invoice')
            .input('payee', sql.NVarChar(200), payee)
            .query('INSERT INTO AccountsPayable (supplierId, description, amount, initialAmount, date, type, payee) OUTPUT INSERTED.id VALUES (@supplierId, @description, @amount, @amount, @date, @type, @payee)');
        res.json({ message: 'AP created', id: result.recordset[0].id });
    } catch (err) { res.status(500).send(err.message); }
});

app.post('/api/accounts-payable/payment', async (req, res) => {
    const { id, amount } = req.body;
    try {
        const pool = await getConnection();
        // Simple update logic, simpler than AR
        const r = await pool.request().input('id', sql.Int, id).query('SELECT * FROM AccountsPayable WHERE id=@id');
        if (r.recordset.length === 0) return res.status(404).send('Not found');

        const acc = r.recordset[0];
        let newAmount = acc.amount - amount;
        let status = 'pending';
        if (newAmount <= 0) { newAmount = 0; status = 'paid'; }

        await pool.request()
            .input('id', sql.Int, id)
            .input('amount', sql.Decimal(18, 2), newAmount)
            .input('status', sql.NVarChar, status)
            .query('UPDATE AccountsPayable SET amount=@amount, status=@status WHERE id=@id');

        // Log Payment
        await pool.request()
            .input('payableId', sql.Int, id)
            .input('amount', sql.Decimal(18, 2), amount)
            .query('INSERT INTO PayablePayments (payableId, amount) VALUES (@payableId, @amount)');

        res.json({ message: 'Paid' });
    } catch (err) { res.status(500).send(err.message); }
});

// --- STATS ---
app.get('/api/stats', async (req, res) => {
    try {
        const pool = await getConnection();

        const rSales = await pool.request().query('SELECT SUM(total) as t FROM Sales');
        const totalRevenue = rSales.recordset[0].t || 0;

        const rProd = await pool.request().query('SELECT COUNT(*) as c FROM Products');
        const productsCount = rProd.recordset[0].c || 0;

        const rLow = await pool.request().query('SELECT COUNT(*) as c FROM Products WHERE stock < 5');
        const lowStockCount = rLow.recordset[0].c || 0;

        const rToday = await pool.request().query(`SELECT SUM(total) as t FROM Sales WHERE CAST(date AS DATE) = CAST(GETDATE() AS DATE)`);
        const salesToday = rToday.recordset[0].t || 0;

        res.json({ totalRevenue, productsCount, lowStockCount, salesToday });
    } catch (err) { res.status(500).send(err.message); }
});

// --- DAILY SUMMARY ---
app.get('/api/daily-summary', async (req, res) => {
    try {
        const pool = await getConnection();

        // Total sales today
        const salesResult = await pool.request().query(`
            SELECT SUM(total) as totalSales, COUNT(*) as salesCount,
                   SUM(CASE WHEN paymentMethod = 'cash' THEN total ELSE 0 END) as cashSales,
                   SUM(CASE WHEN paymentMethod = 'credit' THEN total ELSE 0 END) as creditSales
            FROM Sales 
            WHERE CAST(date AS DATE) = CAST(GETDATE() AS DATE)
        `);

        // Total expenses today (payments made on AccountsPayable)
        const expensesResult = await pool.request().query(`
            SELECT SUM(amount) as totalExpenses, COUNT(*) as expenseCount
            FROM PayablePayments
            WHERE CAST(date AS DATE) = CAST(GETDATE() AS DATE)
        `);

        const totalSales = salesResult.recordset[0].totalSales || 0;
        const salesCount = salesResult.recordset[0].salesCount || 0;
        const cashSales = salesResult.recordset[0].cashSales || 0;
        const creditSales = salesResult.recordset[0].creditSales || 0;
        const totalExpenses = expensesResult.recordset[0].totalExpenses || 0;
        const expenseCount = expensesResult.recordset[0].expenseCount || 0;
        const netBalance = totalSales - totalExpenses;

        res.json({
            totalSales,
            salesCount,
            cashSales,
            creditSales,
            totalExpenses,
            expenseCount,
            netBalance
        });
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/sales/today', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT s.id, s.clientId, c.name as clientName, s.total, s.paymentMethod, s.date
            FROM Sales s
            LEFT JOIN Clients c ON s.clientId = c.id
            WHERE CAST(s.date AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY s.date DESC
        `);
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/expenses/today', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request().query(`
            SELECT pp.id, pp.payableId, pp.amount, pp.date,
                   ap.description, 
                   COALESCE(ap.payee, s.name, 'N/A') as payee,
                   ap.type
            FROM PayablePayments pp
            INNER JOIN AccountsPayable ap ON pp.payableId = ap.id
            LEFT JOIN Suppliers s ON ap.supplierId = s.id
            WHERE CAST(pp.date AS DATE) = CAST(GETDATE() AS DATE)
            ORDER BY pp.date DESC
        `);
        res.json(result.recordset.map(row => {
            const lower = {};
            for (const k in row) lower[k.toLowerCase()] = row[k];
            return lower;
        }));
    } catch (err) { res.status(500).send(err.message); }
});

// --- HISTORY ENDPOINTS ---
app.get('/api/accounts/history/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM ReceivablePayments WHERE receivableId = @id ORDER BY date DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

app.get('/api/accounts-payable/history/:id', async (req, res) => {
    try {
        const pool = await getConnection();
        const result = await pool.request()
            .input('id', sql.Int, req.params.id)
            .query('SELECT * FROM PayablePayments WHERE payableId = @id ORDER BY date DESC');
        res.json(result.recordset);
    } catch (err) { res.status(500).send(err.message); }
});

// SPA Fallback: Serve index.html for any other route
const path = require('path');
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
