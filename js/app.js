// --- Global State ---
let cart = [];

// --- App Initialization ---
const App = {
    init: async () => {
        await App.checkAuth();
        window.navigate = App.navigate;

        // Handle Back/Forward Browser Buttons
        window.addEventListener('popstate', () => {
            const path = window.location.pathname.substring(1);
            App.navigate(path || 'dashboard', false); // false = don't push state again
        });

        // POS Globals
        window.addToCart = App.posAddToCart;
        window.clearCart = App.posClearCart;
        window.processSale = App.posProcessSale;
        window.addToCart = App.posAddToCart;
        window.clearCart = App.posClearCart;
        window.processSale = App.posProcessSale;
        window.editProduct = (id) => alert('Editar producto: ' + id + ' (Demo)');

        // Expose new helpers globally
        window.App = App; // To access App.updateQty from HTML inline events

        window.deleteProduct = async (id) => {
            if (!App.can('products', 'write')) return UI.showAlert('Sin Permisos', 'No tiene permisos para eliminar.', 'warning');
            if (await UI.showConfirm('Confirmar Eliminación', '¿Seguro de eliminar?')) {
                await Store.deleteProduct(id);
                App.navigate('products');
            }
        };

        window.viewClientDetails = async (clientId) => {
            const ar = await Store.getAccountsReceivable();
            // Server returns 'clientid' (lowercase), not 'clientId'
            const clientAr = ar.filter(a => a.clientid == clientId && a.status === 'pending');
            // We need client name? 
            // In pure UI renderClientInvoices receives just the list.
            // But we might want to title the modal.
            const clients = await Store.getClients();
            const client = clients.find(c => c.id == clientId);

            if (!client) return;
            const content = UI.renderClientInvoices(clientAr); // Changed to pass AR list directly
            UI.modal(`Facturas de ${client.name}`, content);
        };

        window.registerClientPayment = async (clientId, currentTotalDebt) => {
            if (!App.can('accounts', 'write')) return UI.showAlert('Sin Permisos', 'No tiene permisos para registrar pagos.', 'warning');

            const clients = await Store.getClients();
            const numericClientId = parseInt(clientId);
            const client = clients.find(c => c.id === numericClientId);

            if (!client) {
                console.error('Client not found. ClientId:', clientId, 'Numeric:', numericClientId, 'Clients:', clients);
                return UI.showAlert('Error', 'Cliente no encontrado', 'error');
            }

            const modalContent = `
                <form id="paymentForm">
                    <p style="margin-bottom:1rem">Cliente: <strong>${client.name}</strong></p>
                    <p style="margin-bottom:1rem">Deuda Total: <strong style="color:var(--danger)">${UI.formatCurrency(currentTotalDebt)}</strong></p>
                    <div class="form-group">
                        <label>Monto a Abonar</label>
                        <input type="number" name="amount" value="${currentTotalDebt}" max="${currentTotalDebt}" min="0.01" step="0.01" required>
                    </div>
                    <div style="font-size:0.8rem; color:#666; margin-bottom:1rem">
                        El pago se aplicará automáticamente a las facturas más antiguas.
                    </div>
                    <button class="btn btn-primary" style="width:100%">Registrar Pago</button>
                </form>
            `;
            const overlay = UI.modal('Registrar Abono', modalContent);
            document.getElementById('paymentForm').onsubmit = async (e) => {
                e.preventDefault();
                const amount = parseFloat(e.target.amount.value);
                if (amount > currentTotalDebt) {
                    UI.showAlert('Error', 'El monto no puede ser mayor a la deuda total', 'error');
                    return;
                }

                if (await Store.processClientPayment(clientId, amount)) {
                    UI.showAlert('Pago Exitoso', 'Pago registrado correctamente', 'success');
                    overlay.remove();
                    App.navigate('accounts');
                } else {
                    UI.showAlert('Error', 'Error al registrar pago', 'error');
                }
            };
        };

        window.addClient = () => {
            const currentUser = Store.getCurrentUser();
            const isAdmin = currentUser && currentUser.role && currentUser.role.toLowerCase().includes('admin');

            const modalContent = `
                <form id="addClientForm">
                    <div class="form-group"><label>Nombre</label><input name="name" required></div>
                    <div class="form-group"><label>Email</label><input name="email" required></div>
                    <div class="form-group"><label>Teléfono</label><input name="phone" required></div>
                    <div class="form-group"><label>Dirección</label><input name="address" required></div>
                    
                    ${isAdmin ? `
                    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:0.75rem 1rem; border-radius:8px; margin:1rem 0; color:white;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                            <i class="fas fa-shield-alt"></i>
                            <strong>Configuración de Crédito (Solo Administradores)</strong>
                        </div>
                        <p style="margin:0; font-size:0.85rem; opacity:0.9;">Solo usuarios con rol de Administrador pueden configurar crédito</p>
                    </div>
                    
                    <div class="form-group"><label>Límite de Crédito</label><input type="number" name="creditLimit" value="0"></div>
                    
                    <div style="background:rgba(0,0,0,0.02); padding:1rem; border-radius:8px; margin-bottom:1rem">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem">
                            <input type="checkbox" id="allowCredit" name="allowCredit" checked style="width:auto; margin:0">
                            <label for="allowCredit" style="margin:0">Permitir Ventas a Crédito</label>
                        </div>
                        <div id="creditDaysContainer" class="form-group" style="margin-left:1.5rem">
                            <label>Días de Crédito por Defecto</label>
                            <input type="number" name="creditDays" value="30">
                        </div>
                    </div>
                    ` : `
                    <input type="hidden" name="creditLimit" value="0">
                    <input type="hidden" name="allowCredit" value="">
                    <input type="hidden" name="creditDays" value="0">
                    
                    <div style="background:#fff3cd; border-left:4px solid #ffc107; padding:0.75rem; border-radius:4px; margin:1rem 0;">
                        <div style="display:flex; align-items:center; gap:0.5rem; color:#856404;">
                            <i class="fas fa-info-circle"></i>
                            <strong>Configuración de Crédito Restringida</strong>
                        </div>
                        <p style="margin:0.5rem 0 0 0; font-size:0.9rem; color:#856404;">
                            Solo los administradores pueden configurar límites de crédito y ventas a crédito para clientes.
                        </p>
                    </div>
                    `}

                    <button class="btn btn-primary" style="width:100%">Guardar Cliente</button>
                </form>
            `;
            const overlay = UI.modal('Nuevo Cliente', modalContent);

            // Toggle days input visibility (only if admin)
            if (isAdmin) {
                const check = overlay.querySelector('#allowCredit');
                const container = overlay.querySelector('#creditDaysContainer');
                if (check && container) {
                    check.onchange = () => {
                        container.style.display = check.checked ? 'block' : 'none';
                        if (!check.checked) overlay.querySelector('[name=creditDays]').value = 0;
                    };
                }
            }

            document.getElementById('addClientForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.addClient({
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        address: formData.get('address'),
                        creditLimit: parseFloat(formData.get('creditLimit')) || 0,
                        allowCredit: formData.get('allowCredit') === 'on',
                        creditDays: parseInt(formData.get('creditDays')) || 0
                    });
                    overlay.remove();
                    App.navigate('clients');
                } catch (err) { UI.showAlert('Error', 'Error al guardar cliente: ' + err.message, 'error'); }
            };
        };

        window.editClient = async (id) => {
            const clients = await Store.getClients();
            const client = clients.find(c => c.id === id);
            if (!client) return UI.showAlert('Error', 'Cliente no encontrado', 'error');

            const currentUser = Store.getCurrentUser();
            const isAdmin = currentUser && currentUser.role && currentUser.role.toLowerCase().includes('admin');

            const modalContent = `
                <form id="editClientForm">
                    <div class="form-group"><label>Nombre</label><input name="name" value="${client.name}" required></div>
                    <div class="form-group"><label>Email</label><input name="email" value="${client.email || ''}" required></div>
                    <div class="form-group"><label>Teléfono</label><input name="phone" value="${client.phone || ''}" required></div>
                    <div class="form-group"><label>Dirección</label><input name="address" value="${client.address || ''}" required></div>
                    
                    ${isAdmin ? `
                    <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:0.75rem 1rem; border-radius:8px; margin:1rem 0; color:white;">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem;">
                            <i class="fas fa-shield-alt"></i>
                            <strong>Configuración de Crédito (Solo Administradores)</strong>
                        </div>
                        <p style="margin:0; font-size:0.85rem; opacity:0.9;">Solo usuarios con rol de Administrador pueden configurar crédito</p>
                    </div>
                    
                    <div class="form-group"><label>Límite de Crédito</label><input type="number" name="creditLimit" value="${client.creditlimit || 0}"></div>
                    
                    <div style="background:rgba(0,0,0,0.02); padding:1rem; border-radius:8px; margin-bottom:1rem">
                        <div style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.5rem">
                            <input type="checkbox" id="allowCredit" name="allowCredit" ${client.allow_credit ? 'checked' : ''} style="width:auto; margin:0">
                            <label for="allowCredit" style="margin:0">Permitir Ventas a Crédito</label>
                        </div>
                        <div id="creditDaysContainer" class="form-group" style="margin-left:1.5rem; display:${client.allow_credit ? 'block' : 'none'}">
                            <label>Días de Crédito por Defecto</label>
                            <input type="number" name="creditDays" value="${client.default_credit_days || 30}">
                        </div>
                    </div>
                    ` : `
                    <input type="hidden" name="creditLimit" value="${client.creditlimit || 0}">
                    <input type="hidden" name="allowCredit" value="${client.allow_credit ? 'on' : ''}">
                    <input type="hidden" name="creditDays" value="${client.default_credit_days || 0}">
                    
                    <div style="background:#e3f2fd; border-left:4px solid #2196f3; padding:0.75rem; border-radius:4px; margin:1rem 0;">
                        <div style="display:flex; align-items:center; gap:0.5rem; color:#1565c0;">
                            <i class="fas fa-info-circle"></i>
                            <strong>Información de Crédito</strong>
                        </div>
                        <p style="margin:0.5rem 0 0 0; font-size:0.9rem; color:#1565c0;">
                            Límite: <strong>${UI.formatCurrency(client.creditlimit || 0)}</strong> | 
                            Crédito: <strong>${client.allow_credit ? 'Permitido' : 'No Permitido'}</strong> | 
                            Días: <strong>${client.default_credit_days || 0}</strong>
                        </p>
                        <p style="margin:0.5rem 0 0 0; font-size:0.85rem; color:#1565c0; font-style:italic;">
                            Solo administradores pueden modificar esta configuración.
                        </p>
                    </div>
                    `}

                    <button class="btn btn-primary" style="width:100%">Actualizar Cliente</button>
                </form>
            `;
            const overlay = UI.modal('Editar Cliente', modalContent);

            if (isAdmin) {
                const check = overlay.querySelector('#allowCredit');
                const container = overlay.querySelector('#creditDaysContainer');
                if (check && container) {
                    check.onchange = () => {
                        container.style.display = check.checked ? 'block' : 'none';
                    };
                }
            }

            document.getElementById('editClientForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.updateClient({
                        id: client.id,
                        name: formData.get('name'),
                        email: formData.get('email'),
                        phone: formData.get('phone'),
                        address: formData.get('address'),
                        creditLimit: parseFloat(formData.get('creditLimit')) || 0,
                        allowCredit: formData.get('allowCredit') === 'on',
                        creditDays: parseInt(formData.get('creditDays')) || 0
                    });
                    overlay.remove();
                    App.navigate('clients');
                } catch (err) { UI.showAlert('Error', 'Error al actualizar cliente: ' + err.message, 'error'); }
            };
        };

        window.deleteUser = async (id) => {
            if (await UI.showConfirm('Eliminar Usuario', 'Se eliminará este usuario. ¿Continuar?')) {
                try {
                    await Store.deleteUser(id);
                    App.navigate('users');
                } catch (err) { UI.showAlert('Error', err.message, 'error'); }
            }
        };

        // --- Products & Categories ---

        window.addProduct = async () => {
            const categories = await Store.getCategories();
            const modalContent = `
                <form id="addProductForm">
                    <div class="form-group"><label>Código</label><input name="code" required></div>
                    <div class="form-group"><label>Nombre</label><input name="name" required></div>
                    <div class="form-group"><label>Stock</label><input type="number" name="stock" value="0" required></div>
                    <div class="form-group"><label>Costo</label><input type="number" name="cost" value="0" required></div>
                    <div class="form-group"><label>Precio</label><input type="number" name="price" value="0" required></div>
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="category" required style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:4px">
                            <option value="">Seleccione...</option>
                            ${categories.map(c => `<option value="${c.name}">${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <button class="btn btn-primary" style="width:100%">Guardar</button>
                </form>
             `;
            const overlay = UI.modal('Nuevo Producto', modalContent);
            document.getElementById('addProductForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.addProduct({
                        code: formData.get('code'),
                        name: formData.get('name'),
                        stock: parseInt(formData.get('stock')),
                        cost: parseFloat(formData.get('cost')),
                        price: parseFloat(formData.get('price')),
                        category: formData.get('category')
                    });
                    overlay.remove();
                    App.navigate('products');
                } catch (err) { UI.showAlert('Error', 'Error al agregar producto: ' + err.message, 'error'); }
            };
        };

        window.editProduct = async (id) => {
            const products = await Store.getProducts();
            const categories = await Store.getCategories();
            const product = products.find(p => p.id === id);
            if (!product) return UI.showAlert('Error', 'Producto no encontrado', 'error');

            const modalContent = `
                <form id="editProductForm">
                    <div class="form-group"><label>Código</label><input name="code" value="${product.code || ''}" required></div>
                    <div class="form-group"><label>Nombre</label><input name="name" value="${product.name}" required></div>
                    <div class="form-group">
                        <label>Categoría</label>
                        <select name="category" required style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:4px">
                            <option value="">Seleccione...</option>
                            ${categories.map(c => `<option value="${c.name}" ${c.name === product.category ? 'selected' : ''}>${c.name}</option>`).join('')}
                        </select>
                    </div>
                    <div class="form-group"><label>Stock</label><input type="number" name="stock" value="${product.stock}" required></div>
                    <div class="form-group"><label>Costo</label><input type="number" name="cost" step="0.01" value="${product.cost}" required></div>
                    <div class="form-group"><label>Precio</label><input type="number" name="price" step="0.01" value="${product.price}" required></div>
                    <button class="btn btn-primary" style="width:100%">Actualizar Producto</button>
                </form>
            `;
            const overlay = UI.modal('Editar Producto', modalContent);
            document.getElementById('editProductForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.updateProduct({
                        id: product.id,
                        code: formData.get('code'),
                        name: formData.get('name'),
                        category: formData.get('category'),
                        stock: parseInt(formData.get('stock')),
                        cost: parseFloat(formData.get('cost')),
                        price: parseFloat(formData.get('price'))
                    });
                    overlay.remove();
                    App.navigate('products');
                } catch (err) { UI.showAlert('Error', err.message, 'error'); }
            };
        };

        window.addCategory = () => {
            const modalContent = `
                <form id="addCategoryForm">
                    <div class="form-group"><label>Nombre</label><input name="name" required></div>
                    <div class="form-group"><label>Descripción</label><input name="description"></div>
                    <button class="btn btn-primary" style="width:100%">Guardar Categoría</button>
                </form>
            `;
            const overlay = UI.modal('Nueva Categoría', modalContent);
            document.getElementById('addCategoryForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.addCategory({
                        name: formData.get('name'),
                        description: formData.get('description')
                    });
                    overlay.remove();
                    App.navigate('categories');
                } catch (err) { UI.showAlert('Error', err.message, 'error'); }
            };
        };

        window.editCategory = async (id) => {
            const categories = await Store.getCategories();
            const category = categories.find(c => c.id === id);
            if (!category) return;

            const modalContent = `
                <form id="editCategoryForm">
                    <div class="form-group"><label>Nombre</label><input name="name" value="${category.name}" required></div>
                    <div class="form-group"><label>Descripción</label><input name="description" value="${category.description || ''}"></div>
                    <button class="btn btn-primary" style="width:100%">Actualizar Categoría</button>
                </form>
            `;
            const overlay = UI.modal('Editar Categoría', modalContent);
            document.getElementById('editCategoryForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.updateCategory({
                        id: category.id,
                        name: formData.get('name'),
                        description: formData.get('description')
                    });
                    overlay.remove();
                    App.navigate('categories');
                } catch (err) { UI.showAlert('Error', err.message, 'error'); }
            };
        };

        window.deleteCategory = async (id) => {
            if (await UI.showConfirm('Eliminar Categoría', '¿Eliminar categoría? Los productos asociados mantendrán el nombre de la categoría pero podrían quedar desvinculados.')) {
                try {
                    await Store.deleteCategory(id);
                    App.navigate('categories');
                } catch (e) { UI.showAlert('Error', e.message, 'error'); }
            }
        };

        window.addPayable = async () => {
            console.log('Opening addPayable v2');
            const suppliers = await Store.getSuppliers();
            const modalContent = `
                <form id="addPayableForm">
                    <div style="margin-bottom:1rem; display:flex; gap:1rem; align-items:center">
                         <label><input type="radio" name="type" value="invoice" checked onchange="togglePayableType()"> Factura Suplidor</label>
                         <label><input type="radio" name="type" value="expense" onchange="togglePayableType()"> Gasto Menor</label>
                    </div>

                    <div id="field-supplier" class="form-group">
                        <label>Suplidor</label>
                        <select name="supplierId" style="width:100%; padding:0.5rem; border:1px solid var(--border); border-radius:4px">
                            ${suppliers.map(s => `<option value="${s.id}">${s.name}</option>`).join('')}
                        </select>
                    </div>

                    <div id="field-payee" class="form-group" style="display:none">
                        <label>Comercio / Persona</label>
                        <input name="payee" placeholder="Ej. Supermercado, Colmado...">
                    </div>

                    <div class="form-group"><label>Descripción</label><input name="description" required></div>
                    <div class="form-group"><label>Monto</label><input type="number" step="0.01" name="amount" required></div>
                    <div class="form-group"><label>Fecha</label><input type="date" name="date" required value="${new Date().toISOString().split('T')[0]}"></div>
                    
                    <button class="btn btn-primary" style="width:100%">Registrar</button>
                </form>
                <script>
                    function togglePayableType() {
                        const type = document.querySelector('input[name="type"]:checked').value;
                        document.getElementById('field-supplier').style.display = type === 'invoice' ? 'block' : 'none';
                        document.getElementById('field-payee').style.display = type === 'expense' ? 'block' : 'none';
                    }
                </script>
            `;
            const overlay = UI.modal('Nueva Cuenta / Gasto', modalContent);

            // Re-bind script function because innerHTML execution quirks
            window.togglePayableType = () => {
                const type = document.querySelector('input[name="type"]:checked').value;
                document.getElementById('field-supplier').style.display = type === 'invoice' ? 'block' : 'none';
                document.getElementById('field-payee').style.display = type === 'expense' ? 'block' : 'none';
            };

            document.getElementById('addPayableForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    // Determine values based on type
                    const type = formData.get('type');
                    const data = {
                        type: type,
                        description: formData.get('description'),
                        amount: parseFloat(formData.get('amount')),
                        date: formData.get('date'),
                        supplierId: type === 'invoice' ? formData.get('supplierId') : null,
                        payee: type === 'expense' ? formData.get('payee') : null
                    };

                    await Store.request('accounts-payable', 'POST', data);
                    overlay.remove();
                    App.navigate('accounts-payable');
                } catch (err) { UI.showAlert('Error', err.message, 'error'); }
            };
        };

        window.deleteProduct = async (id) => {
            if (await UI.showConfirm('Eliminar Producto', '¿Seguro que desea eliminar este producto?')) {
                try {
                    await Store.deleteProduct(id);
                    App.navigate('products');
                } catch (e) { UI.showAlert('Error', e.message, 'error'); }
            }
        };

        window.addSupplier = () => {
            const modalContent = `
                <form id="addSupplierForm">
                    <div class="form-group"><label>Empresa</label><input name="name" required></div>
                    <div class="form-group"><label>Contacto</label><input name="contact" required></div>
                    <div class="form-group"><label>Email</label><input name="email" required></div>
                    <div class="form-group"><label>Teléfono</label><input name="phone" required></div>
                    <button class="btn btn-primary" style="width:100%">Guardar Suplidor</button>
                </form>
            `;
            const overlay = UI.modal('Nuevo Suplidor', modalContent);
            document.getElementById('addSupplierForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);
                    await Store.addSupplier({
                        name: formData.get('name'),
                        contact: formData.get('contact'),
                        email: formData.get('email'),
                        phone: formData.get('phone')
                    });
                    overlay.remove();
                    App.navigate('suppliers');
                } catch (err) { UI.showAlert('Error', 'Error al guardar suplidor: ' + err.message, 'error'); }
            };
        };

        window.viewPayableHistory = async (id) => {
            try {
                const history = await Store.getPayableHistory(id);
                if (history.length === 0) return UI.showAlert('Historial Vacío', 'No hay historial de pagos para esta cuenta.', 'info');

                const list = history.map(h => `
                    <li style="display:flex; justify-content:space-between; padding:0.5rem; border-bottom:1px solid #eee">
                        <span>${h.date.split('T')[0]}</span>
                        <span style="font-weight:bold; color:var(--success)">${UI.formatCurrency(h.amount)}</span>
                    </li>
                `).join('');

                UI.modal('Historial de Pagos', `<ul style="list-style:none; padding:0">${list}</ul>`);
            } catch (e) { UI.showAlert('Error', e.message, 'error'); }
        };

        window.viewReceivableHistory = async (id) => {
            try {
                const history = await Store.getReceivableHistory(id);
                if (history.length === 0) return UI.showAlert('Historial Vacío', 'No hay abonos registrados para esta factura.', 'info');
                const list = history.map(h => `
                    <li style="display:flex; justify-content:space-between; padding:0.5rem; border-bottom:1px solid #eee">
                        <span>${h.date.split('T')[0]}</span>
                        <span style="font-weight:bold; color:var(--success)">${UI.formatCurrency(h.amount)}</span>
                    </li>
                `).join('');
                UI.modal('Historial de Abonos', `<ul style="list-style:none; padding:0">${list}</ul>`);
            } catch (e) { UI.showAlert('Error', e.message, 'error'); }
        };

        window.paySupplier = (id, currentAmount) => {
            const modalContent = `
                <form id="paySupplierForm">
                    <p style="margin-bottom:1rem">Monto Pendiente: <strong>${UI.formatCurrency(currentAmount)}</strong></p>
                    <div class="form-group"><label>Monto a Pagar</label><input type="number" name="amount" value="${currentAmount}" max="${currentAmount}" min="0.01" step="0.01" required></div>
                    <button class="btn btn-primary" style="width:100%">Registrar Pago</button>
                </form>
            `;
            const overlay = UI.modal('Pagar a Suplidor', modalContent);
            document.getElementById('paySupplierForm').onsubmit = async (e) => {
                e.preventDefault();
                const amount = parseFloat(e.target.amount.value);
                if (await Store.processSupplierPayment(id, amount)) {
                    UI.showAlert('Pago Exitoso', 'Pago registrado correctamente', 'success');
                    overlay.remove();
                    App.navigate('accounts-payable');
                } else {
                    UI.showAlert('Error', 'Error o monto inválido', 'error');
                }
            };
        };

        window.addUser = () => {
            const checks = [
                { id: 'pos', label: 'Punto de Venta', icon: 'cash-register' },
                { id: 'products', label: 'Inventario', icon: 'boxes' },
                { id: 'clients', label: 'Clientes', icon: 'users' },
                { id: 'suppliers', label: 'Suplidores', icon: 'truck' },
                { id: 'accounts', label: 'Cuentas por Cobrar', icon: 'hand-holding-usd' },
                { id: 'accountsPayable', label: 'Cuentas por Pagar', icon: 'file-invoice-dollar' },
                { id: 'users', label: 'Gestión Usuarios', icon: 'user-shield' }
            ];

            const modalContent = `
                <form id="addUserForm">
                    <div style="display:grid; gap:0.75rem;">
                        <!-- Basic Info Section -->
                        <div style="background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding:1rem 1.5rem; border-radius:8px; color:white; margin:-2rem -2rem 0 -2rem;">
                            <h3 style="margin:0 0 0.25rem 0; font-size:1.1rem;">
                                <i class="fas fa-user-plus"></i> Información Básica
                            </h3>
                            <p style="margin:0; opacity:0.9; font-size:0.85rem;">Complete los datos del nuevo usuario</p>
                        </div>

                        <div style="display:grid; gap:0.75rem;">
                            <div class="form-group" style="margin:0">
                                <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; font-weight:500; font-size:0.9rem;">
                                    <i class="fas fa-user" style="color:var(--primary)"></i>
                                    Nombre Completo
                                </label>
                                <input name="name" placeholder="Ej. Juan Pérez" required style="width:100%">
                            </div>

                            <div style="display:grid; grid-template-columns:1fr 1fr; gap:0.75rem;">
                                <div class="form-group" style="margin:0">
                                    <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; font-weight:500; font-size:0.9rem;">
                                        <i class="fas fa-at" style="color:var(--primary)"></i>
                                        Usuario
                                    </label>
                                    <input name="username" placeholder="usuario123" required style="width:100%">
                                </div>
                                
                                <div class="form-group" style="margin:0">
                                    <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; font-weight:500; font-size:0.9rem;">
                                        <i class="fas fa-lock" style="color:var(--primary)"></i>
                                        Contraseña
                                    </label>
                                    <input name="password" type="password" placeholder="••••••••" required style="width:100%">
                                </div>
                            </div>

                            <div class="form-group" style="margin:0">
                                <label style="display:flex; align-items:center; gap:0.5rem; margin-bottom:0.4rem; font-weight:500; font-size:0.9rem;">
                                    <i class="fas fa-tag" style="color:var(--primary)"></i>
                                    Rol / Cargo
                                </label>
                                <input name="role" placeholder="Ej. Vendedor, Gerente, Cajero" required style="width:100%">
                            </div>
                        </div>
                        
                        <!-- Permissions Section -->
                        <div style="background:#f8f9fa; padding:0.75rem; border-radius:8px; border-left:4px solid var(--primary);">
                            <h4 style="margin:0 0 0.5rem 0; font-size:0.95rem; display:flex; align-items:center; gap:0.5rem;">
                                <i class="fas fa-shield-alt" style="color:var(--primary)"></i>
                                Permisos de Acceso
                            </h4>
                            <p style="margin:0 0 0.75rem 0; font-size:0.8rem; color:#666;">Defina los niveles de acceso para cada módulo</p>
                            
                            <div style="display:grid; gap:0.5rem; max-height:200px; overflow-y:auto; padding-right:0.5rem;">
                                ${checks.map(m => `
                                    <div style="background:white; padding:0.6rem; border-radius:6px; border:1px solid #e0e0e0; display:flex; align-items:center; justify-content:space-between; transition:all 0.2s;" onmouseover="this.style.borderColor='var(--primary)'; this.style.boxShadow='0 2px 8px rgba(102,126,234,0.1)'" onmouseout="this.style.borderColor='#e0e0e0'; this.style.boxShadow='none'">
                                        <div style="display:flex; align-items:center; gap:0.6rem;">
                                            <div style="width:28px; height:28px; background:linear-gradient(135deg, #667eea 0%, #764ba2 100%); border-radius:6px; display:flex; align-items:center; justify-content:center; color:white;">
                                                <i class="fas fa-${m.icon}" style="font-size:0.8rem;"></i>
                                            </div>
                                            <span style="font-weight:500; color:#333; font-size:0.9rem;">${m.label}</span>
                                        </div>
                                        <select name="perm_${m.id}" style="padding:0.3rem 0.6rem; border-radius:6px; border:2px solid #e0e0e0; font-size:0.85rem; cursor:pointer; background:white; min-width:130px;" onchange="this.style.borderColor = this.value === 'write' ? 'var(--success)' : this.value === 'read' ? 'var(--warning)' : '#e0e0e0'">
                                            <option value="none">🚫 Sin Acceso</option>
                                            <option value="read">👁️ Solo Ver</option>
                                            <option value="write">✅ Control Total</option>
                                        </select>
                                    </div>
                                `).join('')}
                            </div>
                        </div>

                        <button class="btn btn-primary" type="submit" style="width:100%; padding:0.65rem; font-size:0.95rem; display:flex; align-items:center; justify-content:center; gap:0.5rem; margin-top:0.5rem;">
                            <i class="fas fa-user-plus"></i>
                            Crear Usuario
                        </button>
                    </div>
                </form>
            `;
            const overlay = UI.modal('Nuevo Usuario', modalContent);
            document.getElementById('addUserForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);

                    const permissions = {};
                    checks.forEach(m => {
                        permissions[m.id] = formData.get(`perm_${m.id}`);
                    });

                    await Store.addUser({
                        name: formData.get('name'),
                        username: formData.get('username'),
                        password: formData.get('password'),
                        role: formData.get('role'),
                        permissions: permissions
                    });
                    overlay.remove();
                    App.navigate('users');
                } catch (err) { UI.showAlert('Error', 'Error al crear usuario: ' + err.message, 'error'); }
            };
        };

        window.deleteUser = async (id) => {
            if (!App.can('users', 'write')) return UI.showAlert('Sin Permisos', 'No tiene permisos para eliminar usuarios.', 'warning');
            if (await UI.showConfirm('Eliminar Usuario', '¿Seguro de eliminar este usuario?')) {
                await Store.deleteUser(id);
                App.navigate('users');
            }
        };

        window.editUser = async (id) => {
            if (!App.can('users', 'write')) return UI.showAlert('Sin Permisos', 'No tiene permisos para editar usuarios.', 'warning');
            const users = await Store.getUsers();
            const user = users.find(u => u.id === id);
            if (!user) return UI.showAlert('Error', 'Usuario no encontrado', 'error');

            const checks = [
                { id: 'pos', label: 'Punto de Venta' },
                { id: 'products', label: 'Inventario' },
                { id: 'clients', label: 'Clientes' },
                { id: 'suppliers', label: 'Suplidores' },
                { id: 'accounts', label: 'Cuentas por Cobrar' },
                { id: 'accountsPayable', label: 'Cuentas por Pagar' },
                { id: 'users', label: 'Gestión Usuarios' }
            ];

            const modalContent = `
                <form id="editUserForm">
                    <div class="form-group"><label>Nombre Completo</label><input name="name" value="${user.name}" required></div>
                    <div class="form-group"><label>Nombre de Usuario</label><input name="username" value="${user.username}" required></div>
                    <div class="form-group"><label>Contraseña</label><input name="password" type="password" value="${user.password}" required></div>
                    <div class="form-group">
                        <label>Rol (Etiqueta)</label>
                        <input name="role" value="${user.role}" required>
                    </div>
                    
                    <div style="margin-top:1rem; border-top:1px solid var(--border); padding-top:1rem">
                        <p style="margin-bottom:0.5rem; font-weight:bold">Permisos de Acceso</p>
                        <div style="display:grid; grid-template-columns: 1fr; gap:0.5rem; max-height: 200px; overflow-y:auto">
                            ${checks.map(m => {
                const currentPerm = user.permissions[m.id] || 'none';
                return `
                                <div style="display:flex; align-items:center; justify-content:space-between; background:rgba(0,0,0,0.02); padding:0.5rem; border-radius:4px">
                                    <span>${m.label}</span>
                                    <select name="perm_${m.id}" style="padding:0.2rem; border-radius:4px; border:1px solid var(--border)">
                                        <option value="none" ${currentPerm === 'none' ? 'selected' : ''}>Sin Acceso</option>
                                        <option value="read" ${currentPerm === 'read' ? 'selected' : ''}>Solo Ver</option>
                                        <option value="write" ${currentPerm === 'write' ? 'selected' : ''}>Control Total</option>
                                    </select>
                                </div>
                            `}).join('')}
                        </div>
                    </div>

                    <button class="btn btn-primary" style="width:100%; margin-top:1rem">Guardar Cambios</button>
                </form>
            `;
            const overlay = UI.modal('Editar Usuario', modalContent);
            document.getElementById('editUserForm').onsubmit = async (e) => {
                e.preventDefault();
                try {
                    const formData = new FormData(e.target);

                    const permissions = {};
                    checks.forEach(m => {
                        permissions[m.id] = formData.get(`perm_${m.id}`);
                    });

                    await Store.updateUser({
                        id: user.id, // Keep original ID
                        name: formData.get('name'),
                        username: formData.get('username'),
                        password: formData.get('password'),
                        role: formData.get('role'),
                        permissions: permissions
                    });
                    overlay.remove();
                    App.navigate('users');
                } catch (err) { UI.showAlert('Error', 'Error al actualizar usuario: ' + err.message, 'error'); }
            };
        };

        // Auth Globals
        window.logout = () => {
            Store.logout();
            window.location.reload();
        };
    },

    checkAuth: async () => {
        const user = Store.getCurrentUser();
        if (!user) {
            document.body.innerHTML = UI.renderLogin();
            // Bind Login Form
            document.getElementById('loginForm').addEventListener('submit', async (e) => {
                e.preventDefault();
                const u = e.target.username.value;
                const p = e.target.password.value;
                if (await Store.login(u, p)) {
                    window.location.reload();
                } else {
                    UI.showAlert('Error', 'Credenciales incorrectas', 'error');
                }
            });
        } else {
            // Render basic layout
            App.renderLayout(user);

            // Restore last view or default to dashboard
            const lastView = localStorage.getItem('last_view') || 'dashboard';
            App.navigate(lastView);
        }
    },

    renderLayout: (user) => {
        document.body.innerHTML = `
            <div id="app">
                <nav class="sidebar">
                    <div class="brand">
                        <i class="fas fa-cube"></i>
                        <span>PosDevSoft</span>
                    </div>
                    <ul class="nav-links">
                        <li class="nav-item"><a class="nav-link" data-view="dashboard" onclick="window.navigate('dashboard')"><i class="fas fa-home"></i> Inicio</a></li>
                        <li class="nav-item"><a class="nav-link" data-view="daily-summary" onclick="window.navigate('daily-summary')"><i class="fas fa-chart-pie"></i> Resumen Diario</a></li>
                        ${App.can('pos', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="pos" onclick="window.navigate('pos')"><i class="fas fa-cash-register"></i> Punto de Venta</a></li>` : ''}
                        ${App.can('products', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="products" onclick="window.navigate('products')"><i class="fas fa-boxes"></i> Inventario</a></li>` : ''}
                        ${App.can('products', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="categories" onclick="window.navigate('categories')"><i class="fas fa-tags"></i> Categorías</a></li>` : ''}
                        ${App.can('clients', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="clients" onclick="window.navigate('clients')"><i class="fas fa-users"></i> Clientes</a></li>` : ''}
                        ${App.can('suppliers', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="suppliers" onclick="window.navigate('suppliers')"><i class="fas fa-truck"></i> Suplidores</a></li>` : ''}
                        ${App.can('accounts', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="accounts" onclick="window.navigate('accounts')"><i class="fas fa-hand-holding-usd"></i> C. por Cobrar</a></li>` : ''}
                        ${App.can('accountsPayable', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="accounts-payable" onclick="window.navigate('accounts-payable')"><i class="fas fa-file-invoice-dollar"></i> C. por Pagar</a></li>` : ''}
                        ${App.can('users', 'read') ? `<li class="nav-item"><a class="nav-link" data-view="users" onclick="window.navigate('users')"><i class="fas fa-user-shield"></i> Usuarios</a></li>` : ''}
                    </ul>
                    <div class="user-profile">
                        <div class="user-avatar">${user.username[0].toUpperCase()}</div>
                        <div>
                            <div style="font-weight:bold">${user.name}</div>
                            <div style="font-size:0.8rem; color: #a0aec0; cursor:pointer" onclick="window.logout()">Cerrar Sesión</div>
                        </div>
                    </div>
                </nav>
                <main class="main-content" id="main">
                    <!-- Dynamic View -->
                </main>
            </div>
        `;
    },

    can: (module, level = 'read') => {
        const user = Store.getCurrentUser();
        if (!user || !user.permissions) return false;
        const p = user.permissions[module];
        if (level === 'read') return p === 'read' || p === 'write';
        if (level === 'write') return p === 'write';
        return false;
    },

    navigate: async (view, pushState = true) => {
        const main = document.getElementById('main');

        // Permission Check
        const mapping = {
            'dashboard': null, // public
            'products': 'products',
            'pos': 'pos',
            'clients': 'clients',
            'suppliers': 'suppliers',
            'accounts': 'accounts',
            'accounts-payable': 'accountsPayable',
            'users': 'users'
        };

        if (mapping[view] && !App.can(mapping[view], 'read')) {
            main.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--text-muted)"><h1>Acceso Denegado</h1><p>No tiene permisos para ver este módulo.</p></div>`;
            return;
        }

        // Persist View
        localStorage.setItem('last_view', view);

        // Update URL
        if (pushState) {
            history.pushState(null, '', '/' + view);
        }

        // Highlight Sidebar
        document.querySelectorAll('.nav-link').forEach(l => {
            l.classList.remove('active');
            if (l.dataset.view === view) l.classList.add('active');
        });

        // Loading State
        main.innerHTML = '<div style="padding:2rem; text-align:center">Cargando...</div>';

        try {
            switch (view) {
                case 'dashboard':
                    const stats = await Store.getStats();
                    const currentUser = Store.getCurrentUser();
                    main.innerHTML = UI.renderDashboard(stats, currentUser);
                    break;
                case 'daily-summary':
                    const summary = await Store.getDailySummary();
                    const daySales = await Store.getTodaySales();
                    const dayExpenses = await Store.getTodayExpenses();
                    main.innerHTML = UI.renderDailySummary(summary, daySales, dayExpenses);
                    break;
                case 'products':
                    const products = await Store.getProducts();
                    main.innerHTML = UI.renderProducts(products);

                    // Bind Add Button
                    const addBtn = document.getElementById('btn-add-product');
                    if (addBtn) addBtn.onclick = window.addProduct;
                    break;
                case 'categories':
                    const categories = await Store.getCategories();
                    main.innerHTML = UI.renderCategories(categories);
                    break;
                case 'pos':
                    cart = []; // Reset cart ??
                    const posProducts = await Store.getProducts();
                    const posClients = await Store.getClients();
                    main.innerHTML = UI.renderPOS(posProducts, posClients);
                    App.setupPOSSearch(posProducts);
                    App.updateCartUI();
                    break;
                case 'clients':
                    const clients = await Store.getClients();
                    main.innerHTML = UI.renderClients(clients);
                    break;
                case 'accounts':
                    const ar = await Store.getAccountsReceivable();
                    const arClients = await Store.getClients();
                    main.innerHTML = UI.renderAccountsReceivable(ar, arClients);
                    break;
                case 'suppliers':
                    const suppliers = await Store.getSuppliers();
                    main.innerHTML = UI.renderSuppliers(suppliers);
                    break;
                case 'accounts-payable':
                    const ap = await Store.getAccountsPayable();
                    const apSuppliers = await Store.getSuppliers();
                    main.innerHTML = UI.renderAccountsPayable(ap, apSuppliers);
                    break;
                case 'users':
                    const users = await Store.getUsers();
                    main.innerHTML = UI.renderUsers(users);
                    break;
                default:
                    App.navigate('dashboard');
            }
        } catch (e) {
            console.error(e);
            main.innerHTML = `<div style="padding:2rem; text-align:center; color:var(--danger)"><h1>Error</h1><p>${e.message}</p></div>`;
        }
    },

    // --- POS Logic ---
    setupPOSSearch: (products) => {
        const searchInput = document.getElementById('pos-search');
        const resultsContainer = document.getElementById('search-results');

        if (searchInput && resultsContainer) {
            // Hide on click outside
            document.addEventListener('click', (e) => {
                if (!searchInput.contains(e.target) && !resultsContainer.contains(e.target)) {
                    resultsContainer.style.display = 'none';
                }
            });

            searchInput.onkeyup = (e) => {
                const term = e.target.value.toLowerCase();

                if (term.length < 1) {
                    resultsContainer.style.display = 'none';
                    return;
                }

                const filtered = products.filter(p =>
                    p.name.toLowerCase().includes(term) || (p.code && p.code.toLowerCase().includes(term))
                );

                if (filtered.length > 0) {
                    resultsContainer.innerHTML = filtered.map(p => `
                        <div class="search-result-item" onclick="window.addToCart(${p.id})">
                            <div>
                                <div style="font-weight:bold">${p.name}</div>
                                <div style="font-size:0.8rem; color:var(--text-muted)">${p.code || 'Sin Código'} | Stock: ${p.stock}</div>
                            </div>
                            <div style="color:var(--primary); font-weight:bold">${UI.formatCurrency(p.price)}</div>
                        </div>
                    `).join('');
                    resultsContainer.style.display = 'block';
                } else {
                    resultsContainer.style.display = 'none';
                }

                // Direct enter support if exact match or single result
                if (e.key === 'Enter' && filtered.length > 0) {
                    window.addToCart(filtered[0].id);
                    resultsContainer.style.display = 'none';
                    searchInput.value = '';
                }
            };
        }
    },

    posAddToCart: async (id) => {
        // Need to refetch product to check current stock or trust the list passed?
        // Trust list for speed, but ideally verify.
        // Let's just blindly use the data we have for now, but really we should refetch product info.
        // Since we don't have the product list cached globally in App, we need to fetch it or finding it from DOM?
        // Let's fetch the single product to be safe.
        // Actually we don't have getProduct(id) yet.
        // Let's fetch all products and find. Not efficient but safe.
        const products = await Store.getProducts();
        const product = products.find(p => p.id === id);

        if (!product || product.stock <= 0) {
            UI.showAlert('Error', 'Producto sin stock o no encontrado', 'warning');
            return;
        }

        const existing = cart.find(item => item.productId === id);
        if (existing) {
            if (existing.qty < product.stock) {
                existing.qty++;
            } else {
                UI.showAlert('Sin Stock', 'No hay más stock disponible', 'warning');
            }
        } else {
            cart.push({ productId: id, name: product.name, price: product.price, qty: 1, max: product.stock });
        }

        // Clear search
        const s = document.getElementById('pos-search');
        const r = document.getElementById('search-results');
        if (s) { s.value = ''; s.focus(); }
        if (r) r.style.display = 'none';

        App.updateCartUI();
    },

    updateCartUI: () => {
        const container = document.getElementById('pos-cart-items');
        if (!container) return; // Not in POS view

        if (cart.length === 0) {
            container.innerHTML = `
                <tr>
                    <td colspan="5" style="text-align:center; padding:3rem; color:var(--text-muted)">
                        <i class="fas fa-barcode" style="font-size:2rem; margin-bottom:1rem; opacity:0.5"></i><br>
                        Use el buscador para agregar productos
                    </td>
                </tr>`;
            document.getElementById('pos-total').textContent = '$0.00';
            if (document.getElementById('pos-subtotal')) document.getElementById('pos-subtotal').textContent = '$0.00';
            return;
        }

        container.innerHTML = cart.map((item, index) => `
            <tr>
                <td>
                    <div style="font-weight:bold">${item.name}</div>
                </td>
                <td style="text-align:center">
                    <input type="number" 
                           value="${item.qty}" 
                           min="1" 
                           max="${item.max}"
                           onchange="App.updateQty(${index}, this.value)"
                           style="width:60px; padding:0.3rem; border:1px solid var(--border); border-radius:4px; text-align:center">
                </td>
                <td style="text-align:right">${UI.formatCurrency(item.price)}</td>
                <td style="text-align:right; font-weight:bold">${UI.formatCurrency(item.qty * item.price)}</td>
                <td style="text-align:center">
                    <button class="btn" onclick="App.removeItem(${index})" style="color:var(--danger); background:transparent; padding:0.2rem">
                        <i class="fas fa-times"></i>
                    </button>
                </td>
            </tr>
        `).join('');

        const total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);
        document.getElementById('pos-total').textContent = UI.formatCurrency(total);
        if (document.getElementById('pos-subtotal')) document.getElementById('pos-subtotal').textContent = UI.formatCurrency(total);
    },

    updateQty: (index, newQty) => {
        const qty = parseInt(newQty);
        if (qty > 0 && qty <= cart[index].max) {
            cart[index].qty = qty;
        } else {
            UI.showAlert('Error', 'Cantidad inválida o sin stock suficiente', 'warning');
            // Fuerza re-render para resetear el input
        }
        App.updateCartUI();
    },

    removeItem: (index) => {
        cart.splice(index, 1);
        App.updateCartUI();
    },

    posClearCart: () => {
        cart = [];
        App.updateCartUI();
    },

    posProcessSale: () => {
        if (cart.length === 0) return UI.showAlert('Carrito Vacío', 'Agregue productos antes de procesar la venta', 'info');

        const clientSelect = document.getElementById('pos-client');
        const selectedOption = clientSelect.options[clientSelect.selectedIndex];
        const clientId = clientSelect.value || null;

        // --- Logic: Define variables BEFORE usage ---
        let allowCredit = false;
        let defaultDays = 30;

        if (!clientId) {
            // Generic client (Presentación General) - Credit Blocked
            allowCredit = false;
        } else {
            // Specific client - Read from data attributes
            // Note: dataset properties are always strings.
            const rawAllow = selectedOption.dataset.allowCredit;
            // logic: if it's explicitly 'false' (string) then false, otherwise true (default)
            allowCredit = rawAllow !== 'false';

            const rawDays = selectedOption.dataset.defaultDays;
            defaultDays = rawDays ? parseInt(rawDays) : 30;
        }

        const total = cart.reduce((sum, item) => sum + (item.qty * item.price), 0);

        const creditBtnStyle = allowCredit
            ? 'background:var(--primary)'
            : 'background:var(--text-muted); cursor:not-allowed; opacity:0.6';

        const rejectReason = clientId
            ? "Este cliente tiene bloqueado el crédito"
            : "Seleccione un cliente para vender a crédito";

        // Modal Content
        const content = `
            <div style="text-align:center">
                <p style="margin-bottom:1.5rem; font-size:1.1rem">Total a pagar: <strong>${UI.formatCurrency(total)}</strong></p>
                
                <div style="text-align:left; margin-bottom:1rem; background:rgba(0,0,0,0.05); padding:1rem; border-radius:8px; opacity: ${allowCredit ? 1 : 0.5}">
                    <label style="font-size:0.9rem">Días de Crédito (Solo para Venta a Crédito)</label>
                    <input type="number" id="credit-days" value="${defaultDays}" min="1" style="margin-top:0.5rem" ${allowCredit ? '' : 'disabled'}>
                </div>

                <p style="margin-bottom:1rem; color:var(--text-muted)">Seleccione el método de pago:</p>
                <div style="display:flex; gap:1rem; justify-content:center">
                    <button id="btn-pay-cash" class="btn btn-primary" style="background:var(--success); border:none">
                        <i class="fas fa-money-bill-wave"></i> Al Contado
                    </button>
                    <button id="btn-pay-credit" class="btn btn-primary" style="${creditBtnStyle}" ${allowCredit ? '' : 'disabled'} title="${allowCredit ? '' : rejectReason}">
                        <i class="fas fa-credit-card"></i> A Crédito
                    </button>
                </div>
                ${!allowCredit ? `<p style="color:var(--danger); font-size:0.8rem; margin-top:1rem"><i class="fas fa-ban"></i> ${rejectReason}</p>` : ''}
            </div>
        `;

        const overlay = UI.modal('Confirmar Venta', content);

        const finalizeSale = async (method) => {
            const creditDays = document.getElementById('credit-days').value;
            try {
                await Store.createSale({
                    items: cart,
                    clientId: clientId,
                    total: total,
                    paymentMethod: method,
                    creditDays: creditDays
                });
                const message = method === 'credit' ? `Crédito ${creditDays} días` : 'Contado';
                UI.showAlert('Venta Exitosa', `Venta procesada con éxito (${message})`, 'success');
                cart = [];
                overlay.remove();
                App.navigate('pos');
            } catch (e) {
                UI.showAlert('Error', 'Error al procesar venta: ' + e.message, 'error');
            }
        };

        const btnCash = overlay.querySelector('#btn-pay-cash');
        const btnCredit = overlay.querySelector('#btn-pay-credit');

        if (btnCash) btnCash.onclick = () => finalizeSale('cash');

        if (btnCredit && !btnCredit.disabled) btnCredit.onclick = () => {
            finalizeSale('credit');
        };
    }
};

// Start
document.addEventListener('DOMContentLoaded', App.init);
