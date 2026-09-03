import { $, renderTabla, botonesAccion, FASES, idCorto, mostrarToast, confirmar } from '../utils/helpers.js';
import { lotesService } from '../services/supabaseService.js';
import { supabase } from '../config.js';

export class LotesController {
    constructor(bodegaController) {
        this.data = [];
        this.editandoId = null;
        this.service = lotesService;
        this.bodegaController = bodegaController;
        this.onDataChange = null;
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        $('form-lote')?.addEventListener('submit', this.guardar.bind(this));
        
        window.actualizarFaseLote = this.actualizarFase.bind(this);
        window.editarLote = this.editar.bind(this);
        window.eliminarLote = this.eliminar.bind(this);
        
        this.cargar();
    }

    async cargar() {
        const { data } = await supabase
            .from('lotes')
            .select('*, materia_prima(nombre, estado)')
            .order('created_at', { ascending: false });
        
        this.data = data || [];
        this.renderizar();
        this.actualizarSelects();
        if (this.onDataChange) this.onDataChange(this.data);
    }

    renderizar() {
        renderTabla('tbl-lotes', this.data, (lote) => {
            const opciones = FASES.map(f => 
                `<option value="${f}" ${lote.estado === f ? 'selected' : ''}>${f}</option>`
            ).join('');

            return `
                <tr class="hover:bg-slate-50 border-b border-slate-100">
                    <td class="p-4 font-mono text-xs font-bold text-slate-500">${idCorto(lote.id)}</td>
                    <td class="p-4 font-semibold">
                        ${lote.materia_prima?.nombre || 'N/A'} 
                        <span class="text-xs font-normal block text-slate-400">Usado: ${lote.cantidad_usada || lote.cantidad} L</span>
                    </td>
                    <td class="p-4">
                        <select onchange="window.actualizarFaseLote('${lote.id}', this.value)" 
                                class="bg-amber-50 border border-amber-200 text-amber-800 text-sm rounded-lg block w-full p-2 outline-none font-semibold focus:ring-amber-500">
                            ${opciones}
                        </select>
                    </td>
                    <td class="p-4 space-x-2">
                        ${botonesAccion(lote.id, 'editarLote', 'eliminarLote')}
                    </td>
                </tr>
            `;
        });
    }

    actualizarSelects() {
        const select = $('calidad-lote');
        if (select && this.data) {
            select.innerHTML = '<option value="">Seleccione lote a evaluar...</option>';
            select.innerHTML += this.data.map(lote => 
                `<option value="${lote.id}">Lote #${idCorto(lote.id)} - ${lote.materia_prima?.nombre || 'Sin insumo'}</option>`
            ).join('');
        }
    }

    async guardar(e) {
        e.preventDefault();
        const materia_id = $('lote-materia').value;
        const cantidad_usada = parseFloat($('lote-cantidad').value);

        if (!materia_id || !cantidad_usada) {
            mostrarToast('Complete todos los campos', 'warning', '⚠️ Campos incompletos');
            return;
        }

        const insumo = this.bodegaController.getInsumo(materia_id);
        if (!insumo) {
            mostrarToast('Insumo no encontrado', 'error', '❌ Error');
            return;
        }

        // RN01: Validar estado Aprobado
        if (insumo.estado !== 'Aprobado') {
            mostrarToast('La materia prima no está en estado "Aprobado". No se puede iniciar lote.', 'error', '⛔ Insumo no aprobado');
            return;
        }

        if (cantidad_usada > insumo.cantidad) {
            mostrarToast('Stock insuficiente en bodega', 'error', '❌ Sin stock');
            return;
        }

        try {
            if (this.editandoId) {
                await this.service.save({ materia_id, cantidad_usada }, this.editandoId);
            } else {
                await this.service.save({ materia_id, cantidad_usada, estado: 'Fermentación' });
                
                // RN03: Descuento automático
                await supabase
                    .from('materia_prima')
                    .update({ cantidad: insumo.cantidad - cantidad_usada })
                    .eq('id', materia_id);
            }
            
            const esEdicion = !!this.editandoId;
            this.editandoId = null;
            $('btn-guardar-lote').innerText = 'Iniciar Lote';
            $('titulo-form-lote').innerText = 'Iniciar Lote';
            e.target.reset();
            
            await this.bodegaController.cargar();
            await this.cargar();
            
            document.dispatchEvent(new CustomEvent('lotesActualizados'));
            
            mostrarToast(
                esEdicion ? 'Lote actualizado correctamente' : 'Lote creado exitosamente',
                'success',
                esEdicion ? '✅ Actualizado' : '✅ Lote Iniciado'
            );
        } catch (error) {
            mostrarToast('Error: ' + error.message, 'error', '❌ Error');
        }
    }

    // ==========================================
    // ACTUALIZAR FASE (con validación solo para Finalizado)
    // ==========================================
    async actualizarFase(id, nuevaFase) {
        // RN02: Solo se requiere evaluación aprobada si la nueva fase es "Finalizado"
        if (nuevaFase === 'Finalizado') {
            const { data: evaluaciones, error } = await supabase
                .from('control_calidad')
                .select('aprobado')
                .eq('lote_id', id)
                .eq('aprobado', true);
            
            if (error) {
                mostrarToast('Error al verificar evaluación de calidad', 'error', '❌ Error');
                return;
            }
            
            if (!evaluaciones || evaluaciones.length === 0) {
                mostrarToast('No se puede finalizar el lote sin una evaluación de calidad APROBADA.', 'error', '⛔ Calidad requerida');
                return;
            }
        }

        try {
            await this.service.updateField(id, 'estado', nuevaFase);
            await this.cargar();
            
            mostrarToast(`Fase actualizada a: ${nuevaFase}`, 'success', '🔄 Fase Actualizada');
            
            if (nuevaFase === 'Finalizado') {
                document.dispatchEvent(new CustomEvent('loteFinalizado'));
                mostrarToast('Lote finalizado y listo para inventario', 'success', '🏁 Lote Completado');
            }
        } catch (error) {
            mostrarToast('Error actualizando fase: ' + error.message, 'error', '❌ Error');
        }
    }

    // ==========================================
    // EDICIÓN Y ELIMINACIÓN (sin cambios)
    // ==========================================
    editar(id) {
        const lote = this.data.find(l => l.id === id);
        if (!lote) return;

        this.editandoId = id;
        $('lote-materia').value = lote.materia_id;
        $('lote-cantidad').value = lote.cantidad_usada || lote.cantidad;
        $('btn-guardar-lote').innerText = 'Actualizar Lote';
        $('titulo-form-lote').innerText = 'Editar Lote';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarToast('Editando lote', 'info', 'Editando');
    }

    async eliminar(id) {
        const confirmed = await confirmar(
            '¿Estás seguro de eliminar este lote? Se perderá todo el progreso.',
            '🗑️ Eliminar Lote',
            'danger'
        );
        
        if (!confirmed) return;
        
        try {
            await this.service.delete(id);
            await this.cargar();
            document.dispatchEvent(new CustomEvent('lotesActualizados'));
            mostrarToast('Lote eliminado correctamente', 'success', '🗑️ Eliminado');
        } catch (error) {
            mostrarToast('Error al eliminar: ' + error.message, 'error', '❌ Error');
        }
    }
}