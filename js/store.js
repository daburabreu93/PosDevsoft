/**
 * Data Store Management Module (API Client)
 * Handles interaction with Node.js/Express Backend through simplified Fetch API
 */

const API_URL = 'http://localhost:3000/api';

const Store = {
    // --- Helpers ---
    request: async (endpoint, method = 'GET', body = null) => {
        const headers = { 'Content-Type': 'application/json' };
        const options = { method, headers };
        if (body) options.body = JSON.stringify(body);

        try {
            const response = await fetch(`${API_URL}/${endpoint}`, options);
            if (!response.ok) {
                const text = await response.text();
                throw new Error(text || 'Network response was not ok');
            }
            // Add a small delay for local dev feeling differently? No.
            return await response.json();
        } catch (error) {
            console.error('API Request Error:', error);
            throw error;
        }
    },

    // --- Products ---
    getProducts: async () => await Store.request('products'),
    addProduct: async (product) => await Store.request('products', 'POST', product),
    updateProduct: async (product) => await Store.request(`products/${product.id}`, 'PUT', product),
    deleteProduct: async (id) => await Store.request(`products/${id}`, 'DELETE'),

    // --- Categories ---
    getCategories: async () => await Store.request('categories'),
    addCategory: async (category) => await Store.request('categories', 'POST', category),
    updateCategory: async (category) => await Store.request(`categories/${category.id}`, 'PUT', category),
    deleteCategory: async (id) => await Store.request(`categories/${id}`, 'DELETE'),

    // --- Clients ---
    getClients: async () => await Store.request('clients'),
    addClient: async (client) => await Store.request('clients', 'POST', client),
    updateClient: async (client) => await Store.request(`clients/${client.id}`, 'PUT', client),

    // --- Suppliers ---
    getSuppliers: async () => await Store.request('suppliers'),
    addSupplier: async (supplier) => await Store.request('suppliers', 'POST', supplier),

    // --- Users & Auth ---
    login: async (username, password) => {
        try {
            const user = await Store.request('login', 'POST', { username, password });
            localStorage.setItem('pos_user', JSON.stringify(user));
            return user;
        } catch (e) {
            return null;
        }
    },
    logout: () => {
        localStorage.removeItem('pos_user');
    },
    getCurrentUser: () => {
        try {
            return JSON.parse(localStorage.getItem('pos_user'));
        } catch (e) { return null; }
    },
    getUsers: async () => await Store.request('users'),
    addUser: async (user) => await Store.request('users', 'POST', user),
    updateUser: async (user) => await Store.request(`users/${user.id}`, 'PUT', user),
    deleteUser: async (id) => await Store.request(`users/${id}`, 'DELETE'),

    // --- Sales ---
    createSale: async (saleData) => await Store.request('sales', 'POST', saleData),
    getSales: async () => await Store.request('sales'),

    // --- Accounts ---
    getAccountsReceivable: async () => await Store.request('accounts-receivable'),
    processClientPayment: async (clientId, amount) => {
        try {
            await Store.request('accounts-receivable/payment', 'POST', { clientId, amount });
            return true;
        } catch (e) { return false; }
    },

    getAccountsPayable: async () => await Store.request('accounts-payable'),
    addAccountPayable: async (ap) => await Store.request('accounts-payable', 'POST', ap),
    processSupplierPayment: async (id, amount) => {
        try {
            await Store.request('accounts-payable/payment', 'POST', { id, amount });
            return true;
        } catch (e) { return false; }
    },

    // --- History ---
    getReceivableHistory: async (id) => await Store.request(`accounts/history/${id}`),
    getPayableHistory: async (id) => await Store.request(`accounts-payable/history/${id}`),

    // --- Daily Summary ---
    getDailySummary: async () => await Store.request('daily-summary'),
    getTodaySales: async () => await Store.request('sales/today'),
    getTodayExpenses: async () => await Store.request('expenses/today'),

    getStats: async () => await Store.request('stats')
};



