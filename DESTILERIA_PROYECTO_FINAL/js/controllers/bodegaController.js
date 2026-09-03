import { $, renderTabla, botonesAccion, galonesALitros, mostrarToast, confirmar } from '../utils/helpers.js';
import { bodegaService } from '../services/supabaseService.js';
import { supabase } from '../config.js';

export class BodegaController {
    constructor() {
        this.data = [];
        this.editandoId = null;
        this.service = bodegaService;
        this.onDataChange = null;
        this.proveedores = [];
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        // Conversión galones → litros
        $('mp-galones')?.addEventListener('input', (e) => {
            const galones = parseFloat(e.target.value);
            $('mp-cantidad').value = (!isNaN(galones) && galones > 0) 
                ? galonesALitros(galones) 
                : '';
        });

        // Evento para cargar insumos al cambiar proveedor
        $('mp-proveedor')?.addEventListener('change', (e) => {
            const proveedorId = e.target.value;
            this.cargarInsumos(proveedorId);
        });

        $('form-mp')?.addEventListener('submit', this.guardar.bind(this));
        
        window.editarBodega = this.editar.bind(this);
        window.eliminarBodega = this.eliminar.bind(this);
        
        this.cargar();
    }

    // ===========================================
    //  CARGA DATOS Y RENDERIZADO
    // ===========================================
    async cargar() {
        // Obtener materia prima con relación a proveedores
        const { data } = await supabase
            .from('materia_prima')
            .select('*, proveedores(nombre, homologado, producto)')
            .order('created_at', { ascending: false });
        
        this.data = data || [];
        this.renderizar();
        this.actualizarSelects();
        if (this.onDataChange) this.onDataChange(this.data);
    }

    renderizar() {
        renderTabla('tbl-bodega', this.data, (item) => `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-semibold">${item.nombre}</td>
                <td class="p-4">${item.proveedores?.nombre || 'N/A'}</td>
                <td class="p-4">
                    <span class="px-3 py-1 bg-emerald-100 text-emerald-800 rounded-full font-bold text-sm">
                        ${item.cantidad} ${item.unidad || 'L'}
                    </span>
                </td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-bold ${item.estado === 'Aprobado' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}">
                        ${item.estado || 'Aprobado'}
                    </span>
                </td>
                <td class="p-4 space-x-2">
                    ${botonesAccion(item.id, 'editarBodega', 'eliminarBodega')}
                </td>
            </tr>
        `);
    }

    // ===========================================
    //  SELECTS: PROVEEDORES E INSUMOS
    // ===========================================
    actualizarSelects() {
        // 1. Cargar proveedores homologados
        this.cargarProveedores();
        // 2. Si hay un proveedor seleccionado, cargar sus insumos (productos)
        const proveedorSeleccionado = $('mp-proveedor').value;
        if (proveedorSeleccionado) {
            this.cargarInsumos(proveedorSeleccionado);
        } else {
            // Limpiar select de insumos
            const selectInsumo = $('mp-nombre');
            selectInsumo.innerHTML = '<option value="">Seleccione insumo</option>';
        }

        // 3. Actualizar select de lotes (materia prima disponible)
        this.actualizarSelectLotes();
    }

    async cargarProveedores() {
        const { data: proveedores, error } = await supabase
            .from('proveedores')
            .select('id, nombre, homologado, producto')
            .eq('homologado', true)
            .order('nombre');

        if (error) {
            console.error('Error cargando proveedores:', error);
            return;
        }

        this.proveedores = proveedores || [];
        const selectProveedor = $('mp-proveedor');
        const valorActual = selectProveedor.value;
        selectProveedor.innerHTML = '<option value="">Seleccione proveedor</option>';
        this.proveedores.forEach(p => {
            selectProveedor.innerHTML += `<option value="${p.id}">${p.nombre}</option>`;
        });
        // Restaurar selección si existía
        if (valorActual) selectProveedor.value = valorActual;
    }

    // Carga los insumos (productos) del proveedor seleccionado
    async cargarInsumos(proveedorId) {
        const selectInsumo = $('mp-nombre');
        if (!proveedorId) {
            selectInsumo.innerHTML = '<option value="">Seleccione insumo</option>';
            return;
        }

        // Buscar el proveedor en la lista
        const proveedor = this.proveedores.find(p => p.id === proveedorId);
        if (!proveedor) {
            selectInsumo.innerHTML = '<option value="">Seleccione insumo</option>';
            return;
        }

        // Usar el producto del proveedor como única opción
        const producto = proveedor.producto || '';
        const valorActual = selectInsumo.value;
        selectInsumo.innerHTML = '<option value="">Seleccione insumo</option>';
        if (producto) {
            selectInsumo.innerHTML += `<option value="${producto}">${producto}</option>`;
            // Si el valor actual coincide, seleccionarlo
            if (valorActual === producto) {
                selectInsumo.value = producto;
            }
        }
    }

    // Select de materia prima para la vista de lotes
    actualizarSelectLotes() {
        const select = $('lote-materia');
        if (!select) return;

        // Solo insumos con stock > 0 y estado 'Aprobado'
        const disponibles = this.data.filter(item => 
            item.cantidad > 0 && item.estado === 'Aprobado'
        );
        select.innerHTML = '<option value="">Seleccione insumo</option>';
        select.innerHTML += disponibles.map(item => 
            `<option value="${item.id}">${item.nombre} (Disp: ${item.cantidad} L)</option>`
        ).join('');
    }

    // ===========================================
    //  GUARDAR (CREAR / ACTUALIZAR)
    // ===========================================
    async guardar(e) {
        e.preventDefault();
        const galones = parseFloat($('mp-galones').value) || 0;
        const cantidad = parseFloat(galonesALitros(galones));
        const proveedorId = $('mp-proveedor').value;
        const nombreInsumo = $('mp-nombre').value;

        if (!proveedorId || !nombreInsumo || !cantidad) {
            mostrarToast('Complete todos los campos', 'warning');
            return;
        }

        // Validar que el proveedor esté homologado
        const proveedor = this.proveedores.find(p => p.id === proveedorId);
        if (!proveedor || proveedor.homologado === false) {
            mostrarToast('El proveedor no está homologado. No se puede registrar.', 'error', '❌ Proveedor no válido');
            return;
        }

        const datos = {
            nombre: nombreInsumo,
            proveedor_id: proveedorId,
            cantidad: cantidad,
            unidad: 'Litros',
            estado: $('mp-estado').value // 'Aprobado' o 'Rechazado'
        };

        try {
            await this.service.save(datos, this.editandoId);
            
            const esEdicion = !!this.editandoId;
            this.editandoId = null;
            $('btn-guardar-mp').innerText = 'Registrar Stock';
            $('titulo-form-mp').innerText = 'Ingresar Materia Prima';
            e.target.reset();
            $('mp-cantidad').value = '';
            $('mp-estado').value = 'Aprobado';
            // Limpiar selects
            $('mp-proveedor').value = '';
            $('mp-nombre').innerHTML = '<option value="">Seleccione insumo</option>';
            
            await this.cargar();
            
            mostrarToast(
                esEdicion ? 'Stock actualizado correctamente' : 'Materia prima registrada',
                'success',
                esEdicion ? '✅ Actualizado' : '✅ Registrado'
            );
        } catch (error) {
            mostrarToast('Error: ' + error.message, 'error', '❌ Error');
        }
    }

    // ===========================================
    //  EDICIÓN
    // ===========================================
    editar(id) {
        const item = this.data.find(i => i.id === id);
        if (!item) return;

        this.editandoId = id;
        // Primero seleccionar proveedor
        $('mp-proveedor').value = item.proveedor_id;
        // Luego cargar insumos (producto del proveedor)
        this.cargarInsumos(item.proveedor_id).then(() => {
            // Finalmente seleccionar el insumo (que debería ser el producto)
            $('mp-nombre').value = item.nombre;
        });
        $('mp-galones').value = (item.cantidad / 3.78541).toFixed(2);
        $('mp-cantidad').value = item.cantidad;
        $('mp-estado').value = item.estado || 'Aprobado';
        $('btn-guardar-mp').innerText = 'Actualizar';
        $('titulo-form-mp').innerText = 'Editar Materia Prima';
        
        window.scrollTo({ top: 0, behavior: 'smooth' });
        mostrarToast('Editando: ' + item.nombre, 'info', 'Editando');
    }

    // ===========================================
    //  ELIMINAR
    // ===========================================
    async eliminar(id) {
        const confirmed = await confirmar(
            '¿Estás seguro de eliminar este registro de materia prima?',
            'Eliminar Registro',
            'danger'
        );
        
        if (!confirmed) return;
        
        try {
            await this.service.delete(id);
            await this.cargar();
            mostrarToast('Registro eliminado correctamente', 'success', '🗑️ Eliminado');
        } catch (error) {
            mostrarToast('Error al eliminar: ' + error.message, 'error', '❌ Error');
        }
    }

    // ===========================================
    //  UTILIDAD PARA OBTENER INSUMO (usado en lotes)
    // ===========================================
    getInsumo(id) {
        return this.data.find(i => i.id === id);
    }
}