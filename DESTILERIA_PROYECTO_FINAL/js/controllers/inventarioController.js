import { $, renderTabla, estadoInventario, idCorto, litrosABotellas, mostrarToast, confirmar } from '../utils/helpers.js';
import { supabase } from '../config.js';
import { alertasService } from '../services/supabaseService.js';

export class InventarioController {
    constructor() {
        this.data = [];
        this.onDataChange = null;
        this.mensajesController = null;
    }

    init(onDataChange, mensajesController) {
        this.onDataChange = onDataChange;
        this.mensajesController = mensajesController;
        $('btn-alerta-reorden')?.addEventListener('click', this.mostrarModalAlertas.bind(this));
        document.addEventListener('loteFinalizado', () => this.cargar());
        document.addEventListener('lotesActualizados', () => this.cargar());
        this.cargar();
    }

    async cargar() {
        try {
            const { data, error } = await supabase
                .from('lotes')
                .select('*, materia_prima(nombre)')
                .eq('estado', 'Finalizado');
            if (error) throw error;
            this.data = data || [];
            this.renderizar();
            if (this.onDataChange) this.onDataChange(this.data);
        } catch (error) {
            console.error('Error cargando inventario:', error);
            mostrarToast('Error al cargar inventario: ' + error.message, 'error', '❌ Error');
        }
    }

    renderizar() {
        const tbody = $('tbl-inventario-final');
        if (!tbody) return;
        if (this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-8 text-center text-slate-500">No hay producto terminado.</td></tr>`;
            return;
        }
        tbody.innerHTML = this.data.map(lote => {
            const nombreProducto = lote.materia_prima?.nombre || 'Producto General';
            const litrosProducidos = (lote.cantidad_usada || lote.cantidad || 0) * 0.8;
            const botellas = litrosABotellas(litrosProducidos);
            const enAlerta = botellas < 50;
            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100 ${enAlerta ? 'bg-rose-50' : ''}">
                    <td class="p-4 font-mono font-bold text-slate-600">LT-${idCorto(lote.id)}</td>
                    <td class="p-4">${nombreProducto}</td>
                    <td class="p-4 font-bold text-slate-800">${botellas} unidades</td>
                    <td class="p-4">${estadoInventario(botellas)}</td>
                </tr>
            `;
        }).join('');
    }

    mostrarModalAlertas() {
        const modalExistente = document.getElementById('modal-alertas');
        if (modalExistente) {
            this.cerrarModalAlertas(modalExistente);
            setTimeout(() => this.mostrarModalAlertas(), 300);
            return;
        }

        const productosAlerta = this.data.filter(lote => {
            const litros = (lote.cantidad_usada || lote.cantidad || 0) * 0.8;
            return litrosABotellas(litros) < 50;
        });

        if (productosAlerta.length === 0) {
            mostrarToast('No hay productos en alerta de reorden', 'info', 'ℹ️ Sin alertas');
            return;
        }

        const overlay = document.createElement('div');
        overlay.className = 'modal-overlay';
        overlay.id = 'modal-alertas';

        const productosHTML = productosAlerta.map((lote, index) => {
            const litros = (lote.cantidad_usada || lote.cantidad || 0) * 0.8;
            const botellas = litrosABotellas(litros);
            const nombre = lote.materia_prima?.nombre || 'Producto General';
            const checked = index === 0 ? 'checked' : '';
            return `
                <div class="flex items-center gap-3 p-3 hover:bg-slate-50 rounded-lg border border-slate-100">
                    <input type="checkbox" id="alerta-${lote.id}" value="${lote.id}" ${checked} class="w-4 h-4 text-emerald-600 rounded">
                    <label for="alerta-${lote.id}" class="flex-1 cursor-pointer">
                        <div class="font-semibold text-slate-800">${nombre}</div>
                        <div class="text-sm text-slate-500">Lote: LT-${idCorto(lote.id)} | Botellas: ${botellas} <span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full ml-2">⚠️ Alerta</span></div>
                    </label>
                </div>
            `;
        }).join('');

        overlay.innerHTML = `
            <div class="modal-confirm max-w-2xl">
                <div class="modal-icon warning">⚠️</div>
                <div class="modal-title">Seleccionar Alertas de Reorden</div>
                <div class="modal-message text-left">
                    <p class="mb-3">Selecciona los productos en alerta para notificar al <strong>Jefe de Bodega</strong>:</p>
                    <div class="space-y-2 max-h-[300px] overflow-y-auto">${productosHTML}</div>
                    <div class="mt-3 flex items-center gap-3 p-2 bg-slate-50 rounded-lg">
                        <input type="checkbox" id="seleccionar-todos" class="w-4 h-4 text-emerald-600 rounded">
                        <label for="seleccionar-todos" class="text-sm font-semibold text-slate-600 cursor-pointer">Seleccionar todos</label>
                    </div>
                </div>
                <div class="modal-actions">
                    <button class="modal-btn modal-btn-cancel" id="modal-cancelar-alertas">Cancelar</button>
                    <button class="modal-btn modal-btn-danger" id="modal-enviar-alertas">📨 Enviar Alertas</button>
                </div>
            </div>
        `;

        document.body.appendChild(overlay);
        void overlay.offsetHeight;
        overlay.classList.add('active');

        overlay.querySelector('#seleccionar-todos')?.addEventListener('change', (e) => {
            overlay.querySelectorAll('input[type="checkbox"][value]').forEach(cb => cb.checked = e.target.checked);
        });

        overlay.querySelector('#modal-cancelar-alertas')?.addEventListener('click', () => this.cerrarModalAlertas(overlay));
        overlay.querySelector('#modal-enviar-alertas')?.addEventListener('click', () => this.enviarAlertasSeleccionadas(overlay, productosAlerta));
        overlay.addEventListener('click', (e) => { if (e.target === overlay) this.cerrarModalAlertas(overlay); });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') { this.cerrarModalAlertas(overlay); document.removeEventListener('keydown', arguments.callee); }
        });
    }

    cerrarModalAlertas(overlay) {
        if (!overlay) return;
        overlay.classList.remove('active');
        setTimeout(() => { if (overlay.parentNode) overlay.remove(); }, 300);
    }

    async enviarAlertasSeleccionadas(overlay, productosAlerta) {
        const btn = overlay.querySelector('#modal-enviar-alertas');
        btn.disabled = true;
        btn.textContent = '⏳ Enviando...';

        try {
            const checkboxes = overlay.querySelectorAll('input[type="checkbox"][value]:checked');
            const ids = Array.from(checkboxes).map(cb => cb.value);
            if (ids.length === 0) {
                mostrarToast('Selecciona al menos un producto', 'warning', '⚠️ Sin selección');
                return;
            }

            const seleccionados = productosAlerta.filter(lote => ids.includes(lote.id));

            const { data: { session } } = await supabase.auth.getSession();
            let remitenteEmail = 'Sistema', remitenteNombre = 'Sistema';
            if (session) {
                const { data: userData } = await supabase
                    .from('usuarios')
                    .select('email, rol')
                    .eq('id', session.user.id)
                    .single();
                remitenteEmail = userData?.email || 'Sistema';
                remitenteNombre = userData?.rol || 'Sistema';
            }

            const detalle = seleccionados.map(lote => {
                const litros = (lote.cantidad_usada || lote.cantidad || 0) * 0.8;
                const botellas = litrosABotellas(litros);
                return `  • ${lote.materia_prima?.nombre || 'Producto'} (LT-${idCorto(lote.id)}) - ${botellas} botellas`;
            }).join('\n');

            const mensajeCompleto = `ALERTA DE REORDEN - INVENTARIO BAJO\n\nLos siguientes productos están por debajo del nivel mínimo (50 botellas):\n\n${detalle}\n\n📊 Total: ${seleccionados.length} productos.\n📅 Fecha: ${new Date().toLocaleString()}\n\n⚠️ Se requiere reorden urgente.\n\n📨 Generado por: ${remitenteNombre} (${remitenteEmail})`;

            // Guardar en alertas_reorden
            for (const lote of seleccionados) {
                await alertasService.save({
                    producto: lote.materia_prima?.nombre || 'Producto General',
                    cantidad_actual: Math.floor((lote.cantidad_usada || lote.cantidad || 0) * 0.8 * 1.333),
                    umbral_minimo: 50,
                    estado: 'Activa'
                }).catch(err => console.error('Error guardando alerta:', err));
            }

            if (this.mensajesController) {
                const enviado = await this.mensajesController.enviarAlerta(
                    `🚨 ALERTA DE REORDEN - ${seleccionados.length} productos`,
                    mensajeCompleto,
                    remitenteEmail
                );
                if (enviado) {
                    mostrarToast(`Alertas enviadas (${seleccionados.length} productos)`, 'success', '🔔 Alertas emitidas');
                } else {
                    mostrarToast('Error o mensaje duplicado', 'error', '❌ Error');
                }
            } else {
                // Fallback directo
                await supabase.from('mensajes').insert([{
                    titulo: `ALERTA DE REORDEN - ${seleccionados.length} productos`,
                    mensaje: mensajeCompleto,
                    tipo: 'alerta',
                    remitente_email: remitenteEmail,
                    destinatario_rol: 'Jefe de Bodega',
                    leido: false,
                    fecha_creacion: new Date().toISOString()
                }]);
                mostrarToast('Alertas guardadas', 'success', '✅ Guardado');
            }

            this.cerrarModalAlertas(overlay);
            await this.cargar();
        } catch (error) {
            console.error('Error enviando alertas:', error);
            mostrarToast('Error: ' + error.message, 'error', '❌ Error');
        } finally {
            btn.disabled = false;
            btn.textContent = '📨 Enviar Alertas';
        }
    }
}