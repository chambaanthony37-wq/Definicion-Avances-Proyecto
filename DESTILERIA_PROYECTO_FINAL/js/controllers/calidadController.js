import { $, renderTabla, botonesAccion, badgeEstado, idCorto, mostrarToast, confirmar } from '../utils/helpers.js';
import { calidadService } from '../services/supabaseService.js';
import { supabase } from '../config.js';

export class CalidadController {
    constructor() {
        this.data = [];
        this.editandoId = null;
        this.service = calidadService;
        this.onDataChange = null;
        this.usuarioRol = '';
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        this.obtenerRolUsuario();

        $('form-calidad')?.addEventListener('submit', this.guardar.bind(this));
        
        window.editarCalidad = this.editar.bind(this);
        window.eliminarCalidad = this.eliminar.bind(this);
        
        this.cargar();
        
        document.addEventListener('lotesActualizados', () => this.actualizarSelects());
    }

    async obtenerRolUsuario() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            const { data: userData } = await supabase
                .from('usuarios')
                .select('rol')
                .eq('id', session.user.id)
                .single();
            this.usuarioRol = userData?.rol || '';
        }
    }

    async cargar() {
        const { data } = await supabase
            .from('control_calidad')
            .select('*, lotes(id, materia_prima(nombre))')
            .order('created_at', { ascending: false });
        
        this.data = data || [];
        this.renderizar();
        this.actualizarSelects();
        if (this.onDataChange) this.onDataChange(this.data);
    }

    renderizar() {
        renderTabla('tbl-calidad', this.data, (qc) => `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-mono text-xs font-bold text-slate-500">LT-${idCorto(qc.lote_id)}</td>
                <td class="p-4 text-sm">
                    <span class="font-bold">${qc.abv}% ABV</span>
                    <br><span class="text-slate-500">${qc.ph} pH</span>
                </td>
                <td class="p-4">${badgeEstado(qc.aprobado)}</td>
                <td class="p-4 text-xs">${qc.observaciones || '-'}</td>
                <td class="p-4 text-xs">${qc.categoria_anomalia || '-'}</td>
                <td class="p-4 space-x-2">
                    ${botonesAccion(qc.id, 'editarCalidad', 'eliminarCalidad')}
                </td>
            </tr>
        `);
    }

    actualizarSelects() {
        // No es necesario, ya se actualiza desde lotesController
    }

    async guardar(e) {
        e.preventDefault();
        
        // RN04: Solo Inspector de Calidad puede aprobar/rechazar
        if (this.usuarioRol !== 'Inspector de Calidad' && this.usuarioRol !== 'Administrador') {
            mostrarToast('Solo el Inspector de Calidad puede realizar evaluaciones.', 'error', '⛔ Sin permiso');
            return;
        }

        const aprobado = $('calidad-veredicto').value === 'true';
        const observaciones = $('calidad-obs').value.trim();
        const categoria = $('calidad-categoria').value;

        // RN06: Si rechazo, obligar a justificación y categoría
        if (!aprobado) {
            if (!observaciones) {
                mostrarToast('Debes ingresar una justificación técnica para el rechazo.', 'warning', '⚠️ Justificación requerida');
                return;
            }
            if (!categoria) {
                mostrarToast('Debes seleccionar una categoría de anomalía.', 'warning', '⚠️ Categoría requerida');
                return;
            }
        }

        const datos = {
            lote_id: $('calidad-lote').value,
            abv: parseFloat($('calidad-abv').value),
            ph: parseFloat($('calidad-ph').value),
            aprobado: aprobado,
            observaciones: observaciones,
            categoria_anomalia: categoria || null
        };

        if (!datos.lote_id) {
            mostrarToast('Seleccione un lote para evaluar', 'warning', '⚠️ Lote requerido');
            return;
        }

        try {
            await this.service.save(datos, this.editandoId);
            
            const esEdicion = !!this.editandoId;
            this.editandoId = null;
            $('btn-guardar-calidad').innerText = 'Registrar Prueba y Evaluación';
            $('titulo-form-calidad').innerText = 'Evaluar Lote';
            e.target.reset();
            $('calidad-veredicto').value = 'true';
            $('calidad-categoria').value = '';
            
            await this.cargar();
            
            const estado = datos.aprobado ? 'APROBADO ✅' : 'RECHAZADO ❌';
            mostrarToast(
                esEdicion ? `Evaluación actualizada: ${estado}` : `Prueba registrada: ${estado}`,
                datos.aprobado ? 'success' : 'warning',
                esEdicion ? '✅ Actualizado' : 'Registrado'
            );
        } catch (error) {
            mostrarToast('Error: ' + error.message, 'error', '❌ Error');
        }
    }

    editar(id) {
        const qc = this.data.find(q => q.id === id);
        if (!qc) return;

        this.editandoId = id;
        $('calidad-lote').value = qc.lote_id;
        $('calidad-abv').value = qc.abv;
        $('calidad-ph').value = qc.ph;
        $('calidad-veredicto').value = qc.aprobado ? 'true' : 'false';
        $('calidad-obs').value = qc.observaciones || '';
        $('calidad-categoria').value = qc.categoria_anomalia || '';
        $('btn-guardar-calidad').innerText = 'Actualizar Evaluación';
        $('titulo-form-calidad').innerText = 'Editar Evaluación';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarToast('Editando evaluación', 'info', 'Editando');
    }

    async eliminar(id) {
        const confirmed = await confirmar(
            '¿Estás seguro de eliminar esta evaluación de calidad?',
            '🗑️ Eliminar Evaluación',
            'danger'
        );
        
        if (!confirmed) return;
        
        try {
            await this.service.delete(id);
            await this.cargar();
            mostrarToast('Evaluación eliminada correctamente', 'success', 'Eliminado');
        } catch (error) {
            mostrarToast('Error al eliminar: ' + error.message, 'error', '❌ Error');
        }
    }
}