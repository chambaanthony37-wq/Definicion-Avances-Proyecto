import { supabase } from '../config.js';
import { $, renderTabla, mostrarToast, confirmar } from '../utils/helpers.js';

export class UsuariosController {
    constructor() {
        this.data = [];
        this.usuarioActual = null;
        this.usuarioIdActual = null;
        this.usuarioEmailActual = null;
    }

    async init() {
        await this.obtenerUsuarioActual();
        this.setupFormulario();
        await this.cargar();
        this.setupModalEdicion();
    }

    async obtenerUsuarioActual() {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) return;

        this.usuarioIdActual = session.user.id;
        this.usuarioEmailActual = session.user.email;

        const { data: userData, error } = await supabase
            .from('usuarios')
            .select('rol, id')
            .eq('id', session.user.id)
            .maybeSingle();

        if (error) {
            console.error('Error al obtener usuario:', error);
            return;
        }

        if (!userData) {
            console.warn('⚠️ Usuario no encontrado en la tabla `usuarios`. Creando registro...');
            const { error: insertError } = await supabase
                .from('usuarios')
                .insert([{
                    id: session.user.id,
                    email: session.user.email,
                    rol: 'Administrador'
                }]);

            if (insertError) {
                console.error('❌ Error al crear registro de usuario:', insertError);
                mostrarToast('Error al sincronizar usuario. Contacte al administrador.', 'error');
                return;
            }

            const { data: newUserData } = await supabase
                .from('usuarios')
                .select('rol, id')
                .eq('id', session.user.id)
                .single();

            this.usuarioActual = newUserData || { rol: 'Administrador', id: session.user.id };
            mostrarToast('Usuario sincronizado correctamente con el sistema.', 'info');
        } else {
            this.usuarioActual = userData;
        }

        console.log('✅ Usuario actual (ID):', this.usuarioActual.id, 'Rol:', this.usuarioActual.rol);
    }

    setupFormulario() {
        const form = $('form-registro-usuario');
        if (form) {
            form.addEventListener('submit', this.registrar.bind(this));
        }
        window.eliminarUsuario = this.eliminar.bind(this);
        window.editarUsuario = this.abrirModalEdicion.bind(this);
    }

    setupModalEdicion() {
        const modal = document.getElementById('modal-editar-usuario');
        const cancelBtn = document.getElementById('modal-editar-cancel');
        const saveBtn = document.getElementById('modal-editar-guardar');

        cancelBtn?.addEventListener('click', () => this.cerrarModalEdicion());
        saveBtn?.addEventListener('click', this.guardarEdicion.bind(this));
        modal?.addEventListener('click', (e) => {
            if (e.target === modal) this.cerrarModalEdicion();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this.cerrarModalEdicion();
        });
    }

    // ============================================================
    //  ABRIR MODAL DE EDICIÓN (SOLO CONTRASEÑA EDITABLE)
    // ============================================================
    abrirModalEdicion(userId) {
        const user = this.data.find(u => u.id === userId);
        if (!user) {
            mostrarToast('Usuario no encontrado', 'error');
            return;
        }

        const modal = document.getElementById('modal-editar-usuario');
        // Guardamos el ID en un campo oculto para usarlo al guardar
        document.getElementById('edit-user-id').value = user.id;

        // Construir el contenido del modal: email y rol son solo texto,
        // solo el campo de contraseña es editable.
        modal.querySelector('.modal-message').innerHTML = `
            <form id="form-editar-usuario" class="space-y-4">
                <input type="hidden" id="edit-user-id" value="${user.id}">
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Correo Electrónico</label>
                    <div class="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 text-base text-slate-700 font-medium cursor-default">
                        ${user.email}
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Rol</label>
                    <div class="w-full bg-slate-100 border border-slate-300 rounded-xl p-3 text-base text-slate-700 font-medium cursor-default">
                        ${user.rol}
                    </div>
                </div>
                <div>
                    <label class="block text-xs font-semibold text-slate-600 mb-1">Nueva Contraseña (opcional)</label>
                    <input type="password" id="edit-password" 
                           class="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-base outline-none focus:ring-2 focus:ring-emerald-500" 
                           placeholder="Dejar en blanco para no cambiar">
                </div>
            </form>
        `;

        // Asegurar que el campo oculto mantenga el ID (por si acaso)
        document.getElementById('edit-user-id').value = user.id;

        modal.style.display = 'flex';
        void modal.offsetHeight;  // forzar reflow
        modal.classList.add('active');
    }

    cerrarModalEdicion() {
        const modal = document.getElementById('modal-editar-usuario');
        modal.classList.remove('active');
        setTimeout(() => {
            modal.style.display = 'none';
        }, 300);
    }

    // ============================================================
    //  GUARDAR EDICIÓN → SOLO ACTUALIZAR CONTRASEÑA
    // ============================================================
    async guardarEdicion() {
        const id = document.getElementById('edit-user-id').value;
        const newPassword = document.getElementById('edit-password').value;

        if (!id) {
            mostrarToast('ID de usuario no válido', 'error');
            return;
        }

        // Si no se proporciona contraseña, no hacemos nada
        if (!newPassword || newPassword.trim() === '') {
            mostrarToast('No se cambió la contraseña', 'info');
            this.cerrarModalEdicion();
            return;
        }

        if (newPassword.length < 6) {
            mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }

        try {
            // Actualizar únicamente la contraseña en auth.users
            const { error: authError } = await supabase.auth.updateUser({
                password: newPassword
            });

            if (authError) throw authError;

            mostrarToast('Contraseña actualizada correctamente', 'success', '✅ Actualizado');
            this.cerrarModalEdicion();
            // No es necesario recargar la tabla porque no cambian email ni rol
        } catch (error) {
            console.error('Error al actualizar contraseña:', error);
            mostrarToast('Error al actualizar contraseña: ' + error.message, 'error');
        }
    }

    // ============================================================
    //  RESTO DE MÉTODOS (SIN CAMBIOS)
    // ============================================================
    async cargar() {
        try {
            console.log('🔄 Cargando lista de usuarios...');
            const { data, error } = await supabase
                .from('usuarios')
                .select('id, email, rol')
                .order('email', { ascending: true });
            if (error) throw error;
            this.data = data || [];
            console.log(`✅ ${this.data.length} usuarios cargados.`);
            this.renderizar();
        } catch (error) {
            console.error('❌ Error cargando usuarios:', error);
            mostrarToast('Error al cargar usuarios: ' + error.message, 'error');
        }
    }

    renderizar() {
        const tbody = $('tbl-usuarios');
        if (!tbody) {
            console.error('❌ No se encontró el tbody con id "tbl-usuarios"');
            return;
        }

        if (this.data.length === 0) {
            tbody.innerHTML = `<tr><td colspan="4" class="p-4 text-center text-slate-500">No hay usuarios registrados</td></tr>`;
            return;
        }

        tbody.innerHTML = this.data.map(user => {
            const isOwn = user.id === this.usuarioActual?.id;
            return `
            <tr class="hover:bg-slate-50 border-b border-slate-100">
                <td class="p-4 font-semibold text-slate-800">${user.email}</td>
                <td class="p-4">
                    <span class="px-2 py-1 rounded text-xs font-bold bg-blue-100 text-blue-700">${user.rol}</span>
                </td>
                <td class="p-4 text-sm">N/A</td>
                <td class="p-4 space-x-2">
                    <button onclick="window.editarUsuario('${user.id}')" 
                            class="bg-amber-100 text-amber-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-amber-200 transition">
                        ✏️ Editar
                    </button>
                    ${isOwn 
                        ? '<span class="text-xs text-slate-400 font-semibold ml-2">(Tú)</span>' 
                        : `<button onclick="window.eliminarUsuario('${user.id}')" 
                            class="bg-red-100 text-red-700 px-3 py-1 rounded-lg text-xs font-bold hover:bg-red-200 transition">
                            ❌ Eliminar
                        </button>`
                    }
                </td>
            </tr>
        `}).join('');
    }

    async registrar(e) {
        e.preventDefault();

        if (!this.usuarioActual) {
            await this.obtenerUsuarioActual();
        }

        const rolActual = this.usuarioActual?.rol?.toLowerCase().trim();
        if (rolActual !== 'administrador') {
            console.warn('⛔ Usuario sin permisos de administrador. Rol detectado:', rolActual);
            mostrarToast('No tienes permisos para registrar usuarios.', 'error', '⛔ Sin permisos');
            return;
        }

        const email = $('reg-email').value.trim();
        const password = $('reg-password').value;
        const rol = $('reg-rol').value;

        if (!email || !password || !rol) {
            mostrarToast('Completa todos los campos', 'warning');
            return;
        }

        if (password.length < 6) {
            mostrarToast('La contraseña debe tener al menos 6 caracteres', 'warning');
            return;
        }

        // Validación de rol único
        const existing = this.data.find(u => u.rol === rol);
        if (existing) {
            mostrarToast(`Ya existe un usuario con el rol "${rol}". No se puede crear otro.`, 'error');
            return;
        }

        try {
            const { data: authData, error: authError } = await supabase.auth.signUp({
                email,
                password
            });

            if (authError) throw authError;

            if (authData.user) {
                const { error: dbError } = await supabase
                    .from('usuarios')
                    .insert([{
                        id: authData.user.id,
                        email: email,
                        rol: rol
                    }]);

                if (dbError) throw dbError;

                mostrarToast(`Usuario ${email} registrado con rol ${rol}`, 'success', '✅ Registrado');
                this.form.reset();
                await this.cargar(); // Recargar la tabla
            }
        } catch (error) {
            console.error('Error en registro:', error);
            mostrarToast('Error al registrar: ' + error.message, 'error');
        }
    }

    async eliminar(id) {
        console.log('🗑️ Intentando eliminar usuario con ID:', id);

        // Verificar permisos
        if (!this.usuarioActual || this.usuarioActual.rol?.toLowerCase() !== 'administrador') {
            mostrarToast('No tienes permisos para eliminar usuarios.', 'error', '⛔ Sin permisos');
            return;
        }

        if (id === this.usuarioActual.id) {
            mostrarToast('No puedes eliminar tu propia cuenta.', 'warning', '⚠️ Operación no permitida');
            return;
        }

        const confirmed = await confirmar(
            '¿Estás seguro de eliminar este usuario?',
            'Eliminar Usuario',
            'danger'
        );
        if (!confirmed) return;

        try {
            const { error: dbError } = await supabase
                .from('usuarios')
                .delete()
                .eq('id', id);
            if (dbError) throw dbError;

            mostrarToast('Usuario eliminado correctamente', 'success', '🗑️ Eliminado');
            await this.cargar();
        } catch (error) {
            console.error('❌ Error eliminando usuario:', error);
            mostrarToast('Error al eliminar: ' + error.message, 'error');
        }
    }

    get form() {
        return $('form-registro-usuario');
    }
}