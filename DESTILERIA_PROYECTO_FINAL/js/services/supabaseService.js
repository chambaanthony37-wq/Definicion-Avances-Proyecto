import { supabase } from '../config.js';
import { mostrarAlerta } from '../utils/helpers.js';

// ==========================================
// SERVICIO BASE PARA CRUD
// ==========================================
export class CrudService {
    constructor(tabla) {
        this.tabla = tabla;
    }

    async getAll(select = '*', orderBy = 'created_at', ascending = false) {
        const { data, error } = await supabase
            .from(this.tabla)
            .select(select)
            .order(orderBy, { ascending });
        
        if (error) {
            console.error(`Error en ${this.tabla}:`, error);
            throw error;
        }
        return data || [];
    }

    async getWithRelations(relations = '') {
        const { data, error } = await supabase
            .from(this.tabla)
            .select(relations)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        return data || [];
    }

    async save(data, id = null) {
        let result;
        if (id) {
            result = await supabase
                .from(this.tabla)
                .update(data)
                .eq('id', id);
        } else {
            result = await supabase
                .from(this.tabla)
                .insert([data]);
        }
        
        if (result.error) throw result.error;
        return result.data?.[0] || result.data;
    }

    async delete(id) {
    const { error } = await supabase
        .from(this.tabla)
        .delete()
        .eq('id', id);   // ← Elimina solo el registro con ese ID
    
    if (error) throw error;
    return true;
}

    async findBy(field, value) {
        const { data, error } = await supabase
            .from(this.tabla)
            .select('*')
            .eq(field, value)
            .single();
        
        if (error) throw error;
        return data;
    }

    async updateField(id, field, value) {
        const { error } = await supabase
            .from(this.tabla)
            .update({ [field]: value })
            .eq('id', id);
        
        if (error) throw error;
        return true;
    }
}

// ==========================================
// SERVICIOS ESPECÍFICOS
// ==========================================
export const proveedorService = new CrudService('proveedores');
export const bodegaService = new CrudService('materia_prima');
export const lotesService = new CrudService('lotes');
export const calidadService = new CrudService('control_calidad');
export const alertasService = new CrudService('alertas_reorden');
export const usuarioService = new CrudService('usuarios');
export const mensajesService = new CrudService('mensajes');