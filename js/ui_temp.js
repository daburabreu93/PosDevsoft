const UI = {
    // --- Utils ---
    formatCurrency: (amount) => {
        return new Intl.NumberFormat('es-DO', { style: 'currency', currency: 'DOP' }).format(amount);
    },

    // --- Components ---
    createTable: (headers, rows, actions = null) => {
        const thead = headers.map(h => `<th>${h}</th>`).join('');
        const tbody = rows.map(row => {
            let tr = '<tr>';
            row.forEach(cell => tr += `<td>${cell}</td>`);
            if (actions) {
                tr += `<td>${actions(row)}</td>`; // Pass raw row data or ID to action generator
            }
            tr += '</tr>';
            return tr;
        }).join('');

        return `
            <div class="card table-container">
                <table>
                    <thead><tr>${thead}${actions ? '<th>Acciones</th>' : ''}</tr></thead>
                    <tbody>${tbody}</tbody>
                </table>
            </div>
        `;
    },

    modal: (title, content) => {
        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay open';
        overlay.innerHTML = `
            <div class="modal">
                <div class="modal-header">
                    <h3>${title}</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-content">${content}</div>
            </div>
        `;

        overlay.querySelector('.close-modal').onclick = () => overlay.remove();
        // Close on click outside
        overlay.onclick = (e) => {
            if (e.target === overlay) overlay.remove();
        }

        document.body.appendChild(overlay);
        return overlay;
    },

    showAlert: (title, message, type = 'info') => {
        let icon = 'info-circle';
        let color = 'var(--primary)';
        if (type === 'success') { icon = 'check-circle'; color = 'var(--success)'; }
        if (type === 'error') { icon = 'exclamation-circle'; color = 'var(--danger)'; }
        if (type === 'warning') { icon = 'exclamation-triangle'; color = '#f59e0b'; }

        const content = `
            <div style="text-align:center; padding:1rem">
                <i class="fas fa-${icon}" style="font-size:3rem; color:${color}; margin-bottom:1rem"></i>
                <p style="font-size:1.1rem; color:var(--text-color); margin-bottom:1.5rem">${message}</p>
                <button class="btn btn-primary" onclick="this.closest('.modal-overlay').remove()">Aceptar</button>
            </div>
        `;
        UI.modal(title, content);
    },

    showConfirm: (title, message) => {
        return new Promise((resolve) => {
            const content = `
                <div style="text-align:center; padding:1rem">
                    <i class="fas fa-question-circle" style="font-size:3rem; color:#f59e0b; margin-bottom:1rem"></i>
                    <p style="font-size:1.1rem; color:var(--text-color); margin-bottom:1.5rem">${message}</p>
                    <div style="display:flex; gap:1rem; justify-content:center">
                        <button class="btn btn-outline" id="confirmCancel">Cancelar</button>
                        <button class="btn btn-danger" id="confirmOk">Confirmar</button>
                    </div>
                </div>
            `;
            const overlay = UI.modal(title, content);
            document.getElementById('confirmOk').onclick = () => {
                overlay.remove();
                resolve(true);
            };
            document.getElementById('confirmCancel').onclick = () => {
                overlay.remove();
                resolve(false);
            };
            // Close button should cancel
            overlay.querySelector('.close-modal').onclick = () => {
                overlay.remove();
                resolve(false);
            };
        });
    },

    // --- Views ---

    renderLogin: () => {
        return `
            <div class="login-container">
                <div class="card login-card">
                    <div style="text-align:center; margin-bottom: 2.5rem;">
                         <h2>Bienvenido</h2>
                         <p>Sistema de Ventas Premium</p>
                    </div>
                    <form id="loginForm">
                        <div class="form-group">
                            <label>Usuario</label>
                            <input type="text" name="username" placeholder="admin" required>
                        </div>
                        <div class="form-group">
                            <label>Contraseña</label>
                            <input type="password" name="password" placeholder="***" required>
                        </div>
                        <button type="submit" class="btn btn-primary" style="width:100%; justify-content:center">
                            Ingresar
                        </button>
                    </form>
                </div>
            </div>
        `;
    },

    renderDashboard: (stats, user) => {
        // Define all possible quick access modules
        const quickAccessModules = [
            { id: 'pos', label: 'Nueva Venta', icon: 'shopping-cart', style: 'btn-primary' },
            { id: 'products', label: 'Inventario', icon: 'boxes', style: 'btn-outline' },
            { id: 'clients', label: 'Clientes', icon: 'users', style: 'btn-outline' },
            { id: 'suppliers', label: 'Suplidores', icon: 'truck', style: 'btn-outline' },
            { id: 'accounts', label: 'Ctas. por Cobrar', icon: 'hand-holding-usd', style: 'btn-outline' },
            { id: 'accountsPayable', label: 'Ctas. por Pagar', icon: 'file-invoice-dollar', style: 'btn-outline' }
        ];

        // Filter modules based on user permissions
        const allowedModules = quickAccessModules.filter(module => {
            if (!user || !user.permissions) return false;
            const perm = user.permissions[module.id];
            return perm === 'read' || perm === 'write';
        });

        // Generate quick access buttons
        const quickAccessButtons = allowedModules.map(module =>
            `<button class="btn ${module.style}" onclick="window.navigate('${module.id}')">
                <i class="fas fa-${module.icon}"></i> ${module.label}
            </button>`
        ).join('');

        return `
            <div class="header">
                <div>
                    <h1 class="page-title">Dashboard</h1>
                    <p style="color:var(--text-muted)">Resumen general del sistema</p>
                </div>
                <div>
                    <span class="badge badge-success">${new Date().toLocaleDateString()}</span>
                </div>
            </div>

            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-icon"><i class="fas fa-dollar-sign"></i></div>
                    <div class="stat-info">
                        <h3>Ventas Hoy</h3>
                        <p>${UI.formatCurrency(stats.salesToday)}</p>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(76, 201, 240, 0.1); color: var(--success)"><i class="fas fa-box"></i></div>
                    <div class="stat-info">
                        <h3>Productos</h3>
                        <p>${stats.productsCount}</p>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(247, 37, 133, 0.1); color: var(--danger)"><i class="fas fa-exclamation-triangle"></i></div>
                    <div class="stat-info">
                        <h3>Bajo Stock</h3>
                        <p>${stats.lowStockCount}</p>
                    </div>
                </div>
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(248, 150, 30, 0.1); color: var(--warning)"><i class="fas fa-chart-line"></i></div>
                    <div class="stat-info">
                        <h3>Ingresos Totales</h3>
                        <p>${UI.formatCurrency(stats.totalRevenue)}</p>
                    </div>
                </div>
            </div>

            ${allowedModules.length > 0 ? `
            <div class="card">
                <h3>Accesos Rápidos</h3>
                <div style="display:flex; gap:1rem; margin-top:1rem; flex-wrap:wrap">
                    ${quickAccessButtons}
                </div>
            </div>
            ` : ''}
            \ : ''}
        \;
    },
    renderDailySummary: (summary, sales, expenses) => {
        const balanceColor = summary.netBalance >= 0 ? 'var(--success)' : 'var(--danger)';
        const balanceIcon = summary.netBalance >= 0 ? 'arrow-up' : 'arrow-down';
        
        return `
            < div class="header" >
                <div>
                    <h1 class="page-title">Resumen Diario</h1>
                    <p style="color:var(--text-muted)">Ventas y gastos del día - ${new Date().toLocaleDateString()}</p>
                </div>
            </div >

            <div class="stats-grid">
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(76, 201, 240, 0.1); color: var(--success)">
                        <i class="fas fa-dollar-sign"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Ventas</h3>
                        <p>${UI.formatCurrency(summary.totalSales)}</p>
                        <span class="badge badge-success" style="font-size:0.8rem">${summary.salesCount} ventas</span>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(247, 37, 133, 0.1); color: var(--danger)">
                        <i class="fas fa-money-bill-wave"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Total Gastos</h3>
                        <p>${UI.formatCurrency(summary.totalExpenses)}</p>
                        <span class="badge badge-danger" style="font-size:0.8rem">${summary.expenseCount} pagos</span>
                    </div>
                </div>
                
                <div class="card stat-card">
                    <div class="stat-icon" style="background:rgba(102, 126, 234, 0.1); color: ${balanceColor}">
                        <i class="fas fa-${balanceIcon}"></i>
                    </div>
                    <div class="stat-info">
                        <h3>Balance Neto</h3>
                        <p style="color:${balanceColor}">${UI.formatCurrency(summary.netBalance)}</p>
                        <span class="badge" style="background:${balanceColor}; color:white; font-size:0.8rem">
                            ${summary.netBalance >= 0 ? 'Positivo' : 'Negativo'}
                        </span>
                    </div>
                </div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:2rem; margin-top:2rem">
                <!-- Sales Table -->
                <div class="card">
                    <h3 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
                        <i class="fas fa-shopping-cart" style="color:var(--success)"></i>
                        Ventas del Día
                    </h3>
                    ${sales.length > 0 ? `
                        <div style="overflow-x:auto">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Cliente</th>
                                        <th>Monto</th>
                                        <th>Método</th>
                                        <th>Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${sales.map(s => `
                                        <tr>
                                            <td>${s.clientname || 'Cliente Genérico'}</td>
                                            <td><strong>${UI.formatCurrency(s.total)}</strong></td>
                                            <td>
                                                <span class="badge ${s.paymentmethod === 'cash' ? 'badge-success' : 'badge-warning'}">
                                                    ${s.paymentmethod === 'cash' ? 'Contado' : 'Crédito'}
                                                </span>
                                            </td>
                                            <td>${new Date(s.date).toLocaleTimeString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align:center; color:var(--text-muted); padding:2rem">No hay ventas registradas hoy</p>'}
                </div>

                <!-- Expenses Table -->
                <div class="card">
                    <h3 style="margin-bottom:1rem; display:flex; align-items:center; gap:0.5rem">
                        <i class="fas fa-receipt" style="color:var(--danger)"></i>
                        Gastos del Día
                    </h3>
                    ${expenses.length > 0 ? `
                        <div style="overflow-x:auto">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Concepto</th>
                                        <th>Beneficiario</th>
                                        <th>Monto</th>
                                        <th>Hora</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${expenses.map(e => `
                                        <tr>
                                            <td>${e.description || 'N/A'}</td>
                                            <td>${e.payee || 'N/A'}</td>
                                            <td><strong>${UI.formatCurrency(e.amount)}</strong></td>
                                            <td>${new Date(e.date).toLocaleTimeString()}</td>
                                        </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    ` : '<p style="text-align:center; color:var(--text-muted); padding:2rem">No hay gastos registrados hoy</p>'}
                </div>
            </div>
`;
    },

    renderProducts: (products) => {
        const tableHtml = `
    < div class="card table-container" >
        <table>
            <thead>
                <tr><th>Código</th><th>Nombre</th><th>Categoría</th><th>Stock</th><th>Costo</th><th>Precio</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${products.map(p => `
                            <tr>
                                <td>${p.code || '<span style="color:#999; font-style:italic">Sin Código</span>'}</td>
                                <td>${p.name}</td>
                                <td>${p.category}</td>
                                <td><span class="badge ${p.stock < 5 ? 'badge-danger' : 'badge-success'}">${p.stock}</span></td>
                                <td>${UI.formatCurrency(p.cost)}</td>
                                <td>${UI.formatCurrency(p.price)}</td>
                                <td>
                                    ${App.can('products', 'write') ? `
                                    <button class="btn btn-sm btn-outline" onclick="window.editProduct(${p.id})"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger)" onclick="window.deleteProduct(${p.id})"><i class="fas fa-trash"></i></button>
                                    ` : '<span style="color:var(--text-muted)">-</span>'}
                                </td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
            </div >
    `;

        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Inventario</h1>
                ${ App.can('products', 'write') ? `<button class="btn btn-primary" id="btn-add-product"><i class="fas fa-plus"></i> Nuevo Producto</button>` : '' }
            </div >
    ${ tableHtml }
`;
    },

    renderCategories: (categories) => {
        return `
    < div class="flex-between mb-4" >
                <h1 class="page-title">Categorías</h1>
                <button class="btn btn-primary" onclick="window.addCategory()"><i class="fas fa-plus"></i> Nueva Categoría</button>
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Nombre</th><th>Descripción</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${categories.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.description || '-'}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="window.editCategory(${c.id})"><i class="fas fa-edit"></i></button>
                                    <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger)" onclick="window.deleteCategory(${c.id})"><i class="fas fa-trash"></i></button>
                                </td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
    </div>
`;
    },

    renderPOS: (products, clients) => {
        return `
    < div class="header" >
        <h1 class="page-title">Punto de Venta</h1>
            </div >
    <div style="display: grid; grid-template-columns: 2fr 1fr; gap: 2rem; height: calc(100vh - 180px);">
        <!-- Left: Product Selection -->
        <div style="display:flex; flex-direction:column; gap:1rem; overflow:hidden">
            <div class="card" style="padding:1rem; margin:0">
                <input type="text" id="pos-search" placeholder="Buscar producto por nombre o código..." autofocus>
            </div>
            <div class="card" style="flex:1; overflow-y:auto; margin:0; padding:0">
                <div class="product-grid" style="display:grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap:1rem; padding:1rem">
                    ${products.map(p => `
                                <div class="product-card" onclick="window.addToCart(${p.id})" style="border:1px solid var(--border); padding:1rem; border-radius:8px; cursor:pointer; text-align:center; transition:var(--transition)">
                                    <div style="font-size:2rem; margin-bottom:0.5rem; color:var(--primary)"><i class="fas fa-box-open"></i></div>
                                    <div style="font-weight:bold; font-size:0.9rem">${p.name}</div>
                                    <div style="color:var(--text-muted); font-size:0.8rem">Stock: ${p.stock}</div>
                                    <div style="color:var(--success); font-weight:bold; margin-top:0.5rem">${UI.formatCurrency(p.price)}</div>
                                </div>
                            `).join('')}
                </div>
            </div>
        </div>

        <!-- Right: Cart -->
        <div class="card" style="display:flex; flex-direction:column; margin:0; height:100%">
            <h3>Ticket de Venta</h3>
            <div style="margin: 1rem 0">
                <select id="pos-client">
                    <option value="">Cliente Genérico</option>
                    ${clients.map(c => `<option value="${c.id}" data-allow-credit="${c.allow_credit ? 'true' : 'false'}" data-default-days="${c.default_credit_days || 0}">${c.name}</option>`).join('')}
                </select>
            </div>

            <div id="pos-cart-items" style="flex:1; overflow-y:auto; border-top:1px solid var(--border); border-bottom:1px solid var(--border); padding:1rem 0;">
                <!-- Cart Items Injected Here -->
                <p style="text-align:center; color:var(--text-muted); margin-top:2rem">Carrito vacío</p>
            </div>

            <div style="padding-top:1rem">
                <div class="flex-between mb-4">
                    <span>Total</span>
                    <span style="font-size:1.5rem; font-weight:bold" id="pos-total">$0.00</span>
                </div>
                <div style="display:grid; grid-template-columns: 1fr 1fr; gap:0.5rem">
                    <button class="btn btn-outline" style="justify-content:center" onclick="window.clearCart()">Cancelar</button>
                    <button class="btn btn-primary" style="justify-content:center" onclick="window.processSale()">Cobrar</button>
                </div>
            </div>
        </div>
    </div>
`;
    },

    renderClients: (clients) => {
        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Clientes</h1>
                ${ App.can('clients', 'write') ? `<button class="btn btn-primary" onclick="window.addClient()"><i class="fas fa-plus"></i> Nuevo Cliente</button>` : '' }
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Nombre</th><th>Teléfono</th><th>Email</th><th>Deuda</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${clients.map(c => `
                            <tr>
                                <td>${c.name}</td>
                                <td>${c.phone}</td>
                                <td>${c.email}</td>
                                <td style="color:${c.debt > 0 ? 'var(--danger)' : 'var(--success)'}">${UI.formatCurrency(c.debt)}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline" onclick="window.editClient(${c.id})" title="Editar"><i class="fas fa-edit"></i></button>
                                </td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
    </div>
`;
    },

    renderAccountsReceivable: (ar, clients) => {
        // Group by Client
        const clientDebt = {};
        ar.forEach(item => {
            if (item.status === 'pending') {
                // Server returns 'clientid' (lowercase), not 'clientId'
                const clientId = item.clientid;
                if (!clientDebt[clientId]) {
                    clientDebt[clientId] = {
                        clientId: clientId,
                        name: clients.find(c => c.id == clientId)?.name || 'Desconocido',
                        totalDebt: 0,
                        count: 0
                    };
                }
                clientDebt[clientId].totalDebt += item.amount;
                clientDebt[clientId].count += 1;
            }
        });

        const rows = Object.values(clientDebt).map(c => `
    < tr >
                <td>${c.name}</td>
                <td style="text-align:center"><span class="badge badge-warning">${c.count} Facturas</span></td>
                <td style="font-weight:bold; color:var(--danger)">${UI.formatCurrency(c.totalDebt)}</td>
                <td>
                     ${App.can('accounts', 'write') ? `
                    <button class="btn btn-sm btn-outline" onclick="window.viewClientDetails(${c.clientId})" title="Ver Facturas">
                        <i class="fas fa-list"></i> Detalle
                    </button>
                    <button class="btn btn-sm btn-primary" onclick="window.registerClientPayment(${c.clientId}, ${c.totalDebt})" title="Abonar">
                        <i class="fas fa-money-bill-wave"></i> Abonar
                    </button>
                    ` : '<span class="badge badge-warning">Sin Permiso</span>'}
                </td>
            </tr >
    `).join('');

        if (rows.length === 0) {
            return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Cuentas por Cobrar</h1>
                </div >
    <div class="card" style="text-align:center; padding:3rem; color:var(--text-muted)">
        <i class="fas fa-check-circle" style="font-size:3rem; margin-bottom:1rem; color:var(--success)"></i>
        <h3>No hay cuentas pendientes</h3>
        <p>Todos los clientes están al día.</p>
    </div>
`;
        }

        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Cuentas por Cobrar</h1>
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Cliente</th><th style="text-align:center">Facturas Pendientes</th><th>Deuda Total</th><th>Acciones</th></tr>
            </thead>
            <tbody>${rows}</tbody>
        </table>
    </div>
`;
    },

    renderClientInvoices: (ar) => {
        // ar is already filtered for this client
        ar.sort((a, b) => new Date(a.date) - new Date(b.date));

        return `
    < table style = "width:100%; border-collapse: collapse;" >
                <thead>
                    <tr style="background:#f8f9fa; border-bottom:2px solid #eee;">
                        <th style="padding:0.5rem; text-align:left">Fecha</th>
                        <th style="padding:0.5rem; text-align:left">Descripción</th>
                        <th style="padding:0.5rem; text-align:right">Monto</th>
                    </tr>
                </thead>
                <tbody>
                    ${ar.map(item => `
                        <tr style="border-bottom:1px solid #eee;">
                            <td style="padding:0.5rem">${item.date.split('T')[0]}</td>
                            <td style="padding:0.5rem">${item.description}</td>
                            <td style="padding:0.5rem">
                                <div style="display:flex; justify-content:flex-end; align-items:center; gap:0.5rem">
                                    <span style="font-weight:bold">${UI.formatCurrency(item.amount)}</span>
                                    <button class="btn btn-sm btn-outline" onclick="window.viewReceivableHistory(${item.id})" title="Ver Abonos" style="padding:0.2rem 0.5rem">
                                        <i class="fas fa-history"></i>
                                    </button>
                                </div>
                            </td>
                        </tr>
                    `).join('')}
                    <tr style="background:#f8f9fa;">
                        <td colspan="2" style="padding:0.5rem; text-align:right; font-weight:bold">Total:</td>
                        <td style="padding:0.5rem; text-align:right; font-weight:bold; color:var(--danger)">
                            ${UI.formatCurrency(ar.reduce((sum, i) => sum + i.amount, 0))}
                        </td>
                    </tr>
                </tbody>
            </table >
    <div style="margin-top:1rem; font-size:0.8rem; color:#666; font-style:italic">
        * Los abonos se aplicarán automáticamente a la factura más antigua.
    </div>
`;
    },

    renderSuppliers: (suppliers) => {
        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Suplidores</h1>
                ${ App.can('suppliers', 'write') ? `<button class="btn btn-primary" onclick="window.addSupplier()"><i class="fas fa-plus"></i> Nuevo Suplidor</button>` : '' }
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${suppliers.map(s => `
                            <tr>
                                <td>${s.name}</td>
                                <td>${s.contact}</td>
                                <td>${s.phone}</td>
                                <td>${s.email}</td>
                                <td>
                                    <button class="btn btn-sm btn-outline"><i class="fas fa-edit"></i></button>
                                </td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
    </div>
`;
    },

    renderAccountsPayable: (ap, suppliers) => {
        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Cuentas por Pagar</h1>
                ${ App.can('accountsPayable', 'write') ? `<button class="btn btn-primary" onclick="window.addPayable()"><i class="fas fa-file-invoice"></i> Nueva Factura</button>` : '' }
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Suplidor</th><th>Descripción</th><th>Fecha</th><th>Monto Inicial</th><th>Pendiente</th><th>Estado</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${ap.map(item => {
                    const supplierName = item.supplierId
                        ? (suppliers.find(s => s.id == item.supplierId)?.name || 'Desc.')
                        : (item.payee || 'Gasto Menor');
                    const isPending = item.status === 'pending';

                    return `
                                <tr>
                                    <td>${supplierName}</td>
                                    <td>${item.description}</td>
                                    <td>${item.date.split('T')[0]}</td>
                                    <td>${UI.formatCurrency(item.initialAmount || item.amount)}</td>
                                    <td style="font-weight:bold">${UI.formatCurrency(item.amount)}</td>
                                    <td><span class="badge ${isPending ? 'badge-warning' : 'badge-success'}">${item.status === 'pending' ? 'Pendiente' : 'Pagado'}</span></td>
                                    <td>
                                        ${isPending && App.can('accountsPayable', 'write') ?
                            `<button class="btn btn-sm btn-primary" onclick="window.paySupplier(${item.id}, ${item.amount})" title="Pagar">
                                                <i class="fas fa-money-bill-wave"></i>
                                            </button>` :
                            (isPending ? '<span class="badge badge-warning">Sin Permiso</span>' : '<span style="color:var(--success)"><i class="fas fa-check"></i></span>')
                        }
                                        <button class="btn btn-sm btn-outline" onclick="window.viewPayableHistory(${item.id})" title="Ver Historial">
                                             <i class="fas fa-history"></i>
                                        </button>
                                    </td>
                                </tr>
                            `;
                }).join('')}
            </tbody>
        </table>
    </div>
`;
    },

    renderUsers: (users) => {
        return `
    < div class="flex-between mb-4" >
        <h1 class="page-title">Usuarios del Sistema</h1>
                ${ App.can('users', 'write') ? `<button class="btn btn-primary" onclick="window.addUser()"><i class="fas fa-user-plus"></i> Nuevo Usuario</button>` : '' }
            </div >
    <div class="card table-container">
        <table>
            <thead>
                <tr><th>Nombre</th><th>Usuario</th><th>Rol</th><th>Acciones</th></tr>
            </thead>
            <tbody>
                ${users.map(u => `
                            <tr>
                                <td>${u.name}</td>
                                <td>${u.username}</td>
                                <td>
                                    <span class="badge ${u.role === 'admin' ? 'badge-primary' : 'badge-success'}">
                                        ${u.role}
                                    </span>
                                </td>
                                <td>
                                    ${u.username !== 'admin' && App.can('users', 'write') ?
                        `<button class="btn btn-sm btn-outline" onclick="window.editUser(${u.id})"><i class="fas fa-edit"></i></button>
                 <button class="btn btn-sm btn-outline" style="color:var(--danger); border-color:var(--danger)" onclick="window.deleteUser(${u.id})"><i class="fas fa-trash"></i></button>`
                        : ''}
                                </td>
                            </tr>
                        `).join('')}
            </tbody>
        </table>
    </div>
`;
    }
};
