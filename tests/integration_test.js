// const fetch = require('node-fetch'); // Native fetch in Node 18+

const API_URL = 'http://localhost:3000/api';

// Colors for console output
const colors = {
    reset: '\x1b[0m',
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

const log = (msg, color = colors.reset) => console.log(`${color}${msg}${colors.reset}`);
const fail = (msg) => { log(`❌ ${msg}`, colors.red); throw new Error(msg); };
const pass = (msg) => log(`✅ ${msg}`, colors.green);

async function request(endpoint, method = 'GET', body = null) {
    const opts = { method, headers: { 'Content-Type': 'application/json' } };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(`${API_URL}/${endpoint}`, opts);
    if (!res.ok) {
        const text = await res.text();
        throw new Error(`API Error ${res.status}: ${text}`);
    }
    return res.json();
}

async function runTests() {
    log('🚀 Iniciando Pruebas Integrales...', colors.blue);
    const timestamp = Date.now();

    // 1. Create User (if needed, but we can use endpoints directly usually if auth is not strictly enforced on middleware yet, 
    // actually middleware IS enforced on server.js? Let's check context. 
    // Context says: "User provided and updated database credentials... Users permissions are stored...". 
    // Looking at server.js output in previous turns, I didn't verify if auth middleware is properly blocking routes. 
    // Let's assume public for now or we might fail. 
    // WAIT, server.js likely has NO Auth middleware protecting the routes based on the code I saw earlier. 
    // The Frontend `App.checkAuth` is purely UI side. The server routes were defined like `app.get(...)`.
    // So we can hit endpoints directly.

    try {
        // --- STEP 1: Create Product ---
        log('\n[1] Creando Producto de Prueba...');
        const productData = {
            code: `TST-${timestamp}`,
            name: `Test Product ${timestamp}`,
            stock: 10,
            cost: 50,
            price: 100,
            category: 'Testing'
        };
        // We assume POST /products exists based on context "Products: CRUD operations"
        const prodRes = await request('products', 'POST', productData);
        log(`Respuesta Creación: ${JSON.stringify(prodRes)}`);

        const products = await request('products');
        log(`Productos encontrados: ${products.length}`);
        const product = products.find(p => p.name === productData.name);

        if (!product) {
            log(`Buscando: ${productData.name}`);
            log(`Nombres encontrados: ${products.map(p => p.name).join(', ')}`);
            fail('Producto no creado correctamente');
        }
        pass(`Producto creado: ID ${product.id} (Stock: ${product.stock})`);


        // --- STEP 2: Create Client ---
        log('\n[2] Creando Cliente de Prueba...');
        const clientData = {
            name: `Test Client ${timestamp}`,
            email: `client${timestamp}@test.com`,
            phone: '555-0000',
            address: 'Test Av.'
            // creditLimit might be optional
        };
        await request('clients', 'POST', clientData);

        const clients = await request('clients');
        const client = clients.find(c => c.email === clientData.email);

        if (!client) fail('Cliente no creado correctamente');
        pass(`Cliente creado: ID ${client.id} (Deuda Inicial: ${client.debt})`);


        // --- STEP 3: Process Credit Sale (2 units) ---
        log('\n[3] Procesando Venta a Crédito (2 unidades)...');
        const saleData = {
            clientId: client.id,
            total: 200, // 2 * 100
            paymentMethod: 'credit',
            creditDays: 30,
            items: [
                { productId: product.id, qty: 2, price: 100 }
            ]
        };
        const saleRes = await request('sales', 'POST', saleData);
        const saleId = saleRes.id;
        pass(`Venta registrada: ID ${saleId}`);


        // --- STEP 4: Verification (Stock & Debt) ---
        log('\n[4] Verificando Impacto (Stock y Deuda)...');

        // Check Stock
        const productsAfter = await request('products');
        const productAfter = productsAfter.find(p => p.id === product.id);
        if (productAfter.stock !== 8) fail(`Stock incorrecto. Esperado: 8, Actual: ${productAfter.stock}`);
        pass(`Stock actualizado correctamente (10 -> 8)`);

        // Check Client Debt
        const clientsAfter = await request('clients');
        const clientAfter = clientsAfter.find(c => c.id === client.id);
        // SQL money/decimal defaults can be tricky with JS float, ensure loose comparison or parse
        if (parseFloat(clientAfter.debt) !== 200) fail(`Deuda cliente incorrecta. Esperado: 200, Actual: ${clientAfter.debt}`);
        pass(`Deuda cliente actualizada correctamente (0 -> 200)`);

        // Check Accounts Receivable
        const ar = await request('accounts-receivable');
        // Filter by our client
        const myAr = ar.filter(a => a.clientId === client.id && a.saleId === saleId);
        if (myAr.length === 0) fail('No se generó cuenta por cobrar');
        pass(`Cuenta por cobrar generada correctamente`);


        // --- STEP 5: Process Payment (Partial Payment) ---
        log('\n[5] Procesando Abono Parcial ($150)...');
        // FIFO endpoint: POST /api/accounts-receivable/payment
        const paymentRes = await request('accounts-receivable/payment', 'POST', {
            clientId: client.id,
            amount: 150
        });

        pass(`Pago procesado. Total Pagado: ${paymentRes.totalPaid}`);


        // --- STEP 6: Final Verification ---
        log('\n[6] Verificando Saldos Finales...');

        const clientsFinal = await request('clients');
        const clientFinal = clientsFinal.find(c => c.id === client.id);
        if (parseFloat(clientFinal.debt) !== 50) fail(`Deuda final incorrecta. Esperado: 50, Actual: ${clientFinal.debt}`);
        pass(`Deuda restante correcta: $50`);

        const arFinal = await request('accounts-receivable');
        const myArFinal = arFinal.filter(a => a.clientId === client.id);
        const remainingAr = myArFinal.reduce((sum, item) => sum + parseFloat(item.amount), 0);

        if (remainingAr !== 50) fail(`Suma de facturas incorrecta. Esperado: 50, Actual: ${remainingAr}`);
        pass(`Consistencia AR correcta: $50 pendientes`);


        // --- Cleanup (Optional) ---
        // We could delete, but for now we leave data for inspection if manual check is needed.
        log('\n✨ PRUEBAS COMPLETADAS CON ÉXITO ✨', colors.blue);

    } catch (e) {
        fail(`Excepción Global: ${e.message}`);
    }
}

runTests();
