export let proveedoresData = [
    { id: 1, nombre: 'Licores del Ecuador S.A.', ruc: '1790000000001', contacto: '0991234567' }
];

export function initProveedores() {
    const form = document.getElementById('form-prov');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nuevoProv = {
            id: Date.now(),
            nombre: document.getElementById('p-nombre').value,
            ruc: document.getElementById('p-ruc').value,
            contacto: document.getElementById('p-contacto').value
        };
        proveedoresData.push(nuevoProv);
        form.reset();
        renderProveedores();
        
        // Actualizar select en bodega
        document.dispatchEvent(new CustomEvent('proveedoresActualizados'));
    });

    renderProveedores();
}

export function renderProveedores() {
    const tbody = document.getElementById('tbl-proveedores');
    if (!tbody) return;

    tbody.innerHTML = proveedoresData.map(p => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-semibold text-slate-800">${p.nombre}</td>
            <td class="p-4">${p.ruc}</td>
            <td class="p-4">${p.contacto}</td>
            <td class="p-4 text-center">
                <button onclick="window.eliminarProveedor(${p.id})" class="text-rose-600 hover:text-rose-800 font-bold">Eliminar</button>
            </td>
        </tr>
    `).join('');
}

window.eliminarProveedor = (id) => {
    proveedoresData = proveedoresData.filter(p => p.id !== id);
    renderProveedores();
    document.dispatchEvent(new CustomEvent('proveedoresActualizados'));
};