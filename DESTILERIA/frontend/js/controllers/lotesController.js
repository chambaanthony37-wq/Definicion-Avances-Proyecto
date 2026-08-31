import { bodegaData, renderBodega } from './materiaPrimaController.js';

export let lotesData = [
    { id: 'LOT-101', materiaId: 1, cantidad: 100, estado: 'En Procesamiento' }
];

export function initLotes() {
    const form = document.getElementById('form-lote');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        const materiaId = Number(document.getElementById('lote-materia').value);
        const cantidad = Number(document.getElementById('lote-cantidad').value);

        const itemBodega = bodegaData.find(b => b.id === materiaId);
        if (!itemBodega || itemBodega.cantidad < cantidad) {
            alert('⚠️ Stock insuficiente en bodega para iniciar este lote.');
            return;
        }

        // Descontar de la bodega
        itemBodega.cantidad -= cantidad;
        renderBodega();

        lotesData.push({
            id: `LOT-${Math.floor(100 + Math.random() * 900)}`,
            materiaId,
            cantidad,
            estado: 'En Destilado'
        });

        form.reset();
        renderLotes();
        document.dispatchEvent(new CustomEvent('lotesActualizados'));
    });

    document.addEventListener('bodegaActualizada', renderSelectMateria);
    renderSelectMateria();
    renderLotes();
}

function renderSelectMateria() {
    const select = document.getElementById('lote-materia');
    if (!select) return;
    select.innerHTML = bodegaData.map(b => `<option value="${b.id}">${b.insumo} (${b.cantidad} ${b.unidad} disp.)</option>`).join('');
}

export function renderLotes() {
    const tbody = document.getElementById('tbl-lotes');
    if (!tbody) return;

    tbody.innerHTML = lotesData.map(l => {
        const item = bodegaData.find(b => b.id === l.materiaId);
        return `
            <tr class="hover:bg-slate-50">
                <td class="p-4 font-bold text-slate-700">${l.id}</td>
                <td class="p-4">${item ? item.insumo : 'Desconocido'}</td>
                <td class="p-4">${l.cantidad}</td>
                <td class="p-4"><span class="px-3 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-bold">${l.estado}</span></td>
            </tr>
        `;
    }).join('');
}