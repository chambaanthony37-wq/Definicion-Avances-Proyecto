import { lotesData } from './lotesController.js';

export let calidadData = [];

export function initCalidad() {
    const form = document.getElementById('form-calidad');
    if (!form) return;

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        calidadData.push({
            loteId: document.getElementById('calidad-lote').value,
            abv: parseFloat(document.getElementById('calidad-abv').value),
            ph: parseFloat(document.getElementById('calidad-ph').value),
            aprobado: document.getElementById('calidad-veredicto').value === 'true',
            obs: document.getElementById('calidad-obs').value
        });

        form.reset();
        renderCalidad();
    });

    document.addEventListener('lotesActualizados', renderSelectLotes);
    renderSelectLotes();
    renderCalidad();
}

function renderSelectLotes() {
    const select = document.getElementById('calidad-lote');
    if (!select) return;
    select.innerHTML = lotesData.map(l => `<option value="${l.id}">${l.id}</option>`).join('');
}

export function renderCalidad() {
    const tbody = document.getElementById('tbl-calidad');
    if (!tbody) return;

    tbody.innerHTML = calidadData.map(c => `
        <tr class="hover:bg-slate-50">
            <td class="p-4 font-bold">${c.loteId}</td>
            <td class="p-4">${c.abv}%</td>
            <td class="p-4">${c.ph}</td>
            <td class="p-4">
                <span class="px-3 py-1 rounded-full text-xs font-bold ${c.aprobado ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                    ${c.aprobado ? 'CONFORME' : 'RECHAZADO'}
                </span>
            </td>
            <td class="p-4 text-slate-500 text-sm">${c.obs || '-'}</td>
        </tr>
    `).join('');
}