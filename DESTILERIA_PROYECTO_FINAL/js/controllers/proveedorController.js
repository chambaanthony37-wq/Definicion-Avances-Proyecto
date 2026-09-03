import { $, renderTabla, botonesAccion, actualizarSelect, mostrarToast, confirmar } from '../utils/helpers.js';
import { proveedorService } from '../services/supabaseService.js';

export class ProveedorController {
    constructor() {
        this.data = [];
        this.editandoId = null;
        this.service = proveedorService;
        this.onDataChange = null;
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        $('form-prov')?.addEventListener('submit', this.guardar.bind(this));
        
        window.editarProveedor = this.editar.bind(this);
        window.eliminarProveedor = this.eliminar.bind(this);
        
        this.cargar();
    }

    async cargar() {
        this.data = await this.service.getAll();
        this.renderizar();
        this.actualizarSelects();
        if (this.onDataChange) this.onDataChange(this.data);
    }

    renderizar() {
        renderTabla('tbl-proveedores', this.data, (p) => `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-semibold text-slate-800">${p.nombre}</td>
                <td class="p-4">${p.producto || '-'}</td>
                <td class="p-4">${p.contacto || '-'}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-bold ${p.homologado ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">
                        ${p.homologado ? '✅ Homologado' : '❌ No homologado'}
                    </span>
                </td>
                <td class="p-4 space-x-2">
                    ${botonesAccion(p.id, 'editarProveedor', 'eliminarProveedor')}
                </td>
            </tr>
        `);
    }

    actualizarSelects() {
        // Solo proveedores homologados
        const homologados = this.data.filter(p => p.homologado !== false);
        actualizarSelect('mp-proveedor', homologados, 'id', 'nombre', 'Seleccione proveedor');
    }

    async guardar(e) {
        e.preventDefault();
        const homologado = $('p-homologado')?.checked ?? true;
        const datos = {
            nombre: $('p-nombre').value,
            producto: $('p-ruc').value,
            contacto: $('p-contacto').value,
            homologado: homologado
        };

        try {
            await this.service.save(datos, this.editandoId);
            
            const esEdicion = !!this.editandoId;
            this.editandoId = null;
            $('btn-guardar-proveedor').innerText = 'Guardar';
            $('titulo-form-prov').innerText = 'Nuevo Proveedor';
            e.target.reset();
            $('p-homologado').checked = true;
            
            await this.cargar();
            
            mostrarToast(
                esEdicion ? 'Proveedor actualizado correctamente' : 'Proveedor registrado exitosamente',
                'success',
                esEdicion ? '✅ Actualizado' : '✅ Registrado'
            );
        } catch (error) {
            mostrarToast('Error al guardar: ' + error.message, 'error', '❌ Error');
        }
    }

    editar(id) {
        const proveedor = this.data.find(p => p.id === id);
        if (!proveedor) return;

        this.editandoId = id;
        $('p-nombre').value = proveedor.nombre;
        $('p-ruc').value = proveedor.producto || '';
        $('p-contacto').value = proveedor.contacto || '';
        $('p-homologado').checked = proveedor.homologado !== false;
        $('btn-guardar-proveedor').innerText = 'Actualizar';
        $('titulo-form-prov').innerText = 'Editar Proveedor';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarToast('Editando proveedor: ' + proveedor.nombre, 'info', 'Editando');
    }

    async eliminar(id) {
        const confirmed = await confirmar(
            '¿Estás seguro de eliminar este proveedor? Esta acción no se puede deshacer.',
            'Eliminar Proveedor',
            'danger'
        );
        
        if (!confirmed) return;
        
        try {
            await this.service.delete(id);
            await this.cargar();
            mostrarToast('Proveedor eliminado correctamente', 'success', '🗑️ Eliminado');
        } catch (error) {
            mostrarToast('Error al eliminar: ' + error.message, 'error', '❌ Error');
        }
    }
}