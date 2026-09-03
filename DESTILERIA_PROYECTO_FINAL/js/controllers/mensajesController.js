import { $, mostrarToast } from '../utils/helpers.js';
import { supabase } from '../config.js';
import { mensajesService } from '../services/supabaseService.js';

export class MensajesController {
    constructor() {
        this.data = [];
        this.filtroActual = 'todos';
        this.onDataChange = null;
        this.usuarioRol = '';
        this.usuarioEmail = '';
        this.usuarioId = '';
        this.intervaloCarga = null;
        this.cargando = false;
        this.enviando = false;
        this.subscription = null;
    }

    init(onDataChange) {
        this.onDataChange = onDataChange;
        
        // 🔥 CORRECCIÓN: Resetear variables para evitar que se quede el rol anterior
        this.usuarioRol = '';
        this.usuarioEmail = '';
        this.usuarioId = '';
        
        this.obtenerUsuarioActual().then(() => {
            this.cargar();
            this.suscribirMensajes();
        });

        $('btn-filtrar-todos')?.addEventListener('click', () => this.filtrar('todos'));
        $('btn-filtrar-no-leidos')?.addEventListener('click', () => this.filtrar('no-leidos'));
        $('btn-filtrar-alertas')?.addEventListener('click', () => this.filtrar('alertas'));
        $('btn-filtrar-leidos')?.addEventListener('click', () => this.filtrar('leidos'));
        $('btn-marcar-todos-leidos')?.addEventListener('click', this.marcarTodosLeidos.bind(this));
        
        if (this.intervaloCarga) clearInterval(this.intervaloCarga);
        this.intervaloCarga = setInterval(() => {
            supabase.auth.getSession().then(({ data }) => {
                if (data.session) {
                    this.cargar();
                }
            });
        }, 30000);
    }

    async obtenerUsuarioActual() {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            this.usuarioId = session.user.id;
            this.usuarioEmail = session.user.email || '';
            
            const { data: userData, error } = await supabase
                .from('usuarios')
                .select('rol, email')
                .eq('id', session.user.id)
                .single();
            
            if (error) {
                console.error('❌ Error obteniendo rol de usuario:', error);
                return;
            }
            
            this.usuarioRol = userData?.rol || '';
            console.log(`📧 Usuario: ${this.usuarioEmail}, Rol: "${this.usuarioRol}"`);
        } else {
            console.warn('⚠️ No hay sesión activa');
        }
    }

    suscribirMensajes() {
        if (!this.usuarioRol) return;

        if (this.subscription) {
            this.subscription.unsubscribe();
        }

        this.subscription = supabase
            .channel('mensajes-canal')
            .on(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'mensajes',
                    filter: `destinatario_rol=eq.${this.usuarioRol}`
                },
                (payload) => {
                    console.log('📩 Nuevo mensaje recibido en tiempo real:', payload.new);
                    this.cargar();
                    mostrarToast(
                        `📨 Nuevo mensaje: ${payload.new.titulo}`,
                        'info',
                        'Nuevo mensaje'
                    );
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`✅ Suscrito a mensajes para rol ${this.usuarioRol}`);
                } else if (status === 'CHANNEL_ERROR') {
                    console.error('❌ Error en suscripción Realtime:', err);
                }
            });
    }

    async cargar() {
        if (this.cargando) return;
        this.cargando = true;

        try {
            if (!this.usuarioRol) {
                await this.obtenerUsuarioActual();
            }

            if (!this.usuarioRol) {
                console.warn('⚠️ No se pudo determinar el rol del usuario');
                this.cargando = false;
                return;
            }

            console.log(`📥 Cargando mensajes para rol: "${this.usuarioRol}"`);

            const { data, error } = await supabase
                .from('mensajes')
                .select('*')
                .eq('destinatario_rol', this.usuarioRol)
                .order('fecha_creacion', { ascending: false });
            
            if (error) throw error;
            
            console.log(`✅ ${data?.length || 0} mensajes cargados para rol "${this.usuarioRol}"`);
            if (data && data.length > 0) {
                console.log('📋 Primer mensaje:', data[0]);
            }
            
            this.data = data || [];
            this.renderizar();
            this.actualizarBadge();
            
            if (this.onDataChange) this.onDataChange(this.data);
        } catch (error) {
            console.error('❌ Error cargando mensajes:', error);
        } finally {
            this.cargando = false;
        }
    }

    renderizar() {
        const contenedor = $('contenedor-mensajes');
        if (!contenedor) return;

        let mensajesFiltrados = this.data;

        switch(this.filtroActual) {
            case 'no-leidos':
                mensajesFiltrados = this.data.filter(m => !m.leido);
                break;
            case 'leidos':
                mensajesFiltrados = this.data.filter(m => m.leido);
                break;
            case 'alertas':
                mensajesFiltrados = this.data.filter(m => m.tipo === 'alerta');
                break;
            default:
                break;
        }

        if (mensajesFiltrados.length === 0) {
            let mensajeVacio = 'No hay mensajes en esta bandeja';
            if (this.filtroActual === 'no-leidos') {
                mensajeVacio = '¡Todos los mensajes han sido leídos!';
            } else if (this.filtroActual === 'alertas') {
                mensajeVacio = '✅ No hay alertas pendientes';
            }
            contenedor.innerHTML = `
                <div class="text-center text-slate-400 py-12">
                    <span class="text-4xl block mb-4">📭</span>
                    <p>${mensajeVacio}</p>
                </div>
            `;
            $('total-mensajes').textContent = '0 mensajes';
            return;
        }

        contenedor.innerHTML = mensajesFiltrados.map(msg => `
            <div class="p-4 hover:bg-slate-50 transition ${!msg.leido ? 'bg-emerald-50 border-l-4 border-emerald-500' : ''}">
                <div class="flex justify-between items-start">
                    <div class="flex-1">
                        <div class="flex items-center gap-2 flex-wrap">
                            <span class="font-bold text-slate-800">${msg.titulo}</span>
                            ${!msg.leido ? '<span class="px-2 py-0.5 bg-emerald-500 text-white text-xs font-bold rounded-full">Nuevo</span>' : ''}
                            ${msg.tipo === 'alerta' ? '<span class="px-2 py-0.5 bg-rose-100 text-rose-700 text-xs font-bold rounded-full">⚠️ Alerta</span>' : ''}
                            ${msg.tipo === 'sistema' ? '<span class="px-2 py-0.5 bg-blue-100 text-blue-700 text-xs font-bold rounded-full">🔧 Sistema</span>' : ''}
                        </div>
                        <p class="text-sm text-slate-600 mt-1 whitespace-pre-line">${msg.mensaje}</p>
                        <div class="text-xs text-slate-400 mt-2 flex items-center gap-4 flex-wrap">
                            <span>De: ${msg.remitente_email || 'Sistema'}</span>
                            <span>${new Date(msg.fecha_creacion).toLocaleString()}</span>
                            ${msg.leido ? '<span class="text-emerald-600">✓ Leído</span>' : ''}
                            ${msg.leido_en ? `<span class="text-slate-400">Leído: ${new Date(msg.leido_en).toLocaleString()}</span>` : ''}
                        </div>
                    </div>
                    <div class="flex gap-2 ml-4 flex-shrink-0">
                        ${!msg.leido ? `<button onclick="window.marcarLeido('${msg.id}')" class="text-emerald-600 hover:text-emerald-800 text-sm font-bold bg-emerald-50 px-3 py-1 rounded-lg hover:bg-emerald-100 transition">Marcar leído</button>` : ''}
                        <button onclick="window.eliminarMensaje('${msg.id}')" class="text-red-400 hover:text-red-600 text-sm bg-red-50 px-3 py-1 rounded-lg hover:bg-red-100 transition">✕</button>
                    </div>
                </div>
            </div>
        `).join('');

        $('total-mensajes').textContent = `${mensajesFiltrados.length} mensajes`;

        window.marcarLeido = this.marcarLeido.bind(this);
        window.eliminarMensaje = this.eliminarMensaje.bind(this);
    }

    actualizarBadge() {
        const badge = $('badge-mensajes');
        if (!badge) return;
        
        const noLeidos = this.data.filter(m => !m.leido).length;
        if (noLeidos > 0) {
            badge.classList.remove('hidden');
            badge.textContent = noLeidos;
        } else {
            badge.classList.add('hidden');
        }
    }

    filtrar(tipo) {
        this.filtroActual = tipo;
        
        document.querySelectorAll('[id^="btn-filtrar-"]').forEach(btn => {
            btn.classList.remove('bg-emerald-600', 'text-white');
            btn.classList.add('bg-slate-200', 'text-slate-700');
        });
        
        const btnMap = {
            'todos': 'btn-filtrar-todos',
            'no-leidos': 'btn-filtrar-no-leidos',
            'alertas': 'btn-filtrar-alertas',
            'leidos': 'btn-filtrar-leidos'
        };
        
        const btnActivo = $(btnMap[tipo]);
        if (btnActivo) {
            btnActivo.classList.remove('bg-slate-200', 'text-slate-700');
            btnActivo.classList.add('bg-emerald-600', 'text-white');
        }
        
        this.renderizar();
    }

    async marcarLeido(id) {
        try {
            await mensajesService.updateField(id, 'leido', true);
            await mensajesService.updateField(id, 'leido_en', new Date().toISOString());
            await this.cargar();
            mostrarToast('Mensaje marcado como leído', 'success', '✓ Leído');
        } catch (error) {
            console.error('Error al marcar como leído:', error);
            mostrarToast('Error al marcar como leído', 'error', '❌ Error');
        }
    }

    async marcarTodosLeidos() {
        const noLeidos = this.data.filter(m => !m.leido);
        if (noLeidos.length === 0) {
            mostrarToast('No hay mensajes sin leer', 'info', 'ℹ️ Información');
            return;
        }

        try {
            for (const msg of noLeidos) {
                await mensajesService.updateField(msg.id, 'leido', true);
                await mensajesService.updateField(msg.id, 'leido_en', new Date().toISOString());
            }
            await this.cargar();
            mostrarToast(`Se marcaron ${noLeidos.length} mensajes como leídos`, 'success', '✓ Completado');
        } catch (error) {
            console.error('Error al marcar mensajes:', error);
            mostrarToast('Error al marcar mensajes', 'error', '❌ Error');
        }
    }

    async eliminarMensaje(id) {
        try {
            await mensajesService.delete(id);
            await this.cargar();
            mostrarToast('Mensaje eliminado', 'success', '🗑️ Eliminado');
        } catch (error) {
            console.error('Error al eliminar mensaje:', error);
            mostrarToast('Error al eliminar mensaje', 'error', '❌ Error');
        }
    }

    async enviarAlerta(titulo, mensaje, remitenteEmail) {
        if (this.enviando) {
            console.warn('⚠️ Ya hay un envío en curso, se ignora esta llamada.');
            mostrarToast('Ya se está procesando una alerta, espera un momento.', 'warning');
            return false;
        }

        this.enviando = true;
        try {
            console.log(`📨 Enviando alerta: "${titulo}"`);
            console.log(`   Remitente: ${remitenteEmail || 'Sistema'}`);

            const { data: existente, error: errCheck } = await supabase
                .from('mensajes')
                .select('id')
                .eq('titulo', titulo)
                .eq('destinatario_rol', 'Jefe de Bodega')
                .gte('fecha_creacion', new Date(Date.now() - 10000).toISOString())
                .maybeSingle();

            if (errCheck) {
                console.error('❌ Error verificando duplicados:', errCheck);
            }

            if (existente) {
                console.warn('⚠️ Alerta duplicada detectada (enviada en los últimos 10 segundos). No se reenvía.');
                mostrarToast('Esta alerta ya fue enviada recientemente.', 'info');
                return false;
            }

            const { error: error1 } = await supabase
                .from('mensajes')
                .insert([{
                    titulo: titulo,
                    mensaje: mensaje,
                    tipo: 'alerta',
                    remitente_email: remitenteEmail || 'Sistema',
                    destinatario_rol: 'Jefe de Bodega',
                    leido: false,
                    fecha_creacion: new Date().toISOString()
                }]);

            if (error1) {
                console.error('❌ Error al insertar para Jefe de Bodega:', error1);
                throw new Error(`Error al guardar alerta: ${error1.message}`);
            }
            console.log('✅ Alerta guardada para Jefe de Bodega');

            if (this.usuarioRol === 'Jefe de Bodega' || this.usuarioRol === 'Administrador') {
                setTimeout(() => this.cargar(), 500);
            }

            return true;

        } catch (error) {
            console.error('❌ Error en enviarAlerta:', error);
            mostrarToast('Error al enviar alerta: ' + error.message, 'error', '❌ Error');
            return false;
        } finally {
            this.enviando = false;
        }
    }

    destroy() {
        if (this.intervaloCarga) {
            clearInterval(this.intervaloCarga);
            this.intervaloCarga = null;
        }
        if (this.subscription) {
            this.subscription.unsubscribe();
            this.subscription = null;
        }
    }
}