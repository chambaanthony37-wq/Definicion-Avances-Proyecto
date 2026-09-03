import { $, mostrarToast } from '../utils/helpers.js';
import { supabase } from '../config.js';

// ==========================================
// CONTROLADOR DE INFORMES
// ==========================================
export class InformesController {
    constructor() {
        this.data = [];
        this.onDataChange = null;
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        // Configurar fechas por defecto (últimos 30 días)
        const hoy = new Date();
        const hace30Dias = new Date();
        hace30Dias.setDate(hoy.getDate() - 30);
        
        $('informe-fecha-inicio').value = hace30Dias.toISOString().split('T')[0];
        $('informe-fecha-fin').value = hoy.toISOString().split('T')[0];
        
        $('btn-generar-informe')?.addEventListener('click', this.generarPDF.bind(this));
        $('btn-ver-preview')?.addEventListener('click', this.vistaPrevia.bind(this));
        
        
        this.mostrarMensajeInicial();
    }

    mostrarMensajeInicial() {
        const preview = $('informe-preview');
        if (preview) {
            preview.innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <span class="text-4xl block mb-4">👆</span>
                    <p class="text-lg font-semibold text-slate-600">Selecciona un tipo de informe</p>
                    <p class="text-sm">Configura los filtros y haz clic en <strong>"Vista Previa"</strong> para visualizar los datos</p>
                </div>
            `;
        }
        $('informe-registros').textContent = 'Esperando configuración...';
    }

    async obtenerDatos(tipo, fechaInicio, fechaFin) {
        let query = null;
        let titulo = '';
        let columnas = [];
        
        switch(tipo) {
            case 'completo':
                const [proveedores, bodega, lotes, calidad, inventario] = await Promise.all([
                    supabase.from('proveedores').select('*').order('created_at', { ascending: false }),
                    supabase.from('materia_prima').select('*, proveedores(nombre)').order('created_at', { ascending: false }),
                    supabase.from('lotes').select('*, materia_prima(nombre)').order('created_at', { ascending: false }),
                    supabase.from('control_calidad').select('*, lotes(id, materia_prima(nombre))').order('created_at', { ascending: false }),
                    supabase.from('lotes').select('*, materia_prima(nombre)').eq('estado', 'Finalizado').order('created_at', { ascending: false })
                ]);
                
                return {
                    tipo: 'completo',
                    titulo: 'INFORME COMPLETO DE GESTIÓN',
                    secciones: [
                        { nombre: 'Proveedores', datos: proveedores.data || [] },
                        { nombre: 'Materia Prima', datos: bodega.data || [] },
                        { nombre: 'Lotes de Producción', datos: lotes.data || [] },
                        { nombre: 'Control de Calidad', datos: calidad.data || [] },
                        { nombre: 'Inventario Final', datos: inventario.data || [] }
                    ]
                };
                
            case 'proveedores':
                query = await supabase
                    .from('proveedores')
                    .select('*')
                    .order('created_at', { ascending: false });
                return {
                    tipo: 'proveedores',
                    titulo: 'INFORME DE PROVEEDORES',
                    datos: query.data || [],
                    columnas: ['Nombre', 'Producto', 'Contacto']
                };
                
            case 'bodega':
                query = await supabase
                    .from('materia_prima')
                    .select('*, proveedores(nombre)')
                    .order('created_at', { ascending: false });
                return {
                    tipo: 'bodega',
                    titulo: 'INFORME DE MATERIA PRIMA',
                    datos: query.data || [],
                    columnas: ['Insumo', 'Proveedor', 'Cantidad', 'Unidad']
                };
                
            case 'lotes':
                query = await supabase
                    .from('lotes')
                    .select('*, materia_prima(nombre)')
                    .order('created_at', { ascending: false });
                return {
                    tipo: 'lotes',
                    titulo: 'INFORME DE LOTES DE PRODUCCIÓN',
                    datos: query.data || [],
                    columnas: ['Lote ID', 'Insumo', 'Cantidad Usada', 'Estado', 'Fecha']
                };
                
            case 'calidad':
                query = await supabase
                    .from('control_calidad')
                    .select('*, lotes(id, materia_prima(nombre))')
                    .order('created_at', { ascending: false });
                return {
                    tipo: 'calidad',
                    titulo: 'INFORME DE CONTROL DE CALIDAD',
                    datos: query.data || [],
                    columnas: ['Lote', '% ABV', 'pH', 'Evaluación', 'Observaciones']
                };
                
            case 'inventario':
                query = await supabase
                    .from('lotes')
                    .select('*, materia_prima(nombre)')
                    .eq('estado', 'Finalizado')
                    .order('created_at', { ascending: false });
                return {
                    tipo: 'inventario',
                    titulo: 'INFORME DE INVENTARIO FINAL',
                    datos: query.data || [],
                    columnas: ['Lote ID', 'Producto', 'Botellas (750ml)', 'Estado']
                };
                
            default:
                return { datos: [], titulo: 'Sin datos' };
        }
    }

    async vistaPrevia() {
        const tipo = $('informe-tipo').value;
        const fechaInicio = $('informe-fecha-inicio').value;
        const fechaFin = $('informe-fecha-fin').value;
        
        // Mostrar loading
        const preview = $('informe-preview');
        preview.innerHTML = `
            <div class="text-center py-12">
                <div class="inline-block animate-spin rounded-full h-8 w-8 border-4 border-emerald-500 border-t-transparent"></div>
                <p class="mt-4 text-slate-500">Cargando datos...</p>
            </div>
        `;
        
        try {
            const resultado = await this.obtenerDatos(tipo, fechaInicio, fechaFin);
            
            if (resultado.tipo === 'completo') {
                let html = `
                    <div class="space-y-4">
                        <div class="bg-emerald-50 p-4 rounded-xl border border-emerald-200">
                            <h4 class="font-bold text-emerald-800">Resumen General</h4>
                            <div class="grid grid-cols-3 gap-4 mt-2">
                                <div class="text-center">
                                    <div class="text-2xl font-black text-slate-800">${resultado.secciones[0].datos.length}</div>
                                    <div class="text-xs text-slate-500">Proveedores</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-black text-slate-800">${resultado.secciones[1].datos.length}</div>
                                    <div class="text-xs text-slate-500">Materia Prima</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-black text-slate-800">${resultado.secciones[2].datos.length}</div>
                                    <div class="text-xs text-slate-500">Lotes</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-black text-slate-800">${resultado.secciones[3].datos.length}</div>
                                    <div class="text-xs text-slate-500">Controles Calidad</div>
                                </div>
                                <div class="text-center">
                                    <div class="text-2xl font-black text-slate-800">${resultado.secciones[4].datos.length}</div>
                                    <div class="text-xs text-slate-500">Producto Terminado</div>
                                </div>
                            </div>
                        </div>
                        <div class="text-sm text-slate-500">
                            <p>✅ El informe completo incluirá todas las secciones del sistema.</p>
                            <p class="mt-1">📄 Total de registros: ${resultado.secciones.reduce((acc, sec) => acc + sec.datos.length, 0)}</p>
                        </div>
                    </div>
                `;
                preview.innerHTML = html;
                $('informe-registros').textContent = `${resultado.secciones.reduce((acc, sec) => acc + sec.datos.length, 0)} registros totales`;
                return;
            }
            
            if (resultado.datos.length === 0) {
                preview.innerHTML = `
                    <div class="text-center text-slate-400 py-12">
                        <span class="text-4xl block mb-4">📭</span>
                        <p>No hay registros disponibles para este informe</p>
                        <p class="text-sm mt-2">Intenta con otro tipo de informe o ajusta las fechas</p>
                    </div>
                `;
                $('informe-registros').textContent = '0 registros';
                return;
            }
            
            let html = `<div class="overflow-x-auto"><table class="w-full text-sm"><thead class="bg-slate-100">`;
            html += `<tr>${resultado.columnas.map(col => `<th class="p-2 text-left font-bold text-slate-600">${col}</th>`).join('')}</tr>`;
            html += `</thead><tbody>`;
            
            const items = resultado.datos.slice(0, 50);
            items.forEach(item => {
                let row = '';
                switch(resultado.tipo) {
                    case 'proveedores':
                        row = `<td class="p-2 font-semibold">${item.nombre}</td><td class="p-2">${item.producto || '-'}</td><td class="p-2">${item.contacto || '-'}</td>`;
                        break;
                    case 'bodega':
                        row = `<td class="p-2 font-semibold">${item.nombre}</td><td class="p-2">${item.proveedores?.nombre || 'N/A'}</td><td class="p-2 font-bold">${item.cantidad}</td><td class="p-2">${item.unidad || 'L'}</td>`;
                        break;
                    case 'lotes':
                        const estadoColors = {
                            'Fermentación': 'text-amber-600',
                            'Destilación': 'text-blue-600',
                            'Añejamiento': 'text-purple-600',
                            'Filtración': 'text-teal-600',
                            'Embotellado y Etiquetado': 'text-indigo-600',
                            'Finalizado': 'text-emerald-600'
                        };
                        row = `<td class="p-2 font-mono text-xs">${item.id?.slice(0, 6) || 'N/A'}</td><td class="p-2">${item.materia_prima?.nombre || 'N/A'}</td><td class="p-2">${item.cantidad_usada || item.cantidad || 0} L</td><td class="p-2 font-bold ${estadoColors[item.estado] || ''}">${item.estado || 'N/A'}</td><td class="p-2 text-xs">${new Date(item.created_at).toLocaleDateString()}</td>`;
                        break;
                    case 'calidad':
                        row = `<td class="p-2 font-mono text-xs">LT-${item.lote_id?.slice(0, 6) || 'N/A'}</td><td class="p-2 font-bold">${item.abv}%</td><td class="p-2">${item.ph}</td><td class="p-2">${item.aprobado ? '✅ Aprobado' : '❌ Rechazado'}</td><td class="p-2 text-xs">${item.observaciones || '-'}</td>`;
                        break;
                    case 'inventario':
                        const botellas = Math.floor((item.cantidad_usada || item.cantidad || 0) * 0.8 * 1.333);
                        row = `<td class="p-2 font-mono text-xs">LT-${item.id?.slice(0, 6) || 'N/A'}</td><td class="p-2">${item.materia_prima?.nombre || 'N/A'}</td><td class="p-2 font-bold">${botellas}</td><td class="p-2">${botellas < 50 ? '⚠️ Alerta' : botellas < 150 ? '📦 Stock Medio' : '✅ Stock Óptimo'}</td>`;
                        break;
                }
                html += `<tr class="border-b border-slate-100 hover:bg-slate-50">${row}</tr>`;
            });
            
            html += `</tbody></table>`;
            if (resultado.datos.length > 50) {
                html += `<p class="text-xs text-slate-400 mt-2">Mostrando 50 de ${resultado.datos.length} registros</p>`;
            }
            html += `</div>`;
            
            preview.innerHTML = html;
            $('informe-registros').textContent = `${resultado.datos.length} registros`;
            
            mostrarToast('Vista previa cargada correctamente', 'success', 'Vista Previa');
            
        } catch (error) {
            console.error('Error en vista previa:', error);
            preview.innerHTML = `
                <div class="text-center text-rose-500 py-12">
                    <span class="text-4xl block mb-4">❌</span>
                    <p>Error al cargar la vista previa</p>
                    <p class="text-sm text-slate-400 mt-2">${error.message}</p>
                </div>
            `;
            mostrarToast('Error al cargar vista previa', 'error', '❌ Error');
        }
    }

    async generarPDF() {
        const tipo = $('informe-tipo').value;
        const fechaInicio = $('informe-fecha-inicio').value;
        const fechaFin = $('informe-fecha-fin').value;
        
        try {
            mostrarToast('Generando informe...', 'info', 'Procesando');
            
            const resultado = await this.obtenerDatos(tipo, fechaInicio, fechaFin);
            
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF('p', 'mm', 'a4');
            const pageWidth = doc.internal.pageSize.getWidth();
            
            // ========== ENCABEZADO ==========
            doc.setFillColor(16, 185, 129);
            doc.rect(0, 0, pageWidth, 25, 'F');
            
            doc.setTextColor(255, 255, 255);
            doc.setFontSize(18);
            doc.setFont('helvetica', 'bold');
            doc.text('Sistema de Gestion de Destilera', pageWidth / 2, 12, { align: 'center' });
            doc.setFontSize(10);
            doc.text('Informe de Gestión de Destilería', pageWidth / 2, 20, { align: 'center' });
            
            doc.setTextColor(50, 50, 50);
            doc.setFontSize(11);
            doc.text(`Fecha de generación: ${new Date().toLocaleString()}`, 14, 32);
            
            if (fechaInicio && fechaFin) {
                doc.text(`Período: ${fechaInicio} al ${fechaFin}`, 14, 38);
            }
            
            let yPos = 45;
            
            // ========== GENERAR CONTENIDO ==========
            if (resultado.tipo === 'completo') {
                resultado.secciones.forEach((seccion, index) => {
                    if (index > 0) {
                        doc.addPage();
                        yPos = 20;
                    }
                    
                    doc.setFontSize(14);
                    doc.setFont('helvetica', 'bold');
                    doc.setTextColor(16, 185, 129);
                    doc.text(`${seccion.nombre}`, 14, yPos);
                    yPos += 8;
                    
                    doc.setTextColor(50, 50, 50);
                    doc.setFontSize(10);
                    doc.text(`Total: ${seccion.datos.length} registros`, 14, yPos);
                    yPos += 5;
                    
                    if (seccion.datos.length === 0) {
                        doc.setTextColor(150, 150, 150);
                        doc.text('No hay registros disponibles', 14, yPos + 5);
                        yPos += 10;
                        return;
                    }
                    
                    let tableData = [];
                    let headers = [];
                    
                    switch(seccion.nombre) {
                        case 'Proveedores':
                            headers = ['Nombre', 'Producto', 'Contacto'];
                            tableData = seccion.datos.map(item => [item.nombre, item.producto || '-', item.contacto || '-']);
                            break;
                        case 'Materia Prima':
                            headers = ['Insumo', 'Proveedor', 'Cantidad', 'Unidad'];
                            tableData = seccion.datos.map(item => [item.nombre, item.proveedores?.nombre || 'N/A', `${item.cantidad}`, item.unidad || 'L']);
                            break;
                        case 'Lotes de Producción':
                            headers = ['ID', 'Insumo', 'Cantidad', 'Estado'];
                            tableData = seccion.datos.map(item => [item.id?.slice(0, 6) || 'N/A', item.materia_prima?.nombre || 'N/A', `${item.cantidad_usada || item.cantidad || 0} L`, item.estado || 'N/A']);
                            break;
                        case 'Control de Calidad':
                            headers = ['Lote', '% ABV', 'pH', 'Evaluación'];
                            tableData = seccion.datos.map(item => [item.lote_id?.slice(0, 6) || 'N/A', `${item.abv}%`, item.ph, item.aprobado ? 'Aprobado' : '❌ Rechazado']);
                            break;
                        case 'Inventario Final':
                            headers = ['Lote', 'Producto', 'Botellas', 'Estado'];
                            tableData = seccion.datos.map(item => {
                                const botellas = Math.floor((item.cantidad_usada || item.cantidad || 0) * 0.8 * 1.333);
                                const estado = botellas < 50 ? 'Alerta' : botellas < 150 ? ' Stock Medio' : 'Stock Óptimo';
                                return [item.id?.slice(0, 6) || 'N/A', item.materia_prima?.nombre || 'N/A', `${botellas}`, estado];
                            });
                            break;
                    }
                    
                    doc.autoTable({
                        head: [headers],
                        body: tableData,
                        startY: yPos + 5,
                        theme: 'striped',
                        headStyles: {
                            fillColor: [16, 185, 129],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            fontSize: 9
                        },
                        bodyStyles: {
                            fontSize: 8
                        },
                        columnStyles: {
                            0: { cellWidth: 30 },
                            1: { cellWidth: 40 },
                            2: { cellWidth: 30 },
                            3: { cellWidth: 30 }
                        },
                        margin: { left: 14, right: 14 }
                    });
                    
                    yPos = doc.lastAutoTable.finalY + 5;
                });
                
            } else {
                doc.setFontSize(14);
                doc.setFont('helvetica', 'bold');
                doc.setTextColor(16, 185, 129);
                doc.text(resultado.titulo, 14, yPos);
                yPos += 8;
                
                doc.setTextColor(50, 50, 50);
                doc.setFontSize(10);
                doc.text(`Total: ${resultado.datos.length} registros`, 14, yPos);
                yPos += 5;
                
                if (resultado.datos.length === 0) {
                    doc.setTextColor(150, 150, 150);
                    doc.text('No hay registros disponibles', 14, yPos + 5);
                } else {
                    let tableData = [];
                    
                    switch(tipo) {
                        case 'proveedores':
                            tableData = resultado.datos.map(item => [item.nombre, item.producto || '-', item.contacto || '-']);
                            break;
                        case 'bodega':
                            tableData = resultado.datos.map(item => [item.nombre, item.proveedores?.nombre || 'N/A', `${item.cantidad}`, item.unidad || 'L']);
                            break;
                        case 'lotes':
                            tableData = resultado.datos.map(item => [item.id?.slice(0, 6) || 'N/A', item.materia_prima?.nombre || 'N/A', `${item.cantidad_usada || item.cantidad || 0} L`, item.estado || 'N/A', new Date(item.created_at).toLocaleDateString()]);
                            break;
                        case 'calidad':
                            tableData = resultado.datos.map(item => [`LT-${item.lote_id?.slice(0, 6) || 'N/A'}`, `${item.abv}%`, item.ph, item.aprobado ? '✅ Aprobado' : '❌ Rechazado', item.observaciones || '-']);
                            break;
                        case 'inventario':
                            tableData = resultado.datos.map(item => {
                                const botellas = Math.floor((item.cantidad_usada || item.cantidad || 0) * 0.8 * 1.333);
                                const estado = botellas < 50 ? 'Alerta' : botellas < 150 ? ' Stock Medio' : ' Stock Óptimo';
                                return [item.id?.slice(0, 6) || 'N/A', item.materia_prima?.nombre || 'N/A', `${botellas}`, estado];
                            });
                            break;
                    }
                    
                    doc.autoTable({
                        head: [resultado.columnas],
                        body: tableData,
                        startY: yPos + 5,
                        theme: 'striped',
                        headStyles: {
                            fillColor: [16, 185, 129],
                            textColor: [255, 255, 255],
                            fontStyle: 'bold',
                            fontSize: 9
                        },
                        bodyStyles: {
                            fontSize: 8
                        },
                        margin: { left: 14, right: 14 }
                    });
                }
            }
            
            // ========== PIE DE PÁGINA ==========
            const totalPages = doc.internal.getNumberOfPages();
            for (let i = 1; i <= totalPages; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150, 150, 150);
                doc.text(`Página ${i} de ${totalPages}`, pageWidth - 20, doc.internal.pageSize.getHeight() - 5);
                doc.text('CENESTUR - Sistema de Gestión de Destilería', 14, doc.internal.pageSize.getHeight() - 5);
            }
            
            const nombreArchivo = `Informe_${tipo}_${new Date().toISOString().slice(0, 10)}.pdf`;
            doc.save(nombreArchivo);
            
            mostrarToast('Informe generado correctamente', 'success', '📄PDF Listo');
            
        } catch (error) {
            console.error('Error generando PDF:', error);
            mostrarToast('Error al generar informe: ' + error.message, 'error', '❌ Error');
        }
    }
}