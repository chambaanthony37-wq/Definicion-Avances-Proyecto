import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm';

// Credenciales Originales
const SUPABASE_URL = 'https://mkihtmoauffvjmenxvli.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raWh0bW9hdWZmdmptZW54dmxpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODc4MzU0ODgsImV4cCI6MjEwMzQxMTQ4OH0.Eo7gPtpBF4m16I26-BVnnSY6o9O50MG25mN5ONB3-vY';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

let inventarioBodega = [];

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN Y ROLES
// ==========================================
const authContainer = document.getElementById('auth-container');
const dashboardContainer = document.getElementById('dashboard-container');

document.getElementById('btn-show-register').addEventListener('click', () => {
    document.getElementById('form-login').classList.add('hidden');
    document.getElementById('form-register').classList.remove('hidden');
    document.getElementById('auth-title').innerText = "Crear Cuenta";
});

document.getElementById('btn-show-login').addEventListener('click', () => {
    document.getElementById('form-register').classList.add('hidden');
    document.getElementById('form-login').classList.remove('hidden');
    document.getElementById('auth-title').innerText = "Iniciar Sesión";
});

document.getElementById('form-register').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('reg-email').value;
    const password = document.getElementById('reg-password').value;
    const rol = document.getElementById('reg-rol').value;

    try {
        const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
        if (authError) throw authError;

        if (authData.user) {
            const { error: dbError } = await supabase.from('usuarios').insert([{ id: authData.user.id, email, rol }]);
            if (dbError) throw dbError;
        }

        // 1. Borramos la información que el usuario escribió en los campos
        e.target.reset();

        // 2. Cerramos la sesión automática que Supabase crea al registrar
        await supabase.auth.signOut();

        // 3. Mostramos el mensaje de éxito
        alert('Registro exitoso. Ahora puedes hacer clic en "Inicia Sesión" para ingresar.');
        
        // (Opcional) Si quieres que cambie a la pantalla de login automáticamente, 
        // descomenta la siguiente línea:
        // document.getElementById('btn-show-login').click();

    } catch (error) { 
        alert('Error: ' + error.message); 
    }
});

document.getElementById('form-login').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await verificarSesion();
    } catch (error) { alert('Error: ' + error.message); }
});

document.getElementById('btn-logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    dashboardContainer.classList.add('hidden');
    authContainer.classList.remove('hidden');
    authContainer.classList.add('flex');
});

async function verificarSesion() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        authContainer.classList.add('hidden');
        authContainer.classList.remove('flex');
        dashboardContainer.classList.remove('hidden');

        const user = session.user;
        
        // Consultar el Rol
        const { data: userData } = await supabase.from('usuarios').select('rol').eq('id', user.id).single();
        const rolActual = userData ? userData.rol : 'Administrador';

        document.getElementById('ui-user-email').innerText = user.email;
        document.getElementById('ui-user-role').innerText = rolActual;
        document.getElementById('ui-user-initial').innerText = user.email.charAt(0).toUpperCase();

        // LOGICA DE ROLES: Filtrar menú según data-roles
        const enlacesMenu = document.querySelectorAll('.sidebar-link');
        let primerEnlaceVisible = null;

        enlacesMenu.forEach(enlace => {
            const rolesPermitidos = enlace.getAttribute('data-roles');
            // Si el rol actual está en la lista de roles permitidos del botón
            if (rolesPermitidos && rolesPermitidos.includes(rolActual)) {
                enlace.classList.remove('hidden');
                if (!primerEnlaceVisible) primerEnlaceVisible = enlace;
            } else {
                enlace.classList.add('hidden');
            }
        });

        // Cargar datos base de Supabase
        cargarProveedores();
        cargarBodega();
        cargarLotes();
        cargarCalidad();

        // Navegar automáticamente a la primera pantalla que le corresponde a su rol
        if (primerEnlaceVisible) {
            primerEnlaceVisible.click();
        }

    } else {
        authContainer.classList.remove('hidden');
        authContainer.classList.add('flex');
        dashboardContainer.classList.add('hidden');
    }
}

// ==========================================
// 2. Control de Navegación SPA
// ==========================================
window.navegar = function (modulo) {
    document.querySelectorAll('.modulo-view').forEach(view => view.classList.add('hidden'));
    
    // Resaltado visual en el menú
    document.querySelectorAll('.sidebar-link').forEach(link => {
        link.classList.remove('bg-slate-800', 'text-white');
    });
    
    const botonActivo = document.querySelector(`button[onclick="navegar('${modulo}')"]`);
    if(botonActivo) botonActivo.classList.add('bg-slate-800', 'text-white');

    const target = document.getElementById(`view-${modulo}`);
    if (target) target.classList.remove('hidden');
};

// ==========================================
// 3. MÓDULO PROVEEDORES (Igual)
// ==========================================
async function cargarProveedores() {
    const { data, error } = await supabase.from('proveedores').select('*').order('created_at', { ascending: false });
    if (error) return;
    const tbody = document.getElementById('tbl-proveedores');
    const selectBodega = document.getElementById('mp-proveedor');
    
    if(tbody) tbody.innerHTML = '';
    if(selectBodega) selectBodega.innerHTML = '<option value="">Seleccione proveedor</option>';

    data.forEach(p => {
        if(tbody) tbody.innerHTML += `<tr class="hover:bg-slate-50"><td class="p-4 font-semibold text-slate-800">${p.nombre}</td><td class="p-4">${p.ruc}</td><td class="p-4">${p.contacto}</td><td class="p-4"><button onclick="eliminarProveedor('${p.id}')" class="text-red-500 font-bold">✕</button></td></tr>`;
        if(selectBodega) selectBodega.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
    });
}
document.getElementById('form-prov')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('p-nombre').value, ruc = document.getElementById('p-ruc').value, contacto = document.getElementById('p-contacto').value;
    await supabase.from('proveedores').insert([{ nombre, ruc, contacto }]);
    e.target.reset(); cargarProveedores();
});
window.eliminarProveedor = async (id) => {
    if (confirm('Eliminar?')) { await supabase.from('proveedores').delete().eq('id', id); cargarProveedores(); }
};

// ==========================================
// 4. MÓDULO BODEGA (Igual)
// ==========================================
document.getElementById('mp-galones')?.addEventListener('input', (e) => {
    const galones = parseFloat(e.target.value);
    document.getElementById('mp-cantidad').value = (!isNaN(galones) && galones > 0) ? (galones * 3.78541).toFixed(2) : '';
});
async function cargarBodega() {
    const { data, error } = await supabase.from('materia_prima').select('*, proveedores(nombre)');
    if (error) return;
    inventarioBodega = data || [];
    const tbody = document.getElementById('tbl-bodega'), selectLote = document.getElementById('lote-materia');
    if(tbody) tbody.innerHTML = '';
    if(selectLote) selectLote.innerHTML = '<option value="">Seleccione insumo</option>';
    inventarioBodega.forEach(item => {
        if(tbody) tbody.innerHTML += `<tr class="hover:bg-slate-50"><td class="p-4 font-semibold">${item.nombre}</td><td class="p-4">${item.proveedores?.nombre || 'N/A'}</td><td class="p-4"><span class="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm">${item.cantidad} L</span></td></tr>`;
        if(selectLote) selectLote.innerHTML += `<option value="${item.id}">${item.nombre} (Disp: ${item.cantidad} L)</option>`;
    });
}
document.getElementById('form-mp')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const nombre = document.getElementById('mp-nombre').value, proveedor_id = document.getElementById('mp-proveedor').value, cantidad = parseFloat(document.getElementById('mp-cantidad').value);
    await supabase.from('materia_prima').insert([{ nombre, proveedor_id, cantidad, unidad: 'Litros' }]);
    e.target.reset(); document.getElementById('mp-cantidad').value = ''; cargarBodega();
});

// ==========================================
// 5. MÓDULO PRODUCCIÓN (Agregado Fases)
// ==========================================
async function cargarLotes() {
    const { data, error } = await supabase.from('lotes').select('*, materia_prima(nombre)');
    if (error) return;
    const tbody = document.getElementById('tbl-lotes'), selectCalidad = document.getElementById('calidad-lote');
    if(tbody) tbody.innerHTML = '';
    if(selectCalidad) selectCalidad.innerHTML = '<option value="">Seleccione lote a evaluar...</option>';
    data.forEach(lote => {
        if(tbody) {
            // Select para que el Operador registre las fases de destilación
            const fases = ['Fermentación', 'Destilación - Cabeza', 'Destilación - Corazón', 'Destilación - Cola', 'Envejecimiento'];
            let opciones = '';
            fases.forEach(f => opciones += `<option value="${f}" ${lote.estado === f ? 'selected' : ''}>${f}</option>`);

            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 font-mono text-xs font-bold text-slate-500">${lote.id.slice(0, 6)}</td>
                    <td class="p-4 font-semibold">${lote.materia_prima?.nombre || 'N/A'} <span class="text-xs font-normal block text-slate-400">Usado: ${lote.cantidad_usada} L</span></td>
                    <td class="p-4">
                        <select onchange="actualizarFaseLote('${lote.id}', this.value)" class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg block w-full p-2 outline-none font-semibold focus:ring-amber-500">
                            ${opciones}
                        </select>
                    </td>
                </tr>
            `;
        }
        if(selectCalidad) selectCalidad.innerHTML += `<option value="${lote.id}">Lote #${lote.id.slice(0, 6)} - ${lote.materia_prima?.nombre}</option>`;
    });
}

// Función global para actualizar la fase desde el Select de Producción
window.actualizarFaseLote = async (id, nuevaFase) => {
    const { error } = await supabase.from('lotes').update({ estado: nuevaFase }).eq('id', id);
    if(error) alert('Error actualizando fase');
}

document.getElementById('form-lote')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const materia_id = document.getElementById('lote-materia').value, cantidad_usada = parseFloat(document.getElementById('lote-cantidad').value);
    const insumo = inventarioBodega.find(i => i.id === materia_id);
    if (!insumo || cantidad_usada > insumo.cantidad) return alert('Stock insuficiente');
    
    await supabase.from('lotes').insert([{ materia_id, cantidad_usada, estado: 'Fermentación' }]);
    await supabase.from('materia_prima').update({ cantidad: insumo.cantidad - cantidad_usada }).eq('id', materia_id);
    e.target.reset(); cargarBodega(); cargarLotes();
});

// ==========================================
// 6. MÓDULO CALIDAD (Agregado Respaldos)
// ==========================================
async function cargarCalidad() {
    const { data, error } = await supabase.from('control_calidad').select('*, lotes(id, materia_prima(nombre))');
    if (error) return;
    const tbody = document.getElementById('tbl-calidad');
    if(tbody) tbody.innerHTML = '';
    data.forEach(qc => {
        const badge = qc.aprobado ? '<span class="px-2 py-1 bg-emerald-100 text-emerald-700 font-bold rounded text-xs">Aprobado</span>' : '<span class="px-2 py-1 bg-rose-100 text-rose-700 font-bold rounded text-xs">Rechazado</span>';
        if(tbody) {
            tbody.innerHTML += `
                <tr class="hover:bg-slate-50">
                    <td class="p-4 font-mono text-xs font-bold text-slate-500">LT-${qc.lote_id ? qc.lote_id.slice(0, 4) : 'N/A'}</td>
                    <td class="p-4 text-sm"><span class="font-bold">${qc.abv}% ABV</span><br><span class="text-slate-500">${qc.ph} pH</span></td>
                    <td class="p-4">${badge}</td>
                    <td class="p-4 text-xs">
                        <a href="#" class="text-emerald-600 font-bold hover:underline flex items-center gap-1">📄 Ver PDF</a>
                    </td>
                </tr>
            `;
        }
    });
}
document.getElementById('form-calidad')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lote_id = document.getElementById('calidad-lote').value, abv = parseFloat(document.getElementById('calidad-abv').value), ph = parseFloat(document.getElementById('calidad-ph').value), aprobado = document.getElementById('calidad-veredicto').value === 'true', observaciones = document.getElementById('calidad-obs').value;
    
    // (Opcional a futuro: Aquí subirías el archivo file del input al storage de supabase y guardarías la URL)
    await supabase.from('control_calidad').insert([{ lote_id, abv, ph, aprobado, observaciones }]);
    e.target.reset(); cargarCalidad();
});

// Arrancar
document.addEventListener('DOMContentLoaded', () => verificarSesion());