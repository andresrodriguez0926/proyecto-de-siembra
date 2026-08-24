// --- FIREBASE CONFIG ---
const firebaseConfig = {
  apiKey: "AIzaSyD-tmKkLAKSwrQz0eLJ-DHzJfefQLhC27E",
  authDomain: "proyecto-de-siembra-606d9.firebaseapp.com",
  projectId: "proyecto-de-siembra-606d9",
  storageBucket: "proyecto-de-siembra-606d9.firebasestorage.app",
  messagingSenderId: "302125478245",
  appId: "1:302125478245:web:b9476eed78a10d749db18c",
  measurementId: "G-2J2KK7F31W"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();
const auth = firebase.auth();

let currentUser = null;

// --- DATABASE WAPPER (Memory + Firestore) ---
const memoryDB = {
    productos: [], campos: [], unidades: [], germinador: [], siembras: [], registrosCosecha: []
};

const DB = {
    get: (key) => memoryDB[key] || [],
    add: (key, item) => {
        item.autorId = currentUser ? currentUser.uid : 'anon';
        item.autorEmail = currentUser ? currentUser.email : 'Anónimo';
        item.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        db.collection(key).add(item);
    },
    update: (key, id, updates) => {
        db.collection(key).doc(id).update(updates);
    },
    remove: (key, id) => {
        db.collection(key).doc(id).delete();
    }
};

// Start Firestore Listeners
function startListeners() {
    const collections = Object.keys(memoryDB);
    collections.forEach(col => {
        db.collection(col).onSnapshot(snapshot => {
            const data = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() });
            });
            memoryDB[col] = data;
            
            // Re-render current view if data changes
            const activeView = document.querySelector('.view.active');
            if (activeView && activeView.id !== 'view-login') {
                renderView(activeView.id);
            }
        });
    });
}

// --- NAVIGATION LOGIC ---
document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        // Update active class on buttons
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const clickedBtn = e.currentTarget;
        clickedBtn.classList.add('active');

        // Update Title
        document.getElementById('page-title').textContent = clickedBtn.getAttribute('data-title');

        // Update active view
        const targetId = clickedBtn.getAttribute('data-target');
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById(targetId).classList.add('active');

        // Render view content
        renderView(targetId);
    });
});

// --- RENDER ROUTER ---
function renderView(viewId) {
    if (viewId === 'view-configuracion') renderConfiguracion();
    if (viewId === 'view-germinador') renderGerminador();
    if (viewId === 'view-siembra') renderSiembra();
    if (viewId === 'view-cosecha') renderCosecha();
    if (viewId === 'view-dashboard') renderDashboard();
    if (viewId === 'view-alertas') renderAlertas();
}

// ==========================================
// FILTROS GLOBALES
// ==========================================
let viewFilters = { germinador: 'ALL', siembra: 'ALL', cosecha: 'ALL' };
let viewFiltersAlertas = 'ALL';
window.setFiltroAlertas = function(val) { viewFiltersAlertas = val; renderAlertas(); };

window.setFilter = function(view, value) {
    viewFilters[view] = value;
    renderView('view-' + view);
};

window.printReport = function(type) {
    if (type === 'gantt') {
        document.body.classList.add('print-gantt');
        window.print();
        document.body.classList.remove('print-gantt');
    } else if (type === 'proyecciones') {
        document.body.classList.add('print-proyecciones');
        window.print();
        document.body.classList.remove('print-proyecciones');
    }
}

// ==========================================
// CONFIGURACIÓN VIEW
// ==========================================
let editingId = { productos: null, campos: null, unidades: null };

function renderConfiguracion() {
    const container = document.getElementById('configuracion-container');
    container.innerHTML = `
        <!-- Formulario Usuarios (Firebase Auth) -->
        <div class="card">
            <h3>Registrar Empleado / Usuario</h3>
            <p style="font-size:0.85rem; color:var(--text-muted); margin-bottom:12px;">Crea una cuenta para que tus empleados ingresen. <strong>Atención:</strong> Al registrar uno nuevo, Firebase iniciará su sesión automáticamente (tendrás que cerrar tu sesión e ingresar con la tuya de nuevo).</p>
            <form id="form-usuario">
                <div class="form-row">
                    <div class="form-group">
                        <label>Correo Electrónico (inventado o real)</label>
                        <input type="email" id="user-email" placeholder="ej. juan@mifinca.com" required>
                    </div>
                    <div class="form-group">
                        <label>Contraseña (mínimo 6 caracteres)</label>
                        <input type="password" id="user-pass" required>
                    </div>
                </div>
                <button type="submit" class="btn-primary" style="background-color:#1565c0;">Registrar Usuario en Firebase</button>
                <p id="user-msg" style="margin-top:8px; font-size:0.85rem; font-weight:bold;"></p>
            </form>
        </div>

        <div class="card">
            <h3>Productos (Cultivos)</h3>
            <form id="form-producto">
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" id="prod-name" required>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Días Germinación</label>
                        <input type="number" id="prod-gdays" required>
                    </div>
                    <div class="form-group">
                        <label>Días Cosecha</label>
                        <input type="number" id="prod-hdays" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Frecuencia de Germinación (días)</label>
                        <input type="number" id="prod-freqdays" placeholder="Ej. 15" required>
                    </div>
                    <div class="form-group">
                        <label>Rendimiento por planta</label>
                        <input type="number" step="0.01" id="prod-yield" placeholder="Ej. 2.5" required>
                    </div>
                </div>
                <button type="submit" id="btn-submit-producto" class="btn-primary">Agregar Producto</button>
            </form>
            <div id="list-productos" style="margin-top:16px;"></div>
        </div>

        <div class="card">
            <h3>Campos</h3>
            <form id="form-campo">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre del Campo</label>
                        <input type="text" id="campo-name" required>
                    </div>
                    <div class="form-group">
                        <label>Área / Tamaño (opcional)</label>
                        <input type="text" id="campo-area">
                    </div>
                </div>
                <button type="submit" id="btn-submit-campo" class="btn-primary">Agregar Campo</button>
            </form>
            <div id="list-campos" style="margin-top:16px;"></div>
        </div>

        <div class="card">
            <h3>Unidades de Medida</h3>
            <form id="form-unidad">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nombre (ej. Libra)</label>
                        <input type="text" id="unidad-name" required>
                    </div>
                    <div class="form-group">
                        <label>Abrev. (ej. lb)</label>
                        <input type="text" id="unidad-abrev">
                    </div>
                </div>
                <div class="form-group">
                    <label>Equivalencia / Capacidad (ej. 20 para 1 canasta = 20 lb/ud)</label>
                    <input type="number" step="0.01" id="unidad-capacidad" placeholder="Opcional. Por defecto es 1">
                </div>
                <button type="submit" id="btn-submit-unidad" class="btn-primary">Agregar Unidad</button>
            </form>
            <div id="list-unidades" style="margin-top:16px;"></div>
        </div>
    `;

    // Event Listeners for Config Forms
    document.getElementById('form-usuario').addEventListener('submit', (e) => {
        e.preventDefault();
        const email = document.getElementById('user-email').value;
        const pass = document.getElementById('user-pass').value;
        const msg = document.getElementById('user-msg');
        
        auth.createUserWithEmailAndPassword(email, pass)
            .then((cred) => {
                msg.style.color = "green";
                msg.textContent = "Usuario creado exitosamente: " + cred.user.email;
                e.target.reset();
            })
            .catch(error => {
                msg.style.color = "red";
                msg.textContent = "Error: " + error.message;
            });
    });

    document.getElementById('form-producto').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            nombre: document.getElementById('prod-name').value,
            diasGerminacion: parseInt(document.getElementById('prod-gdays').value),
            diasCosecha: parseInt(document.getElementById('prod-hdays').value),
            frecuenciaGerminacion: parseInt(document.getElementById('prod-freqdays').value) || 0,
            rendimientoPorPlanta: parseFloat(document.getElementById('prod-yield').value) || 1
        };
        
        if (editingId.productos) {
            DB.update('productos', editingId.productos, payload);
            editingId.productos = null;
            document.getElementById('btn-submit-producto').textContent = "Agregar Producto";
        } else {
            DB.add('productos', payload);
        }
        
        e.target.reset();
        renderConfigLists();
    });

    document.getElementById('form-campo').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = { 
            nombre: document.getElementById('campo-name').value,
            area: document.getElementById('campo-area').value
        };
        
        if (editingId.campos) {
            DB.update('campos', editingId.campos, payload);
            editingId.campos = null;
            document.getElementById('btn-submit-campo').textContent = "Agregar Campo";
        } else {
            DB.add('campos', payload);
        }
        
        e.target.reset();
        renderConfigLists();
    });

    document.getElementById('form-unidad').addEventListener('submit', (e) => {
        e.preventDefault();
        const payload = {
            nombre: document.getElementById('unidad-name').value,
            abrev: document.getElementById('unidad-abrev').value,
            capacidad: document.getElementById('unidad-capacidad').value || 1
        };
        
        if (editingId.unidades) {
            DB.update('unidades', editingId.unidades, payload);
            editingId.unidades = null;
            document.getElementById('btn-submit-unidad').textContent = "Agregar Unidad";
        } else {
            DB.add('unidades', payload);
        }
        
        e.target.reset();
        renderConfigLists();
    });

    renderConfigLists();
}

window.editItem = function(type, id) {
    const item = DB.get(type).find(i => i.id === id);
    if (!item) return;
    
    if (type === 'productos') {
        document.getElementById('prod-name').value = item.nombre;
        document.getElementById('prod-gdays').value = item.diasGerminacion;
        document.getElementById('prod-hdays').value = item.diasCosecha;
        document.getElementById('prod-freqdays').value = item.frecuenciaGerminacion || 0;
        document.getElementById('prod-yield').value = item.rendimientoPorPlanta || 1;
        editingId.productos = id;
        document.getElementById('btn-submit-producto').textContent = "Actualizar Producto";
        document.getElementById('form-producto').scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'campos') {
        document.getElementById('campo-name').value = item.nombre;
        document.getElementById('campo-area').value = item.area || '';
        editingId.campos = id;
        document.getElementById('btn-submit-campo').textContent = "Actualizar Campo";
        document.getElementById('form-campo').scrollIntoView({ behavior: 'smooth' });
    } else if (type === 'unidades') {
        document.getElementById('unidad-name').value = item.nombre;
        document.getElementById('unidad-abrev').value = item.abrev || '';
        document.getElementById('unidad-capacidad').value = item.capacidad || '';
        editingId.unidades = id;
        document.getElementById('btn-submit-unidad').textContent = "Actualizar Unidad";
        document.getElementById('form-unidad').scrollIntoView({ behavior: 'smooth' });
    }
}

function renderConfigLists() {
    const listProds = document.getElementById('list-productos');
    listProds.innerHTML = DB.get('productos').map(p => `
        <div class="list-item">
            <div class="list-info">
                <p class="list-title">${p.nombre}</p>
                <p class="list-subtitle">Germina: ${p.diasGerminacion}d | Cosecha: ${p.diasCosecha}d | Freq: ${p.frecuenciaGerminacion || 0}d | Rend: ${p.rendimientoPorPlanta || 1}</p>
            </div>
            <div>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="editItem('productos', '${p.id}')">✏️</button>
                <button class="btn-danger" onclick="deleteItem('productos', '${p.id}')">X</button>
            </div>
        </div>
    `).join('');

    const listCampos = document.getElementById('list-campos');
    listCampos.innerHTML = DB.get('campos').map(c => `
        <div class="list-item">
            <div class="list-info">
                <p class="list-title">${c.nombre}</p>
                ${c.area ? `<p class="list-subtitle">Área: ${c.area}</p>` : ''}
            </div>
            <div>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="editItem('campos', '${c.id}')">✏️</button>
                <button class="btn-danger" onclick="deleteItem('campos', '${c.id}')">X</button>
            </div>
        </div>
    `).join('');

    const listUnidades = document.getElementById('list-unidades');
    listUnidades.innerHTML = DB.get('unidades').map(u => `
        <div class="list-item">
            <div class="list-info">
                <p class="list-title">${u.nombre} (${u.abrev || '-'})</p>
                ${u.capacidad && u.capacidad != 1 ? `<p class="list-subtitle">Equivalencia: ${u.capacidad}</p>` : ''}
            </div>
            <div>
                <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; margin-right:4px;" onclick="editItem('unidades', '${u.id}')">✏️</button>
                <button class="btn-danger" onclick="deleteItem('unidades', '${u.id}')">X</button>
            </div>
        </div>
    `).join('');
}

function deleteItem(key, id) {
    if(confirm('¿Seguro que deseas eliminar esto?')) {
        DB.remove(key, id);
        renderView('view-configuracion'); // reload view
    }
}

// ==========================================
// GERMINADOR VIEW
// ==========================================
function renderGerminador() {
    const productos = DB.get('productos');
    let lotes = DB.get('germinador').filter(l => l.estado !== 'FINALIZADO' && l.estado !== 'SEMBRADO');
    
    if (viewFilters.germinador !== 'ALL') {
        lotes = lotes.filter(l => l.productoId === viewFilters.germinador);
    }
    
    const selectOptions = '<option value="ALL">Todos los productos</option>' + 
                          productos.map(p => `<option value="${p.id}" ${viewFilters.germinador === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');

    const formProdOptions = productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');

    const container = document.getElementById('germinador-container');
    container.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <label style="font-weight:bold; color:var(--primary-dark); font-size:0.9rem;">Filtro de visualización</label>
            <select onchange="setFilter('germinador', this.value)" style="margin-top:4px;">
                ${selectOptions}
            </select>
        </div>

        <div class="card">
            <h3>Nueva Germinación</h3>
            <form id="form-germinador">
                <div class="form-group">
                    <label>Producto</label>
                    <select id="germ-prod" required>
                        <option value="">Seleccione...</option>
                        ${formProdOptions}
                    </select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Cant. Semillas</label>
                        <input type="number" id="germ-qty" required>
                    </div>
                    <div class="form-group">
                        <label>Fecha Inicio</label>
                        <input type="date" id="germ-date" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <button type="submit" class="btn-primary">Iniciar Germinación</button>
            </form>
        </div>
        <div id="list-germinador">
            ${lotes.map(l => {
                const prod = productos.find(p => p.id === l.productoId) || {nombre: 'Desconocido'};
                const disponibles = l.cantidad - (l.sembradas || 0);
                
                const today = new Date();
                today.setHours(0,0,0,0);
                const fSalida = new Date(l.fechaSalida);
                fSalida.setHours(0,0,0,0);
                
                const diffTime = today.getTime() - fSalida.getTime();
                const diasRetraso = Math.floor(diffTime / (1000 * 3600 * 24));
                const retrasado = (l.estado === 'EN_GERMINACION' || l.estado === 'LISTO') && diasRetraso > 0;

                return `
                <div class="card" ${retrasado ? 'style="border: 2px solid #d32f2f;"' : ''}>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong>${prod.nombre}</strong>
                        <span class="badge ${l.estado === 'EN_GERMINACION' ? 'badge-warning' : 'badge-success'}">${l.estado.replace('_', ' ')}</span>
                    </div>
                    <p class="list-subtitle">Inicio: ${l.fechaInicio}</p>
                    <p class="list-subtitle">Semillas iniciales: ${l.cantidad}</p>
                    <p class="list-subtitle">Registrado por: <strong>${l.autorEmail || 'Anónimo'}</strong></p>
                    ${l.estado === 'LISTO' ? `<p class="list-subtitle" style="color:var(--primary-color); font-weight:bold;">Disponibles para siembra: ${disponibles}</p>` : ''}
                    <p class="list-subtitle">Salida estimada: <strong>${l.fechaSalida}</strong></p>
                    
                    ${retrasado ? `<div style="background-color: #ffebee; color: #c62828; padding: 8px; border-radius: 4px; margin-top: 12px; font-size: 0.9rem; font-weight: bold; text-align: center; border: 1px solid #ef9a9a;">¡RETRASO DE ${diasRetraso} DÍA(S) SIN SEMBRAR!</div>` : ''}

                    ${l.estado === 'EN_GERMINACION' ? `<button class="btn-primary" style="padding:8px; margin-top:8px; font-size:0.9rem;" onclick="marcarListo('${l.id}')">Marcar como Listo</button>` : ''}
                </div>
                `;
            }).join('') || '<p style="text-align:center; color:#757575;">No hay lotes activos</p>'}
        </div>
    `;

    document.getElementById('form-germinador').addEventListener('submit', (e) => {
        e.preventDefault();
        const prodId = document.getElementById('germ-prod').value;
        const prod = productos.find(p => p.id === prodId);
        
        let fechaObj = new Date(document.getElementById('germ-date').value);
        fechaObj.setDate(fechaObj.getDate() + prod.diasGerminacion);
        let fechaSalida = fechaObj.toISOString().split('T')[0];

        DB.add('germinador', {
            productoId: prodId,
            cantidad: parseInt(document.getElementById('germ-qty').value),
            fechaInicio: document.getElementById('germ-date').value,
            fechaSalida: fechaSalida,
            estado: 'EN_GERMINACION' // EN_GERMINACION, LISTO, SEMBRADO
        });
        renderGerminador();
    });
}

window.marcarListo = function(id) {
    DB.update('germinador', id, { estado: 'LISTO' });
    renderGerminador();
}

// ==========================================
// SIEMBRA VIEW
// ==========================================
function renderSiembra() {
    const productos = DB.get('productos');
    const campos = DB.get('campos');
    let siembras = DB.get('siembras').filter(s => s.estado !== 'FINALIZADA');

    if (viewFilters.siembra !== 'ALL') {
        siembras = siembras.filter(s => {
            const lote = DB.get('germinador').find(l => l.id === s.loteId);
            return lote && lote.productoId === viewFilters.siembra;
        });
    }

    const selectOptions = '<option value="ALL">Todos los productos</option>' + 
                          productos.map(p => `<option value="${p.id}" ${viewFilters.siembra === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');

    // Active ready batches for new planting form
    const lotesListos = DB.get('germinador').filter(l => l.estado === 'LISTO' && (l.cantidad - (l.sembradas || 0) > 0));
    const lotesOptions = lotesListos.map(l => {
        const p = productos.find(x => x.id === l.productoId) || {nombre: ''};
        return `<option value="${l.id}">${p.nombre} (Disp: ${l.cantidad - (l.sembradas || 0)})</option>`;
    }).join('');

    const camposOptions = campos.map(c => `<option value="${c.id}">${c.nombre}</option>`).join('');

    const container = document.getElementById('siembra-container');
    container.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <label style="font-weight:bold; color:var(--primary-dark); font-size:0.9rem;">Filtro de visualización</label>
            <select onchange="setFilter('siembra', this.value)" style="margin-top:4px;">
                ${selectOptions}
            </select>
        </div>

        <div class="card">
            <h3>Nueva Siembra (Trasplante)</h3>
            <form id="form-siembra">
                <div class="form-group">
                    <label>Lote Listo</label>
                    <select id="siem-lote" required><option value="">Seleccione...</option>${lotesOptions}</select>
                </div>
                <div class="form-group">
                    <label>Campo Destino</label>
                    <select id="siem-campo" required><option value="">Seleccione...</option>${camposOptions}</select>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Plantas Sembradas</label>
                        <input type="number" id="siem-qty" required>
                    </div>
                    <div class="form-group">
                        <label>Fecha Siembra</label>
                        <input type="date" id="siem-date" required value="${new Date().toISOString().split('T')[0]}">
                    </div>
                </div>
                <button type="submit" class="btn-primary">Registrar Siembra</button>
            </form>
        </div>
        <div id="list-siembras">
            ${siembras.map(s => {
                const lote = DB.get('germinador').find(l => l.id === s.loteId) || {};
                const prod = productos.find(p => p.id === lote.productoId) || {nombre: 'Desc'};
                const campo = campos.find(c => c.id === s.campoId) || {nombre: 'Desc'};
                
                const today = new Date();
                today.setHours(0,0,0,0);
                
                const fSiembra = new Date(s.fechaSiembra);
                // Fix timezone offset for accurate day count
                fSiembra.setMinutes(fSiembra.getMinutes() + fSiembra.getTimezoneOffset());
                fSiembra.setHours(0,0,0,0);
                
                const fCosecha = new Date(s.fechaCosecha);
                fCosecha.setMinutes(fCosecha.getMinutes() + fCosecha.getTimezoneOffset());
                fCosecha.setHours(0,0,0,0);
                
                const diasPasados = Math.floor((today.getTime() - fSiembra.getTime()) / (1000 * 3600 * 24));
                const listaParaCosecha = today.getTime() >= fCosecha.getTime();

                return `
                <div class="card" ${listaParaCosecha ? 'style="border: 2px solid #d32f2f;"' : ''}>
                    <div style="display:flex; justify-content:space-between; margin-bottom: 8px;">
                        <strong>${prod.nombre} - ${campo.nombre}</strong>
                        <span class="badge ${s.estado === 'CRECIENDO' ? 'badge-info' : 'badge-warning'}">${s.estado}</span>
                    </div>
                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; margin-bottom:8px;">
                        <p class="list-subtitle">Sembradas: <strong>${s.cantidad}</strong></p>
                        <p class="list-subtitle">Días en campo: <strong>${diasPasados >= 0 ? diasPasados : 0}</strong></p>
                    </div>
                    <p class="list-subtitle" style="margin-bottom:8px;">Registrado por: <strong>${s.autorEmail || 'Anónimo'}</strong></p>
                    <p class="list-subtitle" style="margin-bottom:8px;">Cosecha estimada: <strong>${s.fechaCosecha}</strong></p>
                    
                    ${s.retrasoDias > 0 ? `<p class="list-subtitle" style="color:#d32f2f;"><strong>Retraso en trasplante:</strong> ${s.retrasoDias} día(s)</p>` : ''}
                    ${s.retrasoDias < 0 ? `<p class="list-subtitle" style="color:var(--primary-color);"><strong>Trasplante anticipado:</strong> ${Math.abs(s.retrasoDias)} día(s)</p>` : ''}
                    ${s.retrasoDias === 0 ? `<p class="list-subtitle" style="color:var(--primary-color);"><strong>Trasplante a tiempo</strong></p>` : ''}
                    
                    ${listaParaCosecha && s.estado === 'CRECIENDO' ? `<div style="background-color: #ffebee; color: #c62828; padding: 8px; border-radius: 4px; margin-top: 12px; font-size: 0.9rem; font-weight: bold; text-align: center; border: 1px solid #ef9a9a;">¡ATENCIÓN: TIEMPO DE COSECHA CUMPLIDO!</div>` : ''}

                    ${s.estado === 'CRECIENDO' ? `
                        <div style="margin-top:12px; display:flex; gap:8px;">
                            <input type="date" id="inicio-cosecha-${s.id}" value="${new Date().toISOString().split('T')[0]}" style="flex:1; padding:8px; border:1px solid #ccc; border-radius:4px; font-size:0.9rem;" title="Fecha de inicio de cosecha">
                            <button class="btn-primary" style="flex:2; padding:8px; font-size:0.9rem;" onclick="iniciarCosecha('${s.id}')">Iniciar Etapa Cosecha</button>
                        </div>
                    ` : ''}
                </div>
                `;
            }).join('') || '<p style="text-align:center; color:#757575;">No hay siembras activas</p>'}
        </div>
    `;

    document.getElementById('form-siembra').addEventListener('submit', (e) => {
        e.preventDefault();
        const loteId = document.getElementById('siem-lote').value;
        const lote = DB.get('germinador').find(l => l.id === loteId);
        const prod = productos.find(p => p.id === lote.productoId);
        
        const qtyToPlant = parseInt(document.getElementById('siem-qty').value);
        const disponibles = lote.cantidad - (lote.sembradas || 0);

        if (qtyToPlant > disponibles) {
            alert('Solo tienes ' + disponibles + ' plantas disponibles en este lote.');
            return;
        }

        const plantingDateStr = document.getElementById('siem-date').value;
        let fechaObj = new Date(plantingDateStr);
        fechaObj.setDate(fechaObj.getDate() + prod.diasCosecha);
        let fechaCosecha = fechaObj.toISOString().split('T')[0];

        // Calcular retraso
        const fechaRealSiembra = new Date(plantingDateStr);
        const fechaEstimadaSalida = new Date(lote.fechaSalida);
        const diffTime = fechaRealSiembra.getTime() - fechaEstimadaSalida.getTime();
        const retrasoDias = Math.floor(diffTime / (1000 * 3600 * 24));

        DB.add('siembras', {
            loteId: loteId,
            campoId: document.getElementById('siem-campo').value,
            cantidad: qtyToPlant,
            fechaSiembra: plantingDateStr,
            fechaCosecha: fechaCosecha,
            retrasoDias: retrasoDias,
            estado: 'CRECIENDO'
        });

        // Descontar del lote germinador
        let sembradasActuales = (lote.sembradas || 0) + qtyToPlant;
        let nuevoEstado = lote.estado;
        if (sembradasActuales >= lote.cantidad) {
            nuevoEstado = 'SEMBRADO'; // Ya no está disponible
        }

        DB.update('germinador', loteId, { 
            sembradas: sembradasActuales,
            estado: nuevoEstado 
        });
        
        renderSiembra();
    });
}

window.iniciarCosecha = function(id) {
    const input = document.getElementById(`inicio-cosecha-${id}`);
    const chosenDate = input ? input.value : new Date().toISOString().split('T')[0];
    DB.update('siembras', id, { estado: 'EN_COSECHA', fechaInicioCosecha: chosenDate });
    renderSiembra();
}

// ==========================================
// COSECHA VIEW
// ==========================================
function renderCosecha() {
    let siembrasEnCosecha = DB.get('siembras').filter(s => s.estado === 'EN_COSECHA');
    const productos = DB.get('productos');
    const campos = DB.get('campos');
    const unidades = DB.get('unidades');
    const registros = DB.get('registrosCosecha');

    if (viewFilters.cosecha !== 'ALL') {
        siembrasEnCosecha = siembrasEnCosecha.filter(s => {
            const lote = DB.get('germinador').find(l => l.id === s.loteId);
            return lote && lote.productoId === viewFilters.cosecha;
        });
    }

    const selectOptions = '<option value="ALL">Todos los productos</option>' + 
                          productos.map(p => `<option value="${p.id}" ${viewFilters.cosecha === p.id ? 'selected' : ''}>${p.nombre}</option>`).join('');

    let unitOpts = unidades.map(u => `<option value="${u.id}">${u.nombre} (${u.abrev || ''})</option>`).join('');

    const container = document.getElementById('cosecha-container');
    container.innerHTML = `
        <div class="card" style="margin-bottom:16px;">
            <label style="font-weight:bold; color:var(--primary-dark); font-size:0.9rem;">Filtro de visualización</label>
            <select onchange="setFilter('cosecha', this.value)" style="margin-top:4px;">
                ${selectOptions}
            </select>
        </div>
        ${siembrasEnCosecha.map(s => {
            const lote = DB.get('germinador').find(l => l.id === s.loteId) || {};
            const prod = productos.find(p => p.id === lote.productoId) || {nombre: ''};
            const campo = campos.find(c => c.id === s.campoId) || {nombre: ''};
            
            // Calc stats
            const recs = registros.filter(r => r.siembraId === s.id);
            const totalRec = recs.reduce((a, b) => {
                const uni = unidades.find(u => u.id === b.unidadId) || {};
                const mult = parseFloat(uni.capacidad) || 1;
                return a + (parseFloat(b.cantidad) * mult);
            }, 0);
            const totalMony = recs.reduce((a, b) => a + parseFloat(b.total || 0), 0);

            return `
            <div class="card">
                <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid #eee; padding-bottom:8px; margin-bottom:8px;">
                    <div>
                        <h3 style="margin:0; border:none; padding:0;">${prod.nombre}</h3>
                        <p class="list-subtitle">${campo.nombre} &bull; <strong>${s.cantidad} plantas</strong></p>
                    </div>
                    <button class="btn-danger" style="color:white; background:#d32f2f;" onclick="finalizarSiembra('${s.id}')">Finalizar</button>
                </div>
                
                <div style="display:flex; gap:16px; margin-bottom:12px;">
                    <div>
                        <p class="list-subtitle">Recolectado (Ud. Base)</p>
                        <strong>${totalRec.toFixed(2)}</strong>
                    </div>
                    <div>
                        <p class="list-subtitle">Ingresos</p>
                        <strong style="color:var(--primary-color)">$${totalMony.toFixed(2)}</strong>
                    </div>
                </div>

                <div style="background:#f9f9f9; padding:8px; border-radius:4px;">
                    <h4 style="font-size:0.9rem; margin-bottom:8px;">Registrar Corte</h4>
                    <form onsubmit="registrarCorte(event, '${s.id}')">
                        <div class="form-row">
                            <div class="form-group">
                                <label>Cantidad</label>
                                <input type="number" step="0.01" id="corte-qty-${s.id}" required>
                            </div>
                            <div class="form-group">
                                <label>Unidad</label>
                                <select id="corte-unit-${s.id}" required>${unitOpts}</select>
                            </div>
                        </div>
                        <div class="form-row">
                            <div class="form-group">
                                <label>Precio x Ud. ($)</label>
                                <input type="number" step="0.01" id="corte-price-${s.id}">
                            </div>
                            <div class="form-group">
                                <label>Fecha</label>
                                <input type="date" id="corte-date-${s.id}" required value="${new Date().toISOString().split('T')[0]}">
                            </div>
                        </div>
                        <button type="submit" class="btn-primary" style="padding:8px; font-size:0.9rem;">Guardar Registro</button>
                    </form>
                </div>
            </div>
            `;
        }).join('') || '<p style="text-align:center; color:#757575;">No hay siembras en etapa de cosecha para este filtro.</p>'}
    `;
}

window.registrarCorte = function(e, siembraId) {
    e.preventDefault();
    const qty = parseFloat(document.getElementById(`corte-qty-${siembraId}`).value);
    const price = parseFloat(document.getElementById(`corte-price-${siembraId}`).value || 0);
    
    DB.add('registrosCosecha', {
        siembraId: siembraId,
        cantidad: qty,
        unidadId: document.getElementById(`corte-unit-${siembraId}`).value,
        precio: price,
        total: qty * price,
        fecha: document.getElementById(`corte-date-${siembraId}`).value
    });
    renderCosecha();
}

window.finalizarSiembra = function(id) {
    if(confirm('¿Estás seguro de finalizar esta siembra? Pasará al historial.')) {
        const today = new Date().toISOString().split('T')[0];
        DB.update('siembras', id, { estado: 'FINALIZADA', fechaFinCosecha: today });
        renderCosecha();
    }
}

// ==========================================
// ALERTAS VIEW
// ==========================================
function renderAlertas() {
    const container = document.getElementById('alertas-container');
    const productos = DB.get('productos');
    const germinador = DB.get('germinador');
    const today = new Date();
    today.setHours(0,0,0,0);

    let html = `
        <div class="card" style="margin-bottom:16px;">
            <label style="font-weight:bold; color:var(--primary-dark); font-size:0.9rem;">Filtrar Alertas</label>
            <select onchange="setFiltroAlertas(this.value)" style="margin-top:4px;">
                <option value="ALL" ${viewFiltersAlertas === 'ALL' ? 'selected' : ''}>Todas las Alertas</option>
                <option value="FREQ" ${viewFiltersAlertas === 'FREQ' ? 'selected' : ''}>Solo Frecuencia Germinación</option>
                <option value="TRAS" ${viewFiltersAlertas === 'TRAS' ? 'selected' : ''}>Solo Retrasos de Trasplante</option>
            </select>
        </div>
        <div id="list-alertas">
    `;

    let alertasArray = [];

    // 1. Frecuencia Germinación
    if (viewFiltersAlertas === 'ALL' || viewFiltersAlertas === 'FREQ') {
        productos.forEach(prod => {
            if (prod.frecuenciaGerminacion && prod.frecuenciaGerminacion > 0) {
                const lotesProd = germinador.filter(l => l.productoId === prod.id);
                lotesProd.sort((a,b) => new Date(b.fechaInicio) - new Date(a.fechaInicio));
                const ultimoLote = lotesProd.length > 0 ? lotesProd[0] : null;

                if (!ultimoLote) {
                    alertasArray.push(`
                        <div class="card" style="border-left: 4px solid #d32f2f;">
                            <h4 style="color:#c62828; margin-bottom:4px;">Falta Germinar: ${prod.nombre}</h4>
                            <p class="list-subtitle">Nunca se ha registrado una germinación para este producto.</p>
                            <p class="list-subtitle" style="margin-top:4px; font-weight:bold;">Frecuencia exigida: Cada ${prod.frecuenciaGerminacion} días.</p>
                        </div>
                    `);
                } else {
                    const fInicio = new Date(ultimoLote.fechaInicio);
                    fInicio.setHours(0,0,0,0);
                    const diffTime = today.getTime() - fInicio.getTime();
                    const diasPasados = Math.floor(diffTime / (1000 * 3600 * 24));
                    
                    if (diasPasados > prod.frecuenciaGerminacion) {
                        const retraso = diasPasados - prod.frecuenciaGerminacion;
                        alertasArray.push(`
                            <div class="card" style="border-left: 4px solid #d32f2f;">
                                <h4 style="color:#c62828; margin-bottom:4px;">Retraso Nueva Germinación: ${prod.nombre}</h4>
                                <p class="list-subtitle">La última germinación fue hace <strong>${diasPasados} días</strong> (${ultimoLote.fechaInicio}).</p>
                                <p class="list-subtitle" style="margin-top:4px;">Frecuencia exigida: Cada ${prod.frecuenciaGerminacion} días.</p>
                                <div style="background-color: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; margin-top: 8px; font-size: 0.85rem; font-weight: bold; display:inline-block;">¡Retraso de ${retraso} día(s)!</div>
                            </div>
                        `);
                    } else {
                        const faltan = prod.frecuenciaGerminacion - diasPasados;
                        alertasArray.push(`
                            <div class="card" style="border-left: 4px solid #fbc02d;">
                                <h4 style="color:#f57f17; margin-bottom:4px;">Próxima Germinación: ${prod.nombre}</h4>
                                <p class="list-subtitle">Última hace ${diasPasados} días. Faltan <strong>${faltan} días</strong> para la siguiente ronda.</p>
                            </div>
                        `);
                    }
                }
            }
        });
    }

    // 2. Retraso Trasplante
    if (viewFiltersAlertas === 'ALL' || viewFiltersAlertas === 'TRAS') {
        germinador.forEach(l => {
            if (l.estado === 'EN_GERMINACION' || l.estado === 'LISTO') {
                const prod = productos.find(p => p.id === l.productoId) || {nombre: 'Desconocido'};
                const fSalida = new Date(l.fechaSalida);
                fSalida.setHours(0,0,0,0);
                const diffTime = today.getTime() - fSalida.getTime();
                const diasRetraso = Math.floor(diffTime / (1000 * 3600 * 24));

                if (diasRetraso > 0) {
                    alertasArray.push(`
                        <div class="card" style="border-left: 4px solid #d32f2f;">
                            <h4 style="color:#c62828; margin-bottom:4px;">Retraso Trasplante: ${prod.nombre}</h4>
                            <p class="list-subtitle">Lote iniciado el ${l.fechaInicio}. Debió salir el <strong>${l.fechaSalida}</strong>.</p>
                            <p class="list-subtitle" style="margin-top:4px;">Semillas iniciales: ${l.cantidad} | Disponibles: ${l.cantidad - (l.sembradas || 0)}</p>
                            <div style="background-color: #ffebee; color: #c62828; padding: 4px 8px; border-radius: 4px; margin-top: 8px; font-size: 0.85rem; font-weight: bold; display:inline-block;">¡Lleva ${diasRetraso} día(s) en espera!</div>
                        </div>
                    `);
                }
            }
        });
    }

    if (alertasArray.length === 0) {
        html += '<p style="text-align:center; color:#757575; padding: 12px;">No hay alertas pendientes en este momento. ¡Todo está al día!</p>';
    } else {
        html += alertasArray.join('');
    }

    html += '</div>';
    container.innerHTML = html;
}

// ==========================================
// DASHBOARD VIEW
// ==========================================
function renderDashboard() {
    const siembras = DB.get('siembras');
    const activas = siembras.filter(s => s.estado !== 'FINALIZADA').length;
    const finalizadas = siembras.filter(s => s.estado === 'FINALIZADA');
    
    const lotes = DB.get('germinador').filter(l => l.estado === 'EN_GERMINACION').length;
    const productos = DB.get('productos');
    const campos = DB.get('campos');
    const registros = DB.get('registrosCosecha');

    const container = document.getElementById('dashboard-container');
    let html = `
        <div class="metrics-grid no-print">
            <div class="metric-card">
                <div class="metric-value" style="color:#f57f17">${lotes}</div>
                <div class="metric-label">En Germinador</div>
            </div>
            <div class="metric-card">
                <div class="metric-value">${activas}</div>
                <div class="metric-label">Siembras Activas</div>
            </div>
        </div>

        <div class="card" id="gantt-card">
            <div style="display:flex; justify-content:space-between; align-items:center;">
                <h3>Reporte Cronograma (Gantt)</h3>
                <button class="btn-primary no-print" style="padding:6px 12px; font-size:0.8rem; background-color:#1565c0;" onclick="printReport('gantt')"><i class="material-icons" style="font-size:1rem; vertical-align:middle; margin-right:4px;">print</i>Imprimir</button>
            </div>
            <div class="form-row no-print">
                <div class="form-group">
                    <label>Producto a visualizar</label>
                    <select id="gantt-product">
                        <option value="ALL">Todos los productos</option>
                        ${productos.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('')}
                    </select>
                </div>
                <div class="form-group">
                    <label>Etapa a visualizar</label>
                    <select id="gantt-stage">
                        <option value="ALL">Ciclo Completo</option>
                        <option value="GERM">Solo Germinación</option>
                        <option value="SIEM">Solo Crecimiento en Campo</option>
                        <option value="COSE">Solo Cosecha</option>
                    </select>
                </div>
            </div>
            <div class="form-row no-print">
                <div class="form-group">
                    <label>Desde Fecha</label>
                    <input type="date" id="gantt-from">
                </div>
                <div class="form-group">
                    <label>Hasta Fecha</label>
                    <input type="date" id="gantt-to">
                </div>
            </div>
            <button class="btn-primary no-print" onclick="renderGantt()" style="margin-bottom:16px;">Generar Reporte Visual</button>
            
            <div id="gantt-results" style="margin-top:16px;"></div>
        </div>

        <!-- REPORT OF PROJECTIONS -->
        <div class="card" id="proyecciones-card" style="margin-top: 16px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 12px;">
                <h3>Proyecciones de Cosecha</h3>
                <button class="btn-primary no-print" style="padding:6px 12px; font-size:0.8rem; background-color:#1565c0;" onclick="printReport('proyecciones')"><i class="material-icons" style="font-size:1rem; vertical-align:middle; margin-right:4px;">print</i>Imprimir</button>
            </div>
            <p class="list-subtitle no-print" style="margin-bottom:12px;">Proyección basada en las siembras activas en el campo y el rendimiento configurado por producto.</p>
            <div style="overflow-x:auto;">
                <table style="width:100%; border-collapse: collapse; min-width: 500px; text-align:left;">
                    <thead>
                        <tr style="background-color: var(--primary-light); color: white;">
                            <th style="padding: 8px; border: 1px solid #ccc;">Producto</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Campo</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Semillas Plantadas</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Cosecha Estimada</th>
                            <th style="padding: 8px; border: 1px solid #ccc;">Fecha Inicio Proyectada</th>
                        </tr>
                    </thead>
                    <tbody>
    `;

    const activasArr = siembras.filter(s => s.estado !== 'FINALIZADA');
    if (activasArr.length === 0) {
        html += `<tr><td colspan="5" style="padding: 12px; text-align:center; color:#757575;">No hay siembras activas en campo para proyectar.</td></tr>`;
    } else {
        activasArr.forEach(s => {
            const lote = DB.get('germinador').find(l => l.id === s.loteId);
            if(lote) {
                const prod = productos.find(p => p.id === lote.productoId) || {nombre:'?', diasCosecha: 0, rendimientoPorPlanta: 1};
                const campo = campos.find(c => c.id === s.campoId) || {nombre:'?'};
                const sembradas = s.cantidad || 0;
                const proyectada = (sembradas * (prod.rendimientoPorPlanta || 1)).toFixed(1);
                
                const fSiembra = new Date(s.fechaSiembra);
                fSiembra.setDate(fSiembra.getDate() + (prod.diasCosecha || 0));
                const fechaCosecha = fSiembra.toISOString().split('T')[0];

                html += `
                    <tr>
                        <td style="padding: 8px; border: 1px solid #ccc;"><strong>${prod.nombre}</strong></td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${campo.nombre}</td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${sembradas.toLocaleString()}</td>
                        <td style="padding: 8px; border: 1px solid #ccc; font-weight:bold; color:var(--primary-dark);">${proyectada.toLocaleString()}</td>
                        <td style="padding: 8px; border: 1px solid #ccc;">${fechaCosecha}</td>
                    </tr>
                `;
            }
        });
    }

    html += `
                    </tbody>
                </table>
            </div>
        </div>

        <h3 class="no-print" style="margin-bottom:12px; margin-top:24px; color:var(--text-muted); font-size:1rem;">Historial de Siembras Finalizadas</h3>
        <div id="list-historial" class="no-print">
            ${finalizadas.reverse().map(s => {
                const lote = DB.get('germinador').find(l => l.id === s.loteId) || {};
                const prod = productos.find(p => p.id === lote.productoId) || {nombre: ''};
                const campo = campos.find(c => c.id === s.campoId) || {nombre: ''};
                
                const recs = registros.filter(r => r.siembraId === s.id);
                const unidadesDB = DB.get('unidades');
                const totalRec = recs.reduce((a, b) => {
                    const uni = unidadesDB.find(u => u.id === b.unidadId) || {};
                    const mult = parseFloat(uni.capacidad) || 1;
                    return a + (parseFloat(b.cantidad) * mult);
                }, 0);
                const totalMony = recs.reduce((a, b) => a + parseFloat(b.total || 0), 0);

                let inicioCosecha = s.fechaInicioCosecha || 'Sin ventas';
                let finCosecha = s.fechaFinCosecha || 'Sin ventas';
                
                if (recs.length > 0) {
                    const sortedRecs = [...recs].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
                    if (!s.fechaInicioCosecha) inicioCosecha = sortedRecs[0].fecha;
                    finCosecha = sortedRecs[sortedRecs.length - 1].fecha;
                }

                let retrasoText = "A tiempo";
                if (s.retrasoDias > 0) retrasoText = 'Retraso de ' + s.retrasoDias + ' día(s)';
                if (s.retrasoDias < 0) retrasoText = 'Anticipado ' + Math.abs(s.retrasoDias) + ' día(s)';
                
                let ratio = 0;
                if (s.cantidad > 0) {
                    ratio = totalRec / s.cantidad;
                }

                return `
                <div class="card" style="border-left: 4px solid var(--primary-color)">
                    <div style="display:flex; justify-content:space-between; margin-bottom:8px;">
                        <strong>${prod.nombre}</strong>
                        <span class="badge" style="background:#e0e0e0;">${campo.nombre}</span>
                    </div>
                    <p style="font-size:0.75rem; color:var(--text-muted); margin-bottom:8px;">Siembra registrada por: ${s.autorEmail || 'Anónimo'}</p>
                    
                    <div style="font-size:0.85rem; margin-bottom: 8px; color: var(--text-muted); display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                        <div><strong>Germinó:</strong> ${lote.fechaInicio || 'N/A'}</div>
                        <div><strong>Trasplante:</strong> ${retrasoText}</div>
                        <div><strong>Inició Cosecha:</strong> ${inicioCosecha}</div>
                        <div><strong>Finalizó:</strong> ${finCosecha}</div>
                    </div>

                    <div style="display:flex; justify-content:space-between; font-size:0.85rem; border-top: 1px solid #eee; padding-top: 8px;">
                        <div>
                            <span style="color:var(--text-muted)">Plantadas:</span> ${s.cantidad}
                        </div>
                        <div style="text-align: right;">
                            <div><span style="color:var(--text-muted)">Recolectado:</span> ${totalRec.toFixed(2)}</div>
                            <div style="color:var(--primary-light); font-weight:bold; margin-top:2px;">Rendimiento: ${ratio.toFixed(2)} x planta</div>
                        </div>
                    </div>
                    <div style="margin-top:8px; display:flex; justify-content:space-between; align-items:center;">
                        <div style="font-weight:bold; color:var(--primary-dark)">
                            Total Generado: $${totalMony.toFixed(2)}
                        </div>
                        <button class="btn-primary" style="padding:4px 8px; font-size:0.8rem; background:transparent; color:var(--primary-color); border:1px solid var(--primary-color);" onclick="document.getElementById('ventas-${s.id}').style.display = document.getElementById('ventas-${s.id}').style.display === 'none' ? 'block' : 'none'">
                            Desglose de ventas (${recs.length})
                        </button>
                    </div>
                    
                    <div id="ventas-${s.id}" style="display:none; margin-top:12px; border-top:1px dashed #ccc; padding-top:8px;">
                        <div style="display:flex; justify-content:space-between; font-size:0.75rem; color:var(--text-muted); margin-bottom:6px; font-weight:bold;">
                            <span>Fecha</span>
                            <span>Cantidad</span>
                            <span>Ingreso</span>
                        </div>
                        ${[...recs].sort((a,b) => new Date(a.fecha) - new Date(b.fecha)).map(r => {
                            const uni = unidadesDB.find(u => u.id === r.unidadId) || {abrev: ''};
                            return `<div style="display:flex; justify-content:space-between; font-size:0.8rem; margin-bottom:4px; padding:4px 0; border-bottom:1px solid #f0f0f0;">
                                <span>${r.fecha}</span>
                                <span>${r.cantidad} ${uni.abrev}</span>
                                <span style="color:var(--primary-dark)">$${r.total}</span>
                            </div>`;
                        }).join('')}
                    </div>
                </div>
                `;
            }).join('') || '<p style="text-align:center; color:#757575;">No hay históricos aún</p>'}
        </div>
    `;

    container.innerHTML = html;

    // Fechas por defecto para Gantt (últimos 6 meses)
    const today = new Date();
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(today.getMonth() - 6);
    document.getElementById('gantt-to').value = today.toISOString().split('T')[0];
    document.getElementById('gantt-from').value = sixMonthsAgo.toISOString().split('T')[0];
    
    renderGantt();
}

window.renderGantt = function() {
    const stage = document.getElementById('gantt-stage').value;
    const productVal = document.getElementById('gantt-product').value;
    const fromStr = document.getElementById('gantt-from').value;
    const toStr = document.getElementById('gantt-to').value;
    const container = document.getElementById('gantt-results');

    if (!fromStr || !toStr) {
        container.innerHTML = '<p style="color:#d32f2f; font-size:0.8rem;">Selecciona ambas fechas.</p>';
        return;
    }

    const tFrom = new Date(fromStr).getTime();
    const tTo = new Date(toStr).getTime();
    const totalDuration = tTo - tFrom;

    if (totalDuration <= 0) {
        container.innerHTML = '<p style="color:#d32f2f; font-size:0.8rem;">La fecha "Hasta" debe ser mayor que "Desde".</p>';
        return;
    }

    let siembras = DB.get('siembras').filter(s => s.estado === 'FINALIZADA');
    
    if (productVal !== 'ALL') {
        siembras = siembras.filter(s => {
            const lote = DB.get('germinador').find(l => l.id === s.loteId);
            return lote && lote.productoId === productVal;
        });
    }

    const productos = DB.get('productos');
    const registros = DB.get('registrosCosecha');
    
    let html = '';

    const calcPos = (start, end) => {
        if (!start || !end || end < tFrom || start > tTo) return null;
        let drawS = Math.max(start, tFrom);
        let drawE = Math.min(end, tTo);
        let left = ((drawS - tFrom) / totalDuration) * 100;
        let width = ((drawE - drawS) / totalDuration) * 100;
        if (width < 0.5) width = 0.5;
        return { left, width, drawS, drawE };
    };

    siembras.forEach(s => {
        const lote = DB.get('germinador').find(l => l.id === s.loteId) || {};
        const prod = productos.find(p => p.id === lote.productoId) || {nombre: 'Desconocido'};
        const campo = DB.get('campos').find(c => c.id === s.campoId) || {nombre: ''};
        const recs = registros.filter(r => r.siembraId === s.id);
        const sortedRecs = [...recs].sort((a, b) => new Date(a.fecha).getTime() - new Date(b.fecha).getTime());
        
        let dGermInicio = lote.fechaInicio ? new Date(lote.fechaInicio).getTime() : null;
        let dSiembra = s.fechaSiembra ? new Date(s.fechaSiembra).getTime() : null;
        
        let dCosInicio = s.fechaInicioCosecha ? new Date(s.fechaInicioCosecha).getTime() : null;
        let dCosFin = s.fechaFinCosecha ? new Date(s.fechaFinCosecha).getTime() : null;

        if (!dCosInicio && sortedRecs.length > 0) dCosInicio = new Date(sortedRecs[0].fecha).getTime();
        if (sortedRecs.length > 0) dCosFin = new Date(sortedRecs[sortedRecs.length-1].fecha).getTime();

        if(!dCosInicio) dCosInicio = dSiembra;
        if(!dCosFin) dCosFin = dCosInicio;

        let retrasoStr = "";
        if (s.retrasoDias > 0) retrasoStr = "Retraso: " + s.retrasoDias + "d";
        else if (s.retrasoDias < 0) retrasoStr = "Anticipo: " + Math.abs(s.retrasoDias) + "d";
        else retrasoStr = "A tiempo";

        let diasCosecha = Math.floor((dCosFin - dCosInicio) / (1000 * 3600 * 24));
        if (diasCosecha < 1) diasCosecha = 1;

        if (stage === 'ALL') {
            const pGerm = calcPos(dGermInicio, dSiembra);
            const pSiem = calcPos(dSiembra, dCosInicio);
            const pCose = calcPos(dCosInicio, dCosFin);

            let barsHtml = '';
            let globalStart = null;
            let globalEnd = null;
            let labels = new Set();
            let labelsHtml = '';

            const addLabel = (perc, dateMs) => {
                if (perc < 0 || perc > 100) return;
                const dStr = new Date(dateMs).toISOString().split('T')[0];
                const key = Math.round(perc) + '_' + dStr;
                if (!labels.has(key)) {
                    labels.add(key);
                    const ds = new Date(dateMs);
                    const disp = String(ds.getDate()).padStart(2, '0') + '/' + String(ds.getMonth() + 1).padStart(2, '0') + '/' + ds.getFullYear().toString().substring(2);
                    let align = 'translateX(-50%)';
                    if (perc < 3) align = 'translateX(0)';
                    if (perc > 97) align = 'translateX(-100%)';
                    labelsHtml += '<div style="position:absolute; left:' + perc + '%; top:18px; transform:' + align + '; font-size:0.65rem; color:#333; font-weight:bold; z-index:10; white-space:nowrap;">' + disp + '</div>';
                }
            };

            if (pGerm) {
                barsHtml += '<div style="position:absolute; left:' + pGerm.left + '%; width:' + pGerm.width + '%; height:100%; background:#f57f17; border-radius:4px;" title="Germinación"></div>';
                if (!globalStart) globalStart = pGerm.drawS;
                globalEnd = pGerm.drawE;
                addLabel(pGerm.left, pGerm.drawS);
                addLabel(pGerm.left + pGerm.width, pGerm.drawE);
            }
            if (pSiem) {
                barsHtml += '<div style="position:absolute; left:' + pSiem.left + '%; width:' + pSiem.width + '%; height:100%; background:#1565c0; border-radius:4px;" title="' + retrasoStr + '"></div>';
                if (!globalStart) globalStart = pSiem.drawS;
                globalEnd = pSiem.drawE;
                addLabel(pSiem.left, pSiem.drawS);
                addLabel(pSiem.left + pSiem.width, pSiem.drawE);
            }
            if (pCose) {
                barsHtml += '<div style="position:absolute; left:' + pCose.left + '%; width:' + pCose.width + '%; height:100%; background:#d32f2f; border-radius:4px;" title="Duración: ' + diasCosecha + ' día(s)"></div>';
                if (!globalStart) globalStart = pCose.drawS;
                globalEnd = pCose.drawE;
                addLabel(pCose.left, pCose.drawS);
                addLabel(pCose.left + pCose.width, pCose.drawE);
            }
            
            if (barsHtml !== '') {
                html += `
                    <div style="margin-bottom:28px; font-size:0.8rem; border-bottom:1px solid #eee; padding-bottom:8px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:4px;">
                            <strong>${prod.nombre} - ${campo.nombre}</strong>
                            <span style="color:var(--text-muted); font-size:0.7rem;">${new Date(globalStart).toISOString().split('T')[0]} a ${new Date(globalEnd).toISOString().split('T')[0]}</span>
                        </div>
                        <div style="background:#e0e0e0; height:16px; border-radius:4px; position:relative; margin-bottom:12px;">
                            ${barsHtml}
                            ${labelsHtml}
                        </div>
                        <div style="display:flex; gap:8px; font-size:0.7rem; color:var(--text-muted); margin-top:12px;">
                            <span><span style="display:inline-block; width:8px; height:8px; background:#f57f17; border-radius:50%;"></span> Germinación</span>
                            <span><span style="display:inline-block; width:8px; height:8px; background:#1565c0; border-radius:50%;"></span> Siembra (${retrasoStr})</span>
                            <span><span style="display:inline-block; width:8px; height:8px; background:#d32f2f; border-radius:50%;"></span> Cosecha (${diasCosecha}d)</span>
                        </div>
                    </div>
                `;
            }

        } else {
            let startT = null; let endT = null; let color = ''; let extraTitle = '';
            if (stage === 'GERM') { startT = dGermInicio; endT = dSiembra; color = '#f57f17'; }
            else if (stage === 'SIEM') { startT = dSiembra; endT = dCosInicio; color = '#1565c0'; extraTitle = retrasoStr; }
            else if (stage === 'COSE') { startT = dCosInicio; endT = dCosFin; color = '#d32f2f'; extraTitle = "Duración: " + diasCosecha + "d"; }
            
            const p = calcPos(startT, endT);
            if (p) {
                let labels = new Set();
                let labelsHtml = '';

                const addLabel = (perc, dateMs) => {
                    if (perc < 0 || perc > 100) return;
                    const dStr = new Date(dateMs).toISOString().split('T')[0];
                    const key = Math.round(perc) + '_' + dStr;
                    if (!labels.has(key)) {
                        labels.add(key);
                        const ds = new Date(dateMs);
                        const disp = String(ds.getDate()).padStart(2, '0') + '/' + String(ds.getMonth() + 1).padStart(2, '0') + '/' + ds.getFullYear().toString().substring(2);
                        let align = 'translateX(-50%)';
                        if (perc < 3) align = 'translateX(0)';
                        if (perc > 97) align = 'translateX(-100%)';
                        labelsHtml += '<div style="position:absolute; left:' + perc + '%; top:18px; transform:' + align + '; font-size:0.65rem; color:#333; font-weight:bold; z-index:10; white-space:nowrap;">' + disp + '</div>';
                    }
                };
                
                addLabel(p.left, p.drawS);
                addLabel(p.left + p.width, p.drawE);

                html += `
                    <div style="margin-bottom:28px; font-size:0.8rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom:2px;">
                            <strong>${prod.nombre} - ${campo.nombre} <span style="color:var(--text-muted); font-weight:normal;">${extraTitle ? '('+extraTitle+')' : ''}</span></strong>
                            <span style="color:var(--text-muted); font-size:0.7rem;">${new Date(p.drawS).toISOString().split('T')[0]} a ${new Date(p.drawE).toISOString().split('T')[0]}</span>
                        </div>
                        <div style="background:#e0e0e0; height:14px; border-radius:4px; position:relative; margin-bottom:12px;">
                            <div style="position:absolute; left:${p.left}%; width:${p.width}%; height:100%; background:${color}; border-radius:4px;" title="${extraTitle}"></div>
                            ${labelsHtml}
                        </div>
                    </div>
                `;
            }
        }
    });

    if (html === '') {
        container.innerHTML = '<p style="color:#757575; font-size:0.8rem; text-align:center; padding: 12px;">No hay siembras en esta etapa para las fechas seleccionadas.</p>';
    } else {
        container.innerHTML = html;
    }
}

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

auth.onAuthStateChanged(user => {
    if (user) {
        // User is signed in
        currentUser = user;
        document.getElementById('view-login').classList.remove('active');
        
        // Setup initial UI state if not already set
        const activeView = document.querySelector('.view.active');
        if (!activeView || activeView.id === 'view-login') {
            document.getElementById('view-dashboard').classList.add('active');
        }
        
        document.getElementById('main-header').style.display = 'flex';
        document.getElementById('bottom-nav').style.display = 'flex';
        
        startListeners();
    } else {
        // User is signed out
        currentUser = null;
        document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
        document.getElementById('view-login').classList.add('active');
        
        document.getElementById('main-header').style.display = 'none';
        document.getElementById('bottom-nav').style.display = 'none';
    }
});

document.getElementById('form-login').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const pass = document.getElementById('login-password').value;
    const errorEl = document.getElementById('login-error');
    
    auth.signInWithEmailAndPassword(email, pass)
        .then(() => {
            errorEl.style.display = 'none';
            e.target.reset();
        })
        .catch(error => {
            errorEl.textContent = "Error al iniciar sesión: " + error.message;
            errorEl.style.display = 'block';
        });
});

window.logout = function() {
    auth.signOut();
};
