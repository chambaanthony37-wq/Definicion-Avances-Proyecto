import { proveedoresData } from './proveedorController.js';

export let bodegaData = [
    { id: 1, insumo: 'Melaza de Caña', proveedorId: 1, cantidad: 500, unidad: 'Litros' }
];

export function initMateriaPrima() {
    const form = document.getElementById('form-mp');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const nuevoItem = {
            id: Date.now(),
            insumo: document.getElementById('mp-nombre').value,
            proveedorId: Number(document.getElementById('mp-proveedor').value),
            cantidad: Number(document.getElementById('mp-cantidad').value),
            unidad: document.getElementById('mp-unidad').value
        };
        bodegaData.push(nuevoItem);
        form.reset();
        renderBodega();
        document.dispatchEvent(new CustomEvent('bodegaActualizada'));
    });

    document.addEventListener('proveedoresActualizados', renderSelectProveedores);
    renderSelectProveedores();
    renderBodega();
}

function renderSelectProveedores() {
    const select = document.getElementById('mp-proveedor');
    if (!select) return;
    select.innerHTML = proveedoresData.map(p => `<option value="${p.id}">${p.nombre}</option>`).join('');
}

export function renderBodega() {
    const tbody = document.getElementById('tbl-bodega');
    if (!tbody) return;

    tbody.innerHTML = bodegaData.map(b => {
        const prov = proveedoresData.find(p => p.id === b.proveedorId);
        return `
            <tr class="hover:bg-slate-50">
                <td class="p-4 font-semibold">${b.insumo}</td>
                <td class="p-4">${prov ? prov.nombre : 'N/A'}</td>
                <td class="p-4"><span class="font-bold text-emerald-600">${b.cantidad}</span> ${b.unidad}</td>
            </tr>
        `;
    }).join('');
}